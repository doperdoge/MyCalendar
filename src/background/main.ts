import { SyncState } from "@/types/types";
import { authenticate } from "./authenticate";

const FETCH_TIMEOUT_MS = 8_000; // 8 seconds
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
 * @param {string} dateTimeString
 * @returns {string}
 */
function extractDate(dateTimeString: string) {
  return dateTimeString.split("T")[0];
}

function wrappedReply(reply: any, SyncState: SyncState) {
  reply(SyncState);
  chrome.storage.local.set({ SyncState });
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
    "https://sjsu.collegescheduler.com/api/term-data/Fall%202025",
    {
      method: "GET",
      credentials: "include",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    }
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
            "https://sjsu.collegescheduler.com/api/term-data/Fall%202025",
            {
              method: "GET",
              credentials: "include",
              signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            }
          )
            .then((res) => res.json())
            .catch((err) => {
              console.log("failed to get page with error ", err);
            });
          if (result !== undefined) {
            if (a.id !== undefined) {
              await chrome.tabs.remove(a.id);
            }
            chrome.storage.local.set<{ SyncState: SyncState }>({
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
                chrome.storage.local.set({ SyncState });
              }
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
  onComplete: (SyncState: SyncState) => void
) {
  // get current sections
  let sections = result.cartSections;

  // we want to get subjectId, course,
  // meetings[0].buildingCode, meetings[0].startTime, meetings[0].endTime
  // startTime and endTime are military time, but decimal, ie 1:45 PM is 1345
  console.log(token);

  //Get a list of the classes from MyScheduler for the promise list
  let class_list: string[] = [];
  for (let i = 0; i < sections.length; i++) {
    class_list.push(`${sections[i].subjectId} ${sections[i].course}`);
  }

  let class_query_list: Promise<any>[] = [];
  for (let i = 0; i < class_list.length; i++) {
    let user_events_response = fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent(
        class_list[i]
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
      }
    ).then((user_events_response) => user_events_response.json());
    class_query_list.push(user_events_response);
  }

  let promised_user_list = await Promise.all(class_query_list);

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
      let processedStartDateTime =
        extractDate(startDateTime) + "T" + processedStartTime + ":00-07:00";
      let processedEndDateTime =
        extractDate(startDateTime) + "T" + processedEndTime + ":00-07:00";
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
          }`
        );
        console.log(
          `summary: ${summary}, ${potentialMatch.summary} | ${
            summary == potentialMatch.summary
          }`
        );
        console.log(
          `start: ${curr_start}, ${potentialMatch.start.dateTime} | ${
            curr_start == potentialMatch.start.dateTime
          }`
        );
        console.log(
          `end: ${curr_end}, ${potentialMatch.end.dateTime} | ${
            curr_end == potentialMatch.end.dateTime
          }`
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
              ", detected. Event was not created"
          );
        }
      }

      // create event
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
          }
        ).then((res) => res.json());

        console.log(
          "for response for ",
          sections[i].subjectId,
          sections[i].course,
          "have"
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
    request:
      | { requestType: "wait" }
      | { requestType: "request"; token: string }
      | { requestType: "authenticate"; interactive: boolean },
    _, // sender
    reply
  ) => {
    if (request.requestType === "wait") {
      waitHandler(reply);
    } else if (request.requestType === "request") {
      requestHandler(request.token, reply);
    } else {
      // authenticate
      authenticate(request.interactive, reply);
    }
    return true;
  }
);
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.storage.local.set<{ SyncState: SyncState }>({
      SyncState: undefined,
    });
  }
  // chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
