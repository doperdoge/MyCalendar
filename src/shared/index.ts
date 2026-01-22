import { SyncState, Token } from "./types";

export async function getSyncState(): Promise<{ SyncState?: SyncState }> {
  return await chrome.storage.local.get("SyncState");
}
export async function setSyncState({ SyncState }: { SyncState?: SyncState }) {
  return await chrome.storage.local.set({ SyncState });
}

export function isTokenEqual(t1: Token | undefined, t2: Token | undefined) {
  if (t1 === undefined && t2 === undefined) {
    return true;
  } else if (t1 == undefined || t2 == undefined) {
    return false;
  }
  return (
    t1.access_token === t2.access_token &&
    t1.email === t2.email &&
    t1.timestamp === t2.timestamp &&
    t1.expires_in === t2.expires_in
  );
}
