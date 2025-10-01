import { SyncState } from "./types";

export async function getSyncState(): Promise<{ SyncState?: SyncState }> {
  return await chrome.storage.local.get("SyncState");
}
export async function setSyncState({ SyncState }: { SyncState?: SyncState }) {
  return await chrome.storage.local.set({ SyncState });
}
