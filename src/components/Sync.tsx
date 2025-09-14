import { SyncState } from "@/types/types";
import { CheckIcon } from "@heroicons/react/16/solid";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { MoonLoader } from "react-spinners";

export default function Sync() {
  // state
  const [isLoading, setIsLoading] = useState(false);
  const [display, setDisplay] = useState(<p />);
  const [hasGoogleAuthentication, setHasGoogleAuthentication] = useState(false);

  // handlers
  const connectGoogle = () => {
    setIsLoading(true);
    chrome.identity.getAuthToken({ interactive: true }).then((token) => {
      console.log("Frontend auth flow got token ", token);
      if (token !== null) {
        setHasGoogleAuthentication(true);
      }
      setIsLoading(false);
    });
  };

  const handleUpdateDisplay = (syncState: SyncState) => {
    const MAX_MESSAGE_LIFETIME_MS = 60_000;
    if (
      isLoading || // loading, so don't show previous messages
      syncState === undefined || // nothing yet
      syncState.timestamp + MAX_MESSAGE_LIFETIME_MS < Date.now() // response, but too old
    ) {
      setDisplay(<p />);
    } else {
      const { message } = syncState;
      if (message === "successfully synced") {
        // TODO - maybe rework colors here since green isn't easy to see on white
        setDisplay(
          <div className="flex flex-row items-center justify-center text-green-500">
            <CheckIcon className="w-4 h-4" />
            <p className="text-center">Success</p>
          </div>
        );
      } else if (message === "attempting to obtain cookie") {
        setDisplay(
          <p className="text-red-500 text-center">
            Redirecting you to{" "}
            <span className="underline font-bold">
              sjsu.collegescheduler.com
            </span>{" "}
            to log in
          </p>
        );
      } else if (message === "unable to obtain cookie") {
        setDisplay(
          <p className="text-red-500 text-center">
            Unable to obtain cookie from
            <span className="underline font-bold">
              sjsu.collegescheduler.com
            </span>
            . Please make sure to log in after the redirect to
            sjsu.collegescheduler.com
          </p>
        );
      } else if (message === "successfully obtained cookie") {
        if (!isLoading) {
          console.log("this was called");
          setIsLoading(true);
          setDisplay(
            <p className="text-light-text text-center">
              Successfully obtained cookie. Currently syncing your classes to
              Google Calendar
            </p>
          );
          waitHandler();
        }
      }
    }
  };

  // handler called when user presses "Sync"
  const handler = async () => {
    setIsLoading(true);
    chrome.storage.local.set({ SyncState: undefined });
    setDisplay(<p />); // clear display
    chrome.identity.getAuthToken(
      { interactive: false },
      async function (token) {
        const syncState: SyncState = await chrome.runtime.sendMessage({
          token,
          requestType: "request",
        });
        setIsLoading(false);
        handleUpdateDisplay(syncState);
        if (syncState.message === "unable to obtain cookie") {
        }
      }
    );
  };
  const waitHandler = async () => {
    setIsLoading(true);
    chrome.storage.local.set({ SyncState: undefined });
    setDisplay(<p />); // clear display
    const syncState: SyncState = await chrome.runtime.sendMessage({
      requestType: "wait",
    });
    setIsLoading(false);
    handleUpdateDisplay(syncState);
  };

  // onload, restore any saved data
  useEffect(() => {
    chrome.storage.local.get("SyncState").then((data) => {
      if (data.SyncState !== undefined) {
        handleUpdateDisplay(data.SyncState);
      }
    });
  }, [display, isLoading]);
  // and check whether user has connected their google account
  // extremely fast, so we don't need to worry about UX
  useEffect(() => {
    chrome.identity
      .getAuthToken({ interactive: false })
      .then((token) => {
        console.log("Frontend got token ", token);
        if (token !== null) {
          setHasGoogleAuthentication(true);
        }
      })
      .catch((err) => {
        console.log("failed to get token ", err);
      })
      .finally(() => {
        console.log("hasGoogleAuthentication is ", hasGoogleAuthentication);
      });
  }, [hasGoogleAuthentication]);

  // actual render
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-2 items-center justify-center">
        {!hasGoogleAuthentication ? (
          <p className="text-light-text text-sm">
            Please connect your Google account before syncing
          </p>
        ) : null}
        <button
          onClick={hasGoogleAuthentication ? handler : connectGoogle}
          className=" bg-blue-500 disabled:opacity-50 enabled:active:opacity-50 enabled:hover:opacity-75 text-white font-bold py-2 rounded w-[200px] flex flex-row items-center justify-start"
          disabled={isLoading}
        >
          <span className="w-[50px]" /> {/** extra spacing */}
          <p className="w-[100px] text-center">
            {hasGoogleAuthentication ? "Sync Now" : "Connect Google"}
          </p>
          <div className="flex flex-row w-[50px] items-center justify-center">
            {
              // if we're loading, show the loading icon
              // else, show arrow right
              isLoading ? (
                <MoonLoader color="white" size={16} loading />
              ) : (
                <ArrowRightIcon className="w-[20px] h-[20px]" />
              )
            }
          </div>
        </button>
      </div>
      {display}
    </div>
  );
}
