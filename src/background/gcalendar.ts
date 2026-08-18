import { logger } from "@/shared/logger";
import { TIMEZONE } from "./dates";
import { ToCreateEvent } from "./types";
import { exdatesCSV } from "./holidays";
// abbreviated version of the event resource
// full schema available at
// https://developers.google.com/workspace/calendar/api/v3/reference/events#resource
type GCalendarEvent = {
  summary: string;
  location: string;
  start: {
    dateTime: string;
  };
  end: {
    dateTime: string;
  };
};

/**
 * Retrieves all gcalendar events that have a name that matches one of the classes the user is currently enrolled in
 * and returns them as a map of
 * @param token auth token to use for requests to google calendar apis
 * @param sections an array of the sections the user is currently enrolled in
 * @returns
 */
async function getExistingEvents(
  token: string,
  courseNames: string[],
): Promise<Map<string, GCalendarEvent[]>> {
  // figure out what classes the user currently has on their gcalendar
  let classQueries: Promise<any>[] = [];
  for (let i = 0; i < courseNames.length; i++) {
    let req = fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent(
        courseNames[i],
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
      },
    ).then((user_events_response) => user_events_response.json());
    classQueries.push(req);
  }
  let existingClasses = await Promise.all(classQueries);

  // array of events with the same name
  // this is because some classes have different meetings
  // ie one is on tuesday and is hybrid and one is on thursday and is in person
  // since events can't have different descriptions, we have to just
  // create multiple events. Hence why we also check here
  let userEventMap = new Map<string, any[]>();
  //maps all user_events for fast lookup later on
  for (let i = 0; i < existingClasses.length; i++) {
    for (let event of existingClasses[i].items) {
      if (!userEventMap.has(event.summary)) {
        userEventMap.set(event.summary, []);
      }
      let events = userEventMap.get(event.summary);
      if (events !== undefined) {
        // to stop ts compiler from complaining
        events.push(event);
      }
    }
  }

  logger.log(userEventMap);
  return userEventMap;
}

/**
 *
 * @param token auth token to use for requests to google calendar apis
 * @param summary event summary; generally the class name
 * @param rrule recurrence rule
 * @param location where the event takes place
 * @param startDateTime string of the form YYYY-MM-DDTHH:MM:SS(timezone) representing
 *  the date and time of the start of the FIRST meeting
 * @param endDateTime string of the form YYYY-MM-DDTHH:MM:SS(timezone) representing
 *  the date and time of the end of the FIRST meeting
 * @returns the result of the POST request
 */
async function createEvent(
  token: string,
  summary: string,
  rrule: string,
  location: string,
  startDateTime: string,
  endDateTime: string,
) {
  // https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
  // we want to make a post request since we're creating an event
  return await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        start: {
          dateTime: startDateTime,
          timeZone: TIMEZONE,
        },
        end: {
          dateTime: endDateTime,
          timeZone: TIMEZONE,
        },
        recurrence: [rrule,,,exdatesCSV(startDateTime)],
        location,
        summary,
      }),
    },
  ).then((res) => res.json());
}

export async function exportToGCalendar(
  token: string,
  events: ToCreateEvent[],
) {
  let toExport = [];
  let existingEvents = await getExistingEvents(
    token,
    events.map((e) => e.summary),
  );
  logger.log("existing events: ", existingEvents);
  logger.log("events: ", events);

  // first, filter the events to avoid duplicating events on our google calendar
  for (let event of events) {
    // check all the user's events that share the same name
    let exists = false;
    for (let potentialMatch of existingEvents.get(event.summary) || []) {
      // potentially a duplicate
      logger.log("potential duplicate");
      logger.log(
        `location: ${location}, ${potentialMatch.location} | ${
          event.location == potentialMatch.location
        }`,
      );
      logger.log(
        `summary: ${event.summary}, ${potentialMatch.summary} | ${
          event.summary == potentialMatch.summary
        }`,
      );
      logger.log(
        `start: ${event.startDateTime}, ${potentialMatch.start.dateTime} | ${
          event.startDateTime == potentialMatch.start.dateTime
        }`,
      );
      logger.log(
        `end: ${event.endDateTime}, ${potentialMatch.end.dateTime} | ${
          event.endDateTime == potentialMatch.end.dateTime
        }`,
      );

      if (
        potentialMatch.start.dateTime == event.startDateTime &&
        potentialMatch.end.dateTime == event.endDateTime &&
        potentialMatch.location == event.location
      ) {
        logger.log("Duplicate for event " + event.summary + ", detected");
        exists = true;
      }
    }

    if (!exists) {
      toExport.push(event);
    }
  }

  // then export them
  let fetches = toExport.map((e) =>
    createEvent(
      token,
      e.summary,
      e.rrule,
      e.location,
      e.startDateTime,
      e.endDateTime,
    ),
  );
  let results = await Promise.all(fetches);
  logger.log("results: ", results);
}
function convertToICSDate(arg0: any): any {
  throw new Error("Function not implemented.");
}

