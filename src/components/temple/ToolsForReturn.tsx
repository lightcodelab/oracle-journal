import { Link } from "react-router-dom";
import { TOOL_ICONS } from "@/lib/toolIcons";

const tools = [
  { label: "Journal", href: "/journal", icon: TOOL_ICONS.journal },
  { label: "Playlists", href: "/playlists", icon: TOOL_ICONS.playlists },
  { label: "My Living Pattern", href: "/living-pattern", icon: TOOL_ICONS.livingPattern },
  { label: "Tracking", href: "/tracking", icon: TOOL_ICONS.tracking },
  { label: "Readings", href: "/readings", icon: TOOL_ICONS.readings },
  { label: "Protocols", href: "/devotion/protocols", icon: TOOL_ICONS.protocols },
];

export function ToolsForReturn() {
  return (
    <section aria-labelledby="tools-heading" className="mb-12">
      <div className="rounded-lg border border-border/50 bg-card/50 p-4">
        <h3 id="tools-heading" className="font-serif text-2xl text-foreground mb-1">
          Tools for Your Return
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Gentle places to reflect, listen, and notice what is changing.
        </p>
        <div className="flex flex-wrap gap-2">
          {tools.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-card border border-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
