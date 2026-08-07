import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeMode } from "@/hooks/useThemeMode";

const ThemeModeToggle = () => {
  const { mode, toggleMode } = useThemeMode();
  const isDark = mode === "dark";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleMode}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="text-foreground/70 hover:text-foreground gap-1.5"
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4" />
          <span className="text-xs font-medium">Light</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4" />
          <span className="text-xs font-medium">Dark</span>
        </>
      )}
    </Button>
  );
};

export default ThemeModeToggle;
