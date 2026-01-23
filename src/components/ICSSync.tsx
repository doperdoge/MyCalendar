import { getSyncState, setSyncState } from "@/shared";
import { RequestType, SyncState } from "@/shared/types";
import { CheckIcon } from "@heroicons/react/16/solid";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { MoonLoader } from "react-spinners";

export default function ICSSync() {
  // state
  const [isLoading, setIsLoading] = useState(false);
  const [display, setDisplay] = useState(<p />);
  const ics = useRef<{ url: string | undefined; content: string | undefined }>({
    url: undefined,
    content: undefined,
  });

  // ==============================
  // Handlers
  // ==============================
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
      if (message === "successfully exported to ics") {
        // TODO - maybe rework colors here since green isn't easy to see on white
        if (
          ics.current.content === undefined ||
          ics.current.content !== syncState.ics
        ) {
          if (ics.current.url !== undefined) {
            URL.revokeObjectURL(ics.current.url);
          }
          let content = syncState.ics;
          let blob = new Blob([content], { type: "text/calendar" });
          let url = URL.createObjectURL(blob);
          ics.current = { content, url };
          console.log("creating new url", url);
        }

        setDisplay(
          <div className="flex flex-col justify-center items-center text-xs">
            <div className="flex flex-row items-center justify-center text-green-500">
              <CheckIcon className="w-4 h-4" />
              <p className="text-center">Success</p>
            </div>

            <a
              href={ics.current.url}
              download="classes.ics"
              className="text-center underline hover:cursor-pointer"
            >
              Download classes.ics
            </a>
          </div>,
        );
      } else if (message === "attempting to obtain cookie") {
        setDisplay(
          <p className="text-red-500 text-center text-xs">
            Redirecting you to{" "}
            <span className="underline font-bold">
              sjsu.collegescheduler.com
            </span>{" "}
            to log in
          </p>,
        );
      } else if (message === "unable to obtain cookie") {
        setDisplay(
          <p className="text-red-500 text-center text-xs">
            Unable to obtain cookie from
            <span className="underline font-bold">
              sjsu.collegescheduler.com
            </span>
            . Please make sure to log in after the redirect to
            sjsu.collegescheduler.com
          </p>,
        );
      } else if (message === "successfully obtained cookie") {
        if (!isLoading) {
          console.log("this was called");
          setIsLoading(true);
          setDisplay(
            <p className="text-light-text text-center text-xs">
              Successfully obtained cookie. Fetching classes...
            </p>,
          );
          waitHandler();
        }
      }
    }
  };

  // handler called when user presses "Sync"
  const syncHandler = async () => {
    setIsLoading(true);
    setSyncState({ SyncState: undefined });
    setDisplay(<p />); // clear display
    const syncState: SyncState = await chrome.runtime.sendMessage<RequestType>({
      requestType: "ics",
    });
    setIsLoading(false);
    handleUpdateDisplay(syncState);
    if (syncState.message === "unable to obtain cookie") {
      // Shouldn't happen
      console.log("shouldn't happen: unable to obtain cookie");
    }
  };
  const waitHandler = async () => {
    setIsLoading(true);
    setSyncState({ SyncState: undefined });
    setDisplay(<p />); // clear display
    const syncState: SyncState = await chrome.runtime.sendMessage<RequestType>({
      requestType: "wait",
    });
    setIsLoading(false);
    handleUpdateDisplay(syncState);
  };

  // ==============================
  // Lifecycle
  // ==============================
  // onload, restore any saved data
  useEffect(() => {
    getSyncState().then((data) => {
      if (data.SyncState !== undefined) {
        handleUpdateDisplay(data.SyncState);
      }
    });
  }, [display, isLoading]);

  // ==============================
  // Render
  // ==============================
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-2 items-center justify-center">
        <button
          onClick={syncHandler}
          className=" bg-blue-500 disabled:opacity-50 enabled:active:opacity-50 enabled:hover:opacity-75 text-white font-bold py-2 rounded w-50 flex flex-row items-center justify-start"
          disabled={isLoading}
        >
          <span className="w-12.5" /> {/** extra spacing */}
          <p className="w-25 text-center text-sm">Export to ICS</p>
          <div className="flex flex-row w-12.5 items-center justify-center">
            {
              // if we're loading, show the loading icon
              // else, show arrow right
              isLoading ? (
                <MoonLoader color="white" size={16} loading />
              ) : (
                <ArrowRightIcon className="w-5 h-5" />
              )
            }
          </div>
        </button>
      </div>
      {display}
    </div>
  );
}
