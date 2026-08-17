import { getSyncState, isTokenEqual, setSyncState } from "@/shared";
import { logger } from "@/shared/logger";
import { RequestType, SyncState, Token } from "@/shared/types";
import { CheckIcon } from "@heroicons/react/16/solid";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { MoonLoader } from "react-spinners";

export default function GCalSync() {
  // state
  const [isLoading, setIsLoading] = useState(false);
  const [display, setDisplay] = useState(<p />);
  const [token, setToken] = useState<{ Token?: Token }>({ Token: undefined });
  const [ready, setReady] = useState(false);

  // authentication
  const getAuthToken = async ({
    interactive = false,
  }: {
    interactive?: boolean;
  }): Promise<{ Token?: Token }> => {
    return await chrome.runtime.sendMessage<RequestType>({
      requestType: "authenticate",
      interactive: interactive,
    });
  };

  // ==============================
  // Handlers
  // ==============================
  const connectGoogle = () => {
    setIsLoading(true);
    logger.log("attempting interactive");
    getAuthToken({ interactive: true }).then((token: { Token?: Token }) => {
      logger.log("Frontend auth flow got token ", token);
      setToken(token);
      // TODO - maybe add an error message if token is undefined
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
      if (message === "successfully synced with gcalendar") {
        // TODO - maybe rework colors here since green isn't easy to see on white
        setDisplay(
          <div className="flex flex-row items-center justify-center text-green-500">
            <CheckIcon className="w-4 h-4" />
            <p className="text-center text-xs">Success</p>
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
          logger.log("this was called");
          setIsLoading(true);
          setDisplay(
            <p className="text-light-text text-center text-xs">
              Successfully obtained cookie. Currently syncing your classes to
              Google Calendar
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
    getAuthToken({ interactive: false }).then(async (token) => {
      // sanity check; could be written as an assert but
      // that wouldn't pass ts typecheck
      if (token.Token === undefined) {
        logger.log("shouldn't happen: token is undefined");
        return;
      }
      // main logic; send a request to do stuff
      const syncState: SyncState =
        await chrome.runtime.sendMessage<RequestType>({
          token: token.Token.access_token,
          requestType: "gcalendar",
        });
      setIsLoading(false);
      handleUpdateDisplay(syncState);
      if (syncState.message === "unable to obtain cookie") {
        // Shouldn't happen
        logger.log("shouldn't happen: unable to obtain cookie");
      }
    });
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
  // and check whether user has connected their google account
  // extremely fast, so we don't need to worry about UX
  useEffect(() => {
    getAuthToken({ interactive: false })
      .then((tok) => {
        if (!isTokenEqual(token.Token, tok.Token)) {
          setToken(tok);
        }
      })
      .catch((err) => {
        logger.log("useEffect: error launching auth flow: ", err);
      })
      .finally(() => setReady(true));
  }, [token, ready]);

  // ==============================
  // Render
  // ==============================
  if (!ready) {
    return (
      <div className="flex flex-row items-center justify-center">
        <MoonLoader color="blue" size={16} loading />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {token.Token !== undefined && (
        <p className="text-light-text text-sm">
          Syncing Google Calendar for: {token.Token.email}
        </p>
        // TODO - add a way to switch accounts
      )}
      <div className="flex flex-row gap-2 items-center justify-center">
        {token.Token === undefined && (
          <p className="text-light-text text-sm">
            Please connect your Google account before syncing
          </p>
        )}
        <button
          onClick={token.Token !== undefined ? syncHandler : connectGoogle}
          className=" bg-blue-500 disabled:opacity-50 enabled:active:opacity-50 enabled:hover:opacity-75 text-white font-bold py-2 rounded w-50 flex flex-row items-center justify-start"
          disabled={isLoading}
        >
          <span className="w-12.5" /> {/** extra spacing */}
          <p className="w-25 text-center text-sm">
            {token.Token !== undefined ? "Sync Now" : "Connect Google"}
          </p>
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
