import { useEffect, useState } from "react";

export function useDarkMode(): [boolean, () => void] {
  const [darkMode, setDarkMode] = useState<boolean>(true);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle("dark");
    setDarkMode(!darkMode);
  };

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const localStorageDarkMode = localStorage.getItem("darkMode");
    const initialDarkMode =
      localStorageDarkMode !== null
        ? JSON.parse(localStorageDarkMode)
        : prefersDark;

    setDarkMode(initialDarkMode);
    document.documentElement.classList.toggle("dark", initialDarkMode);
  }, []);

  useEffect(() => {
    const debounceSave = setTimeout(() => {
      localStorage.setItem("darkMode", JSON.stringify(darkMode));
    }, 500);

    return () => {
      clearTimeout(debounceSave);
    };
  }, [darkMode]);

  return [darkMode, toggleDarkMode];
}