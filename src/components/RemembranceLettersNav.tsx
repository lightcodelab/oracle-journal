import { useState } from "react";
import { Mail, Menu, PanelRightOpen, PanelRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { themeForMonth } from "@/lib/remembranceThemes";
import type { RemembranceLetter } from "@/hooks/useRemembranceLetters";

interface RemembranceLettersNavProps {
  letters: RemembranceLetter[];
  activeMonth: number | null;
  onSelect: (month: number) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export default function RemembranceLettersNav({
  letters,
  activeMonth,
  onSelect,
  collapsed: collapsedProp,
  onCollapsedChange,
}: RemembranceLettersNavProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = collapsedProp ?? internalCollapsed;
  const setCollapsed = onCollapsedChange ?? setInternalCollapsed;

  const handleSelect = (month: number) => {
    setIsMobileOpen(false);
    onSelect(month);
  };

  const navContent = (
    <>
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "transition-opacity duration-200",
              collapsed && "md:opacity-0 md:w-0 md:overflow-hidden"
            )}
          >
            <p className="text-[0.55rem] sm:text-[0.6rem] tracking-[0.16em] uppercase text-primary-strong">
              A year-long Sacred Undoing pilgrimage
            </p>
            <h2 className="mt-1.5 font-serif text-lg text-foreground leading-tight">
              My Remembrance Letters
            </h2>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1 hover:bg-muted rounded ml-2"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            aria-pressed={collapsed}
          >
            {collapsed ? (
              <PanelRight className="w-4 h-4" aria-hidden="true" />
            ) : (
              <PanelRightOpen className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-0.5">
          {letters.map((letter) => {
            const theme = themeForMonth(letter.month_number);
            const selected = letter.month_number === activeMonth;
            return (
              <button
                key={letter.id}
                onClick={() => handleSelect(letter.month_number)}
                className={cn(
                  "group w-full flex items-center gap-3 rounded-md text-left transition-colors",
                  collapsed ? "md:justify-center md:px-2 py-2.5" : "px-3 py-2.5",
                  selected
                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                )}
                aria-label={`Month ${letter.month_number}${theme?.shortTitle ? ` — ${theme.shortTitle}` : ""}`}
                title={collapsed ? `Month ${letter.month_number}${theme?.shortTitle ? ` — ${theme.shortTitle}` : ""}` : undefined}
              >
                <div
                  className={cn(
                    "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <span
                  className={cn(
                    "text-sm leading-tight transition-opacity duration-200",
                    selected && "font-medium",
                    collapsed && "md:hidden"
                  )}
                >
                  Month {letter.month_number}
                  <span className="block text-xs text-muted-foreground">
                    {theme?.shortTitle ?? ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        className={cn(
          "md:hidden fixed top-3 left-3 z-50 p-2 bg-card border border-border rounded-lg shadow-lg transition-opacity",
          isMobileOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-card border-r border-border flex flex-col transition-all duration-300",
          collapsed ? "w-64 md:w-16" : "w-64 md:w-72",
          isMobileOpen ? "translate-x-0 z-50" : "-translate-x-full md:translate-x-0 z-40"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
