chrome.runtime.onMessage.addListener(async (request, sender, reply) => {
  async function getCookies(domian, name) {
    return await chrome.cookies.get({ url: domian, name: name });
  }
  let cookie1 = await getCookies(
    "https://sjsu.collegescheduler.com",
    "__RequestVerificationToken"
  );
  let cookie2 = await getCookies(
    "https://sjsu.collegescheduler.com",
    " .AspNet.Cookies"
  );
  console.log(cookie1);
  console.log(cookie2);
  console.log("hi there");

  let token = request;
  console.log("got token ", token);

  // make a fetch to get course scheduler
  let result = await fetch(
    "https://sjsu.collegescheduler.com/api/term-data/Fall%202025",
    {
      method: "GET",
      credentials: "include",
    }
  ).then((res) => res.json());
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
    // 1200 -> 12:00
    // 900 -> 09:00
    let processedStartTime = `${sections[i].meetings[0].startTime}`;
    if (processedStartTime.length == 3) {
      processedStartTime =
        processedStartTime.slice(0, 1) + ":" + processedStartTime.slice(1);
    } else {
      processedStartTime =
        processedStartTime.slice(0, 2) + ":" + processedStartTime.slice(2);
    }
    let processedEndTime = `${sections[i].meetings[0].endTime}`;
    if (processedEndTime.length == 3) {
      processedEndTime =
        processedEndTime.slice(0, 1) + ":" + processedEndTime.slice(1);
    } else {
      processedEndTime =
        processedEndTime.slice(0, 2) + ":" + processedEndTime.slice(2);
    }
    console.log(processedStartTime, processedEndTime);
    let startDateTime = sections[i].meetings[0].startDate; // string
    let endDateTime = sections[i].meetings[0].endDate; // string
    // replace the time with the actual time
    console.log(startDateTime, endDateTime);
    let processedStartDateTime =
      startDateTime.slice(0, startDateTime.indexOf("T")) +
      "T" +
      processedStartTime +
      ":00-07:00";
    // should be the end date time of the FIRST meeting
    let processedEndDateTime =
      startDateTime.slice(0, endDateTime.indexOf("T")) +
      "T" +
      processedEndTime +
      ":00-07:00";
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
    let until = endDateTime
      .slice(0, endDateTime.indexOf("T"))
      .replaceAll("-", "");
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

  return true;
});
