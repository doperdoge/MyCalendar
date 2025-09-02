import { SyncResponse } from "@/types/types";
import { CheckIcon } from "@heroicons/react/16/solid";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { MoonLoader } from "react-spinners";

export default function Sync() {
  // state
  const [isLoading, setIsLoading] = useState(false);
  const [display, setDisplay] = useState(<p />);

  const handleUpdateDisplay = (syncResponse: SyncResponse) => {
    const MAX_MESSAGE_LIFETIME_MS = 60_000;
    if (
      isLoading || // loading, so don't show previous messages
      syncResponse === undefined || // nothing yet
      syncResponse.timestamp + MAX_MESSAGE_LIFETIME_MS < Date.now() // response, but too old
    ) {
      setDisplay(<p />);
    } else {
      const { success, message } = syncResponse;
      if (success) {
        // TODO - maybe rework colors here since green isn't easy to see on white
        setDisplay(
          <div className="flex flex-row items-center justify-center text-green-500">
            <CheckIcon className="w-4 h-4" />
            <p className="text-center">Success</p>
          </div>
        );
      } else {
        // display specific errors
        if (message === "unable to obtain cookie") {
          setDisplay(
            <p className="text-red-500 text-center">
              Please <b>try again</b> after logging in at{" "}
              <a
                href="https://sjsu.collegescheduler.com/entry"
                className="underline font-bold"
                target="_blank"
              >
                sjsu.collegescheduler.com
              </a>
            </p>
          );
        } else if (message === "unable to obtain token") {
          setDisplay(
            <p className="text-red-500 text-center">
              Unable to obtain auth token. Please ensure that the current Google
              Chrome profile is an SJSU account and that you accepted this
              extension's request to access your Google Calendar
            </p>
          );
        } else {
          setDisplay(<p className="text-red-500 text-center">{message}</p>);
        }
      }
    }
  };

  // handler called when user presses "Sync"
  const handler = async () => {
    setIsLoading(true);
    chrome.storage.local.set({ SyncResponse: undefined });
    setDisplay(<p />); // clear display
    chrome.identity.getAuthToken({ interactive: true }, async function (token) {
      const syncResponse = await chrome.runtime.sendMessage(token);
      setIsLoading(false);
      handleUpdateDisplay(syncResponse);
    });
  };

  // onload, restore any saved data
  useEffect(() => {
    chrome.storage.local.get("SyncResponse").then((data) => {
      if (data.SyncResponse !== undefined) {
        handleUpdateDisplay(data.SyncResponse);
      }
    });
  });

  // actual render
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-2 items-center justify-center">
        <button
          onClick={handler}
          className=" bg-blue-500 enabled:active:opacity-50 enabled:hover:opacity-75 text-white font-bold py-2 rounded w-[200px] flex flex-row items-center justify-start"
        >
          <span className="w-[50px]" /> {/** extra spacing */}
          <p className="w-[100px] text-center">Sync Now</p>
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
