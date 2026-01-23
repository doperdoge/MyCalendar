// type that contains current state of the application
export type SyncState =
  | {
      message:
        | "successfully synced with gcalendar"
        | "attempting to obtain cookie"
        | "unable to obtain cookie"
        | "successfully obtained cookie";
      timestamp: number;
    }
  | { message: "successfully exported to ics"; timestamp: number; ics: string };

export type Token = {
  access_token: string;
  email: string;
  timestamp: number; // ms since epoch
  expires_in: number; // in ms
};
export type RequestType =
  | { requestType: "wait" } // use when waiting for completion
  | { requestType: "gcalendar"; token: string } // use when doing the gcalendar action
  | { requestType: "ics" } // use when doing the ics action
  | { requestType: "authenticate"; interactive: boolean }; // use when authenticating
