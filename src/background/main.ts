import { setSyncState } from "@/shared";
import { RequestType, SyncState } from "@/shared/types";
import { authenticate } from "./authenticate";

const TIMEZONE = "America/Los_Angeles";
const FETCH_TIMEOUT_MS = 8_000; // 8 seconds
// global variable; it's ok since this runs on a person's computer
// and different instances of the extension will havve different
// background workers, each w/ their own processingFunction
let processingFunction: Promise<void> | undefined = undefined;

/**
 * Formats a decimal time to a string of the form [H]H:MM
 * For example, 1345 -> 13:45 and 915 -> 9:15
 * @param {number} time
 * @returns {string}
 */
function processDecimalTime(time: number) {
  let hours = Math.floor(time / 100);
  let minutes = time % 100;

  // pad with zeros, if necessary
  let hoursString = `${hours}`.padStart(2, "0");
  let minutesString = `${minutes}`.padStart(2, "0");
  return `${hoursString}:${minutesString}`;
}
/**
 * Extracts the date from a date time string
 * @param {string} dateTimeString - a string of the form YYYY-MM-DDTHH:MM:SS
 *  representing the date of the event. Time is ignored.
 * @returns {string}
 */
function extractDate(dateTimeString: string) {
  // the API returns responses with a date and time for dateTimeString
  // but the time part isn't used (is always 00:00:00)
  // so we just take the date part
  return dateTimeString.split("T")[0];
}
/**
 * Gets the America/Los_Angeles isoformated date string
 * @param {string} dateTimeString - a string of the form YYYY-MM-DDTHH:MM:SS
 *  representing the date of the event. Time is ignored.
 * @param {string} time - a string of the form HH:MM
 * @returns {string}
 */
function processDate(dateTimeString: string, time: string) {
  // concatenate the extracted date w/ the provided time (and add 0 seconds)
  let concatenatedDate = extractDate(dateTimeString) + "T" + time + ":00";
  // we need the current offset of America/Los_Angeles
  // so we will just figure out manually since it seems like there's no builtin solution
  let now = Date.now();
  now -= now % 1000; // remove ms
  // CA (canada) because they use YYYY-MM-DD
  // nowLA is the timestamp of "YYYY-MM-DDTHH:MM:SS" in LA
  let nowLA = Date.parse(
    new Date(now)
      .toLocaleString("en-CA", {
        timeZone: TIMEZONE,
        hour12: false, // use 24 hour time
      })
      .replace(", ", "T") + "Z", // pretend this was UTC
  );
  let offsetHours = (now - nowLA) / 1000 / 60 / 60;
  return concatenatedDate + `-0${offsetHours}:00`;
}

function wrappedReply(reply: any, SyncState: SyncState) {
  reply(SyncState);
  setSyncState({ SyncState });
}

// token should be non-null
/**
 * This function is called when the user presses the "Sync" button
 * It is meant to get the user's current schedule and send it to the
 * addCourses function. If the user isn't currently logged in, it
 * will tell the frontend that it needs to open the login page
 * and will wait for the user to log in for up to 2 minutes
 *
 * @param token the google auth token to edit the user's google calendar
 * @param reply the reply function
 * @returns
 */
async function requestHandler(token: string, reply: any) {
  console.log("got chrome auth token ", token);

  // make a fetch to get course scheduler
  let result = null;
  result = await fetch(
    "https://sjsu.collegescheduler.com/api/term-data/Spring%202026",
    {
      method: "GET",
      credentials: "include",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    },
  )
    .then((res) => res.json())
    .catch((err) => {
      console.log("failed to get page with error ", err);
      console.log("going to be nice and try to open a tab");
      setTimeout(async () => {
        let a = await chrome.tabs.create({
          url: "https://sjsu.collegescheduler.com/entry",
        });
        console.log("got tab id", a.id);
        let startTime = Date.now();
        // wait up to 2 minutes for necessary fetch to succeed
        while (Date.now() - startTime < 120_000) {
          result = await fetch(
            "https://sjsu.collegescheduler.com/api/term-data/Spring%202026",
            {
              method: "GET",
              credentials: "include",
              signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            },
          )
            .then((res) => res.json())
            .catch((err) => {
              console.log("failed to get page with error ", err);
            });
          if (result !== undefined) {
            if (a.id !== undefined) {
              await chrome.tabs.remove(a.id);
            }
            setSyncState({
              SyncState: {
                message: "successfully obtained cookie",
                timestamp: Date.now(),
              },
            });
            await chrome.action.openPopup();
            processingFunction = addCourses(
              token,
              result,
              (SyncState: SyncState) => {
                setSyncState({ SyncState });
              },
            );
            return;
          } else {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }, 2000);
      wrappedReply(reply, {
        message: "attempting to obtain cookie",
        timestamp: Date.now(),
      });
    });
  console.log("result is ", result);
  if (result === undefined) {
    // failed to get page
    return;
  }
  await addCourses(token, result, (SyncState: SyncState) => {
    wrappedReply(reply, SyncState);
  });
}
/**
 * Waits for the processing function to finish
 * and alerts the frontend once it does
 * @param reply the reply function
 */
async function waitHandler(reply: any) {
  if (processingFunction !== undefined) {
    console.log("already processing");
    console.log(processingFunction);
    await processingFunction;
  }

  wrappedReply(reply, {
    message: "successfully synced",
    timestamp: Date.now(),
  });
}
async function addCourses(
  token: string,
  result: any,
  onComplete: (SyncState: SyncState) => void,
) {
  // get current sections
  // TODO - add switch to allow user to choose which sections to add
  // currentSections = currently enrolled in
  // cartSections = currently in cart
  let sections = result.currentSections;

  // we want to get subjectId, course,
  // meetings[0].buildingCode, meetings[0].startTime, meetings[0].endTime
  // startTime and endTime are military time, but decimal, ie 1:45 PM is 1345
  console.log(token);
  console.log(sections);

  //Get a list of the classes from MyScheduler for the promise list
  let class_list: string[] = [];
  for (let i = 0; i < sections.length; i++) {
    class_list.push(`${sections[i].subjectId} ${sections[i].course}`);
  }
  console.log("class_list: ", class_list);
  console.log("token: ", token);

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
  console.log("class_query_list: ", class_query_promises);

  let promised_user_list = await Promise.all(class_query_promises);
  console.log("promised_user_list: ", promised_user_list);

  // array of events with the same name
  // this is because some classes have different meetings
  // ie one is on tuesday and is hybrid and one is on thursday and is in person
  // since events can't have different descriptions, we have to just
  // create multiple events. Hence why we also check here
  let user_event_map = new Map<string, any[]>();
  //maps all user_events for fast lookup later on
  for (let i = 0; i < promised_user_list.length; i++) {
    for (let event of promised_user_list[i].items) {
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

  // now add classes to the user's gcalendar
  for (let i = 0; i < sections.length; i++) {
    for (let meeting of sections[i].meetings) {
      // handle times
      let processedStartTime = processDecimalTime(meeting.startTime);
      let processedEndTime = processDecimalTime(meeting.endTime);

      console.log(processedStartTime, processedEndTime);
      let startDateTime = meeting.startDate; // string
      let endDateTime = meeting.endDate; // string
      console.log(startDateTime, endDateTime);
      // replace the time with the actual time
      // should be the start/end date time of the FIRST meeting
      let processedStartDateTime = processDate(
        startDateTime,
        processedStartTime,
      );
      // startDate bc we give start/end according to the first meeting
      let processedEndDateTime = processDate(startDateTime, processedEndTime);
      console.log(processedStartDateTime, processedEndDateTime);

      // handle days of week
      // using meetings[0].daysRaw (gives a string of M,T,W,R,F)
      // and we want to put those days in the correct format expected by google calendar
      let byDay = [];
      for (let j = 0; j < meeting.daysRaw.length; j++) {
        if (meeting.daysRaw[j] === "M") {
          byDay.push("MO");
        } else if (meeting.daysRaw[j] === "T") {
          byDay.push("TU");
        } else if (meeting.daysRaw[j] === "W") {
          byDay.push("WE");
        } else if (meeting.daysRaw[j] === "R") {
          byDay.push("TH");
        } else if (meeting.daysRaw[j] === "F") {
          byDay.push("FR");
        }
      }
      let byDayString = byDay.join(",");
      console.log(byDayString);
      let until = extractDate(endDateTime).replaceAll("-", "");
      let rrule = `RRULE:FREQ=WEEKLY;BYDAY=${byDayString};UNTIL=${until};`;
      console.log(rrule);

      //if statement that checks if the class already exists for the student
      //if the class exists then skip the creation
      let location = `${meeting.buildingCode} ${meeting.room}`;
      let summary = `${sections[i].subjectId} ${sections[i].course}`;
      let curr_start = processedStartDateTime;
      let curr_end = processedEndDateTime;

      // check whether the event already exists
      let exists = false;
      for (let potentialMatch of user_event_map.get(summary) || []) {
        // potentially a duplicate
        console.log("potential duplicate");
        console.log(
          `location: ${location}, ${potentialMatch.location} | ${
            location == potentialMatch.location
          }`,
        );
        console.log(
          `summary: ${summary}, ${potentialMatch.summary} | ${
            summary == potentialMatch.summary
          }`,
        );
        console.log(
          `start: ${curr_start}, ${potentialMatch.start.dateTime} | ${
            curr_start == potentialMatch.start.dateTime
          }`,
        );
        console.log(
          `end: ${curr_end}, ${potentialMatch.end.dateTime} | ${
            curr_end == potentialMatch.end.dateTime
          }`,
        );

        if (
          potentialMatch.start.dateTime == curr_start &&
          potentialMatch.end.dateTime == curr_end &&
          potentialMatch.location == location
        ) {
          exists = true;
          console.log(
            "Duplicate for event " +
              summary +
              ", detected. Event was not created",
          );
        }
      }

      // actually create the event
      if (!exists) {
        // use google calendar api
        // https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
        // we want to make a post request
        console.log("Creating event");
        let fetch_result = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              Authorization: "Bearer " + token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              start: {
                dateTime: processedStartDateTime,
                timeZone: "America/Los_Angeles",
              },
              end: {
                dateTime: processedEndDateTime,
                timeZone: "America/Los_Angeles",
              },
              recurrence: [rrule],
              location,
              summary,
            }),
          },
        ).then((res) => res.json());

        console.log(
          "for response for ",
          sections[i].subjectId,
          sections[i].course,
          "have",
        );
        console.log(fetch_result);
      }
    }
  }
  onComplete({
    message: "successfully synced",
    timestamp: Date.now(),
  });
}

// set up listeners
chrome.runtime.onMessage.addListener(
  (
    request: RequestType,
    _, // sender
    reply,
  ) => {
    if (request.requestType === "wait") {
      waitHandler(reply);
    } else if (request.requestType === "request") {
      requestHandler(request.token, reply);
    } else {
      // authenticate
      // @ts-ignore
      authenticate(request.interactive, reply);
    }
    return true;
  },
);
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    setSyncState({ SyncState: undefined });
  }
});
