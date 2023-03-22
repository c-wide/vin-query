import { useState } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/20/solid";
import CustomTable from "./CustomTable";
import { useDarkMode } from "./hooks/useDarkMode";
import lightLogo from "./assets/logo-light.svg";
import darkLogo from "./assets/logo-dark.svg";

export default function App() {
  const [darkMode, toggleDarkMode] = useDarkMode();
  const [transitionDuration, setTransitionDuration] = useState(0);

  const handleClick = () => {
    if (transitionDuration !== 500) {
      setTransitionDuration(500);
    }
    toggleDarkMode();
  };

  return (
    <div
      className={`min-h-screen transition-colors ${
        transitionDuration === 0 ? "" : "duration-500 ease-in-out"
      } bg-gray-100 dark:bg-gray-800`}
    >
      <div className="py-6 px-6">
        <div className="grid grid-cols-3">
          <div></div>
          <div className="flex items-center justify-center">
            <img
              className="h-[100px]"
              src={darkMode ? darkLogo : lightLogo}
              alt="logo"
            />
          </div>
          <div className="flex items-center justify-end">
            <button onClick={handleClick} className="focus:outline-none">
              {darkMode ? (
                <MoonIcon className="w-6 h-6 text-gray-500" />
              ) : (
                <SunIcon className="w-6 h-6 text-yellow-500" />
              )}
            </button>
          </div>
        </div>
        <div className="mt-8">
          <CustomTable />
        </div>
      </div>
    </div>
  );
}
