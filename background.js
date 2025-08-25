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
  chrome.identity.getAuthToken({ interactive: true }, async function (token) {
    console.log(token);
    for (let i = 0; i < sections.length; i++) {
      // use google calendar api
      // https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
      // we want to make a post request
      let actualStartTime = `${sections[i].meetings[0].startTime}`;
      actualStartTime =
        actualStartTime.slice(0, 2) + ":" + actualStartTime.slice(2);
      let actualEndTime = `${sections[i].meetings[0].endTime}`;
      actualEndTime = actualEndTime.slice(0, 2) + ":" + actualEndTime.slice(2);
      result = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/calendarId/events",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            start: {
              dateTime: `2025-08-22T${actualStartTime}:00-07:00`,
            },
            end: {
              dateTime: `2025-08-22T${actualEndTime}:00-07:00`,
            },
            location: `${sections[i].meetings[0].buildingCode}`,
            summary: `${sections[i].subjectID} ${sections[i].course}`,
          }),
        }
      ).then((res) => res.json());
      console.log("for response for ", sections[i].subjectID, "have");
      console.log(result);
    }
  });

  return true;
});
