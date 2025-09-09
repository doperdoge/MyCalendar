import { SyncState } from "@/types/types";

const FETCH_TIMEOUT_MS = 8_000; // 8 seconds

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
async function handler(token: string, _: any, reply: any) {
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
            break;
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

  // get current sections
  let sections = result.currentSections;

  // we want to get subjectId, course,
  // meetings[0].buildingCode, meetings[0].startTime, meetings[0].endTime
  // startTime and endTime are military time, but decimal, ie 1:45 PM is 1345
  console.log(token);

  //Fetches the current list of events in the users calendar
  //uses that list to make a hashmap with the key being the class name
  //https://developers.google.com/workspace/calendar/api/v3/reference/events/list
  let user_events_response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
    }
  );

  //converts the raw event data into json
  let user_events_data = await user_events_response.json();
  //gets the list of events from the json
  let user_events = user_events_data.items;
  //map of users events
  let user_event_map = new Map<string, any>();
  //maps all user_events for fast lookup later on
  for (let event of user_events) {
    user_event_map.set(event.summary, event);
  }

  console.log(user_event_map);

  for (let i = 0; i < sections.length; i++) {
    // use google calendar api
    // https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
    // we want to make a post request

    // handle times
    let processedStartTime = processDecimalTime(
      sections[i].meetings[0].startTime
    );
    let processedEndTime = processDecimalTime(sections[i].meetings[0].endTime);

    console.log(processedStartTime, processedEndTime);
    let startDateTime = sections[i].meetings[0].startDate; // string
    let endDateTime = sections[i].meetings[0].endDate; // string
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
    for (let j = 0; j < sections[i].meetings[0].daysRaw.length; j++) {
      if (sections[i].meetings[0].daysRaw[j] === "M") {
        byDay.push("MO");
      } else if (sections[i].meetings[0].daysRaw[j] === "T") {
        byDay.push("TU");
      } else if (sections[i].meetings[0].daysRaw[j] === "W") {
        byDay.push("WE");
      } else if (sections[i].meetings[0].daysRaw[j] === "R") {
        byDay.push("TH");
      } else if (sections[i].meetings[0].daysRaw[j] === "F") {
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
    let curr_location = `${sections[i].meetings[0].buildingCode} ${sections[i].meetings[0].room}`;
    let curr_summary = `${sections[i].subjectId} ${sections[i].course}`;
    let curr_start = processedStartDateTime;
    let curr_end = processedEndDateTime;
    let curr_user_map = user_event_map.get(curr_summary);

    console.log(user_event_map.has(curr_summary));

    if (user_event_map.has(curr_summary)) {
      // potentially a duplicate
      console.log(
        `location: ${curr_location}, ${curr_user_map.location} | ${
          curr_location == curr_user_map.location
        }`
      );
      console.log(
        `summary: ${curr_summary}, ${curr_user_map.summary} | ${
          curr_summary == curr_user_map.summary
        }`
      );
      console.log(
        `start: ${curr_start}, ${curr_user_map.start.dateTime} | ${
          curr_start == curr_user_map.start.dateTime
        }`
      );
      console.log(
        `end: ${curr_end}, ${curr_user_map.end.dateTime} | ${
          curr_end == curr_user_map.end.dateTime
        }`
      );

      if (
        curr_user_map.start.dateTime == curr_start &&
        curr_user_map.end.dateTime == curr_end &&
        curr_user_map.location == curr_location
      ) {
        console.log(
          "Duplicate for event " +
            curr_summary +
            ", detected. Event was not created"
        );
      } else {
        // not a duplicate, so create event
        result = await fetch(
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
              location: `${sections[i].meetings[0].buildingCode} ${sections[i].meetings[0].room}`,
              summary: `${sections[i].subjectId} ${sections[i].course}`,
            }),
          }
        ).then((res) => res.json());
      }
    } else {
      result = await fetch(
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
            location: `${sections[i].meetings[0].buildingCode} ${sections[i].meetings[0].room}`,
            summary: `${sections[i].subjectId} ${sections[i].course}`,
          }),
        }
      ).then((res) => res.json());
    }

    console.log(
      "for response for ",
      sections[i].subjectId,
      sections[i].course,
      "have"
    );
    console.log(result);
  }
  wrappedReply(reply, {
    message: "successfully synced",
    timestamp: Date.now(),
  });
}

// set up listeners
chrome.runtime.onMessage.addListener((request, sender, reply) => {
  handler(request, sender, reply);
  return true;
});
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.storage.local.set<{ SyncState: SyncState }>({
      SyncState: undefined,
    });
  }
  // chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
