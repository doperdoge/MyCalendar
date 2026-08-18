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

export function exdatesCSV(startDateTime: string): string {
  return DATES.map(
    date => processDate(
      processDateZeroTime(date), // makes the date a proper datetime (with a time of 0)
      extractTime(startDateTime)) // uses the start time of the event
  ).join(",");
}