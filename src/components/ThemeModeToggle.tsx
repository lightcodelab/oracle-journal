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
      className="text-foreground/70 hover:text-foreground"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
};

export default ThemeModeToggle;
