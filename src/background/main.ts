import { setSyncState } from "@/shared";
import { RequestType, SyncState } from "@/shared/types";
import { authenticate } from "./authenticate";
import { extractDate, processDate, processDecimalTime } from "./dates";
import { createEvent, getExistingEvents } from "./gcalendar";
import { convertToICS } from "./ics";

const FETCH_TIMEOUT_MS = 8_000; // 8 seconds
// global variable; it's ok since this runs on a person's computer
// and different instances of the extension will havve different
// background workers, each w/ their own processingFunction
let processingFunction: Promise<void> | undefined = undefined;

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

  // now add classes to the user's gcalendar
  let toExport = [];
  for (let i = 0; i < sections.length; i++) {
    // each section may have different meetings with different
    // locations. hence why we have to do each meeting separately
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
      let start = processDate(startDateTime, processedStartTime);
      // startDate bc we give start/end according to the first meeting
      let end = processDate(startDateTime, processedEndTime);
      console.log(start, end);

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
      toExport.push({
        summary,
        rrule,
        location,
        startDateTime: start,
        endDateTime: end,
      });

      let existing_calendar_events = await getExistingEvents(token, sections);

      // check whether the event already exists
      let exists = false;
      for (let potentialMatch of existing_calendar_events.get(summary) || []) {
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
          `start: ${start}, ${potentialMatch.start.dateTime} | ${
            start == potentialMatch.start.dateTime
          }`,
        );
        console.log(
          `end: ${end}, ${potentialMatch.end.dateTime} | ${
            end == potentialMatch.end.dateTime
          }`,
        );

        if (
          potentialMatch.start.dateTime == start &&
          potentialMatch.end.dateTime == end &&
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
      // TODO - add ics option here
      if (!exists) {
        // use google calendar api
        console.log("Creating event");
        let fetchResult = await createEvent(
          token,
          summary,
          rrule,
          location,
          start,
          end,
        );
        console.log(
          "for response for ",
          sections[i].subjectId,
          sections[i].course,
          "have",
        );
        console.log(fetchResult);
      }
    }
  }
  convertToICS(toExport);
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
