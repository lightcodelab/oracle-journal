import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useThemeMode } from "@/hooks/useThemeMode";

/**
 * Applies the dark Temple palette on admin routes (always) and on member
 * routes when the user has chosen dark mode. Light mode uses the parchment palette.
 */
export default function ThemeScope() {
  const { pathname } = useLocation();
  const { mode } = useThemeMode();

  useEffect(() => {
    const isAdmin = pathname.startsWith("/admin");
    const root = document.documentElement;
    root.classList.toggle("admin-theme", isAdmin);
    root.classList.toggle("dark-theme", !isAdmin && mode === "dark");
    root.classList.toggle("dark", isAdmin || mode === "dark");

    const dark = isAdmin || mode === "dark";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#0D0800" : "#F2E8D5");
  }, [pathname, mode]);

  return null;
}
