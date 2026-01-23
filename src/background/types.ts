export type ToCreateEvent = {
  summary: string; // event title
  rrule: string; // recurrence rule, e.g. "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"
  location: string; // where the event occurs
  startDateTime: string; // start time of the FIRST meeting
  endDateTime: string; // end time of the FIRST meeting
};
