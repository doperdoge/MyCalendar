import { TIMEZONE } from "./dates";
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
export async function getExistingEvents(
  token: string,
  sections: any[],
): Promise<Map<string, GCalendarEvent[]>> {
  //Get a list of the classes from MyScheduler for the promise list
  let class_list: string[] = [];
  for (let i = 0; i < sections.length; i++) {
    class_list.push(`${sections[i].subjectId} ${sections[i].course}`);
  }

  // figure out what classes the user currently has on their gcalendar
  let class_query_promises: Promise<any>[] = [];
  for (let i = 0; i < class_list.length; i++) {
    let req = fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent(
        class_list[i],
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
      },
    ).then((user_events_response) => user_events_response.json());
    class_query_promises.push(req);
  }
  let class_query_results = await Promise.all(class_query_promises);

  // array of events with the same name
  // this is because some classes have different meetings
  // ie one is on tuesday and is hybrid and one is on thursday and is in person
  // since events can't have different descriptions, we have to just
  // create multiple events. Hence why we also check here
  let user_event_map = new Map<string, any[]>();
  //maps all user_events for fast lookup later on
  for (let i = 0; i < class_query_results.length; i++) {
    for (let event of class_query_results[i].items) {
      if (!user_event_map.has(event.summary)) {
        user_event_map.set(event.summary, []);
      }
      let events = user_event_map.get(event.summary);
      if (events !== undefined) {
        // to stop ts compiler from complaining
        events.push(event);
      }
    }
  }

  console.log(user_event_map);
  return user_event_map;
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
export async function createEvent(
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
        recurrence: [rrule],
        location,
        summary,
      }),
    },
  ).then((res) => res.json());
}
