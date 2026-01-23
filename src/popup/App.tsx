import GCalSync from "@/components/GCalSync";
import ICSSync from "@/components/ICSSync";
import { useState } from "react";

export default function App() {
  const [useGoogle, setUseGoogle] = useState(true);
  return (
    <div className="flex flex-col gap-2 w-[400px] p-2">
      {/* header stuff */}
      <h1 className="text-xl text-center text-light-primary font-bold">
        MyCalendar
      </h1>
      <p className="text-sm text-light-text">
        The <i>simple</i> way to sync your SJSU classes to Google Calendar
      </p>
      {/* sync button */}
      {useGoogle ? <GCalSync /> : <ICSSync />}
      <div>
        Or,{" "}
        <button
          onClick={() => setUseGoogle(!useGoogle)}
          className="underline hover:cursor-pointer"
        >
          export to {useGoogle ? "ICS" : "Google Calendar"}
        </button>
      </div>
    </div>
  );
}
