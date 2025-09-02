export type SyncResponse = {
  success: boolean;
  message:
    | "Successfully synced"
    | "unable to obtain cookie"
    | "unable to obtain token";
  timestamp: number;
};
