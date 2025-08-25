console.log("This is a popup!");
console.log("Hi there!!!");
console.log("This is my first extension");

// try accessing the cookies for our website
// __RequestVerificationToken
// .AspNet.Cookies
// both belong to sjsu.collegescheduler.com
window.onload = function () {
  document.querySelector("button").addEventListener("click", function () {
    console.log("this function was called");
    chrome.identity.getAuthToken({ interactive: true }, function (token) {
      console.log(token);
    });
  });
};
