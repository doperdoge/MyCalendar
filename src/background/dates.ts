/**
 * @fileoverview Functions for processing dates as provided by MyCalendar
 */

export const TIMEZONE = "America/Los_Angeles";
/**
 * Formats a decimal time to a string of the form [H]H:MM
 * For example, 1345 -> 13:45 and 915 -> 9:15
 * @param {number} time
 * @returns {string}
 */
export function processDecimalTime(time: number) {
  let hours = Math.floor(time / 100);
  let minutes = time % 100;

  // pad with zeros, if necessary
  let hoursString = `${hours}`.padStart(2, "0");
  let minutesString = `${minutes}`.padStart(2, "0");
  return `${hoursString}:${minutesString}`;
}
/**
 * Formats a date of the form YYMMDD to a string of the form YYYYMMDDT000000
 * @param {number} time
 * @returns {string}
 */
export function processDateZeroTime(date: string) {
  return `20${date}T000000`;
}
/**
 * Extracts the date from a date time string
 * @param {string} dateTimeString - a string of the form YYYY-MM-DDTHH:MM:SS
 *  representing the date of the event. Time is ignored.
 * @returns {string}
 */
export function extractDate(dateTimeString: string) {
  // the API returns responses with a date and time for dateTimeString
  // but the time part isn't used (is always 00:00:00)
  // so we just take the date part
  return dateTimeString.split("T")[0];
}
/**
 * Extracts the time from a date time string, in the form HH:MM
 */
export function extractTime(dateTimeString: string) {
  // apparently the exception date parameter on ical needs the time the event starts
  // we extract it from the start time and append it to the holiday dates
  // it's basically the same code as extractDate
  return dateTimeString.split("T")[1].substring(0, 5);
}
/**
 * Gets the America/Los_Angeles isoformated date string
 * @param {string} dateTimeString - a string of the form YYYY-MM-DDTHH:MM:SS
 *  representing the date of the event. Time is ignored.
 * @param {string} time - a string of the form HH:MM
 * @returns {string}
 */
export function processDate(dateTimeString: string, time: string) {
  // concatenate the extracted date w/ the provided time (and add 0 seconds)
  let concatenatedDate = extractDate(dateTimeString) + "T" + time + ":00";
  // we need the current offset of America/Los_Angeles
  // so we will just figure out manually since it seems like there's no builtin solution
  let now = Date.now();
  now -= now % 1000; // remove ms
  // CA (canada) because they use YYYY-MM-DD
  // nowLA is the timestamp of "YYYY-MM-DDTHH:MM:SS" in LA
  let nowLA = Date.parse(
    new Date(now)
      .toLocaleString("en-CA", {
        timeZone: TIMEZONE,
        hour12: false, // use 24 hour time
      })
      .replace(", ", "T") + "Z", // pretend this was UTC
  );
  let offsetHours = (now - nowLA) / 1000 / 60 / 60;
  return concatenatedDate + `-0${offsetHours}:00`;
}
