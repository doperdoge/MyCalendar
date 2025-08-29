console.log("This is a popup!");
console.log("Hi there!!!");
console.log("This is my first extension");

// try accessing the cookies for our website
// __RequestVerificationToken
// .AspNet.Cookies
// both belong to sjsu.collegescheduler.com
window.onload = function () {
  document.querySelector("button").addEventListener("click", async function () {
    console.log("this function was called");
    chrome.identity.getAuthToken({ interactive: true }, async function (token) {
      console.log("got token!");
      console.log(token);
      let result = await chrome.runtime.sendMessage(token);
      // TODO - looks like the below don't get run because of chrome.tabs.create
      // pushing us to a new tab, so the message doesn't get displayed
      console.log("Result from sendMessage: ", result);
      let { success, message } = result;
      // do some display logic to display the message if failed
      document.getElementById("displayError").innerText = message;
    });
    chrome.tabs.create({ url: "https://sjsu.collegescheduler.com" });
  });
};
