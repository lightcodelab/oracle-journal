import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Applies the dark "admin" palette on admin tooling routes and the
 * parchment palette everywhere else.
 */
export default function ThemeScope() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isAdmin = pathname.startsWith("/admin");
    document.documentElement.classList.toggle("admin-theme", isAdmin);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", isAdmin ? "#0D0800" : "#F2E8D5");
  }, [pathname]);

  return null;
}