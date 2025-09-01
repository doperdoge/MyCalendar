import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { MoonLoader } from "react-spinners";

export default function Sync() {
  const [isLoading, setIsLoading] = useState(false);
  const [display, setDisplay] = useState(<p></p>);
  const handler = async () => {
    console.log("syncing");
    setIsLoading(true);
    chrome.identity.getAuthToken({ interactive: true }, async function (token) {
      console.log("got token!");
      console.log(token);
      const { success, message } = await chrome.runtime.sendMessage(token);
      if (success) {
        setDisplay(<p className="text-green-500 text-center">{message}</p>);
      } else {
        // display specific errors
        if (message === "unable to obtain cookie") {
          setDisplay(
            <p className="text-red-500 text-center">
              Unable to obtain cookie. Please log in at{" "}
              <a
                href="https://sjsu.collegescheduler.com/entry"
                className="underline"
                target="_blank"
              >
                sjsu.collegescheduler.com
              </a>{" "}
              and try again
            </p>
          );
        } else {
          setDisplay(<p className="text-red-500 text-center">{message}</p>);
        }
      }
      setIsLoading(false);
    });
  };

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
