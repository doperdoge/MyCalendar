// type that contains current state of the application
export type SyncState = {
  message:
    | "successfully synced"
    | "attempting to obtain cookie"
    | "unable to obtain cookie"
    | "successfully obtained cookie";
  timestamp: number;
};

export type Token = {
  access_token: string;
  email: string;
  timestamp: number; // ms since epoch
  expires_in: number; // in ms
};
export type RequestType =
  | { requestType: "wait" } // use when waiting for completion
  | { requestType: "request"; token: string } // use when doing the action
  | { requestType: "authenticate"; interactive: boolean }; // use when authenticating
