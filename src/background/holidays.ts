import { processDate, processDateZeroTime, extractTime } from "./dates";

// dates are for: FALL 2026 and SPRING 2027
// add or remove as semesters go

const DATES = [
  "260907", // labor day
  "261111", // veterns day
  "261125", // non instruction day
  "261126", // thanksgiving day
  "261127", // thanksgiving day ii
  "270329", // spring break
  "270330", // spring break ii
  "270331", // spring break iii
  "270401", // spring break iv
  "270402", // spring break v
];

/**
 * formats dates into a calendar-readable format for holiday exculsion
 * @param startDateTime the start time of the event
 * @returns a list of comma-sepearted dates as YYYYMMDDTHHMMSS with the time as the start time of the event
 */
export function exdatesCSV(startDateTime: string): string {
  return DATES.map(
    date => convertToICSDate(
      processDate(
        processDateZeroTime(date), // makes the date a proper datetime (with a time of 0)
        extractTime(startDateTime) // uses the start time of the event
      )
    )
  ).join(",");
}
/**
 * csv of dates for holiday exculsion
 * @returns a list of comma-sepearted dates as YYYYMMDD
 */
export function exdatesJustDates(): string {
  return DATES.map(date => "30" + date).join(",");
}
/**
 * basically the same as ./ics.ts/convertToICSDate but without the time zone info
 * @param dateTimeString a date as YYYY-MM-DDTHH:MM:SS-HH:MM
 * @returns the same date but as YYYYMMDDTHHMMSS
 */
function convertToICSDate(dateTimeString: string): string {
  // strip the -08:00 or -07:00 from the end
  // that's the last 6 characters
  let time = dateTimeString.substring(0, dateTimeString.length - 6);
  // get rid of the - and :
  time = time.replaceAll("-", "").replaceAll(":", "");
  return time;
}