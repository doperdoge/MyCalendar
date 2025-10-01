// type that contains current state of the application
export type SyncState = {
  message:
    | "successfully synced"
    | "attempting to obtain cookie"
    | "unable to obtain cookie"
    | "successfully obtained cookie";
  timestamp: number;
};
