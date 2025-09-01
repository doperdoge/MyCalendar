import Sync from "@/components/Sync";

export default function App() {
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
      <Sync />
    </div>
  );
}
