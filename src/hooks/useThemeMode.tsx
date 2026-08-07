import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "temple-theme-mode";

interface ThemeModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: "light",
  setMode: () => {},
  toggleMode: () => {},
});

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  useEffect(() => {
    // ThemeScope applies the class so admin routes always stay dark.
    window.dispatchEvent(new CustomEvent("temple-theme-mode", { detail: mode }));
  }, [mode]);

  return (
    <ThemeModeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
