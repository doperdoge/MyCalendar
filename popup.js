console.log("This is a popup!");
console.log("Hi there!!!");
console.log("This is my first extension");

// try accessing the cookies for our website
// __RequestVerificationToken
// .AspNet.Cookies
// both belong to sjsu.collegescheduler.com

chrome.runtime.sendMessage({ greeting: "hello" });
