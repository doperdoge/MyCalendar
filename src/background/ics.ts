import { logger } from "@/shared/logger";
import { ToCreateEvent } from "./types";
import { exdatesCSV } from "./holidays";
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
EXDATES:${exdatesCSV()}
SUMMARY:${toCreateEvent.summary}
LOCATION:${toCreateEvent.location}
END:VEVENT`);
  }

  toJoin.push("END:VCALENDAR");
  let result = toJoin.join("\n");
  logger.log(result);
  return result;
}
