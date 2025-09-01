/**
 * Formats a decimal time to a string of the form [H]H:MM
 * For example, 1345 -> 13:45 and 915 -> 9:15
 * @param {number} time
 * @returns {string}
 */
function processDecimalTime(time: number) {
  let hours = Math.floor(time / 100);
  let minutes = time % 100;
  return `${hours}:${minutes}`;
}
/**
 * Extracts the date from a date time string
 * @param {string} dateTimeString
 * @returns {string}
 */
function extractDate(dateTimeString: string) {
  return dateTimeString.split("T")[0];
}

async function checkLoggedInHandler(request: any, sender: any, reply: any) {
  await fetch("https://sjsu.collegescheduler.com/api/term-data/Fall%202025", {
    method: "GET",
    credentials: "include",
  }).then(
    (res) => reply({ success: true, message: "user is logged in" }),
    (err) => reply({ success: false, message: err })
  );
}

async function handler(token: string, sender: any, reply: any) {
  console.log("got chrome auth token ", token);

  // make a fetch to get course scheduler
  let result = null;
  let timestampStarted = Date.now();
  let numSecondsToWait = 20;
  while (
    result == null &&
    Date.now() - timestampStarted < numSecondsToWait * 1000
  ) {
    try {
      result = await fetch(
        "https://sjsu.collegescheduler.com/api/term-data/Fall%202025",
        {
          method: "GET",
          credentials: "include",
        }
      ).then((res) => res.json());
    } catch (err) {
      console.log(
        "failed to get page with error ",
        err,
        " retrying in 5 seconds"
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  // check which of the terminating conditions we have
  if (result == null) {
    reply({
      success: false,
      message:
        'Unable to obtain cookie try again by pressing the "Sync Schedule" button',
    });
    return;
  }

  console.log(result);

  // get current sections
  let sections = result.currentSections;

  // we want to get subjectId, course,
  // meetings[0].buildingCode, meetings[0].startTime, meetings[0].endTime
  // startTime and endTime are military time, but decimal, ie 1:45 PM is 1345
  console.log(token);
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
    console.log(
      "for response for ",
      sections[i].subjectId,
      sections[i].course,
      "have"
    );
    console.log(result);
  }
  reply({ success: true, message: "Successfully synced" });
}
chrome.runtime.onMessage.addListener((request, sender, reply) => {
  if (request.type === "checkLoggedIn") {
    checkLoggedInHandler(request, sender, reply);
    return true;
  } else {
    // else, request.type === "syncSchedule"
    handler(request.token, sender, reply);
    return true;
  }
});
