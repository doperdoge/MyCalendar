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

  // make a fetch
  let result = await fetch(
    "https://sjsu.collegescheduler.com/api/term-data/Fall%202025",
    {
      credentials: "include",
    }
  ).then((res) => res.json());
  console.log(result);

  return true;
});
