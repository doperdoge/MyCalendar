import { logger } from "@/shared/logger";
import { ToCreateEvent } from "./types";
import { extractTime, processDate, processDateZeroTime } from "./dates";
function convertToICSDate(dateTimeString: string): string {
  // goal is YYYY-MM-DDTHH:MM:SS-HH:MM
  // into TZID=America/Los_Angeles:YYYYMMDDTHHMMSS
  // strip the -08:00 or -07:00 from the end
  // that's the last 6 characters
  let time = dateTimeString.substring(0, dateTimeString.length - 6);
  // get rid of the - and :
  time = time.replaceAll("-", "").replaceAll(":", "");
  // add the timezone info
  return "TZID=America/Los_Angeles:" + time;
}
export function exportToICS(events: ToCreateEvent[]): string {
  // ics file structure based on
  // https://gist.github.com/superjojo140/20b1b5362ef5700de82a1a3f6ee299ff
  let toJoin = ["BEGIN:VCALENDAR", "VERSION:2.0"];
  for (let toCreateEvent of events) {
    // strip the -08:00 or -07:00 from the end
    // that's the last 6 characters
    let start = convertToICSDate(toCreateEvent.startDateTime);
    let end = convertToICSDate(toCreateEvent.endDateTime);
    toJoin.push(`BEGIN:VEVENT
DTSTART;${start}
DTEND;${end}
${toCreateEvent.rrule}
${[
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
].map(date => `EXDATE:${convertToICSDate(processDate(processDateZeroTime(date), extractTime(toCreateEvent.startDateTime)))}`).join("\n")}
SUMMARY:${toCreateEvent.summary}
LOCATION:${toCreateEvent.location}
END:VEVENT`);
  }

  toJoin.push("END:VCALENDAR");
  let result = toJoin.join("\n");
  logger.log(result);
  return result;
}
