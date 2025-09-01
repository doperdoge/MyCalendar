import crxLogo from "@/assets/crx.svg";
import reactLogo from "@/assets/react.svg";
import viteLogo from "@/assets/vite.svg";
import HelloWorld from "@/components/HelloWorld";

export default function App() {
  return (
    <div>
      <div className="flex flex-row gap-4">
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="w-24 h-24" alt="Vite logo" />
        </a>
        <a href="https://reactjs.org/" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="w-24 h-24" alt="React logo" />
        </a>
        <a
          href="https://crxjs.dev/vite-plugin"
          target="_blank"
          rel="noreferrer"
        >
          <img src={crxLogo} className="w-24 h-24" alt="crx logo" />
        </a>
      </div>
      <HelloWorld msg="Vite + React + CRXJS" />
    </div>
  );
}
