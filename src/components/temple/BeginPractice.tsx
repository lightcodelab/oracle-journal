import { Link } from "react-router-dom";
import {
  Sparkles,
  Headphones,
  Compass,
  FileHeart,
  BookOpen,
  Radio,
} from "lucide-react";

const items = [
  { title: "Draw a card", href: "/remembrance", icon: Sparkles },
  {
    title: "Choose a meditation",
    href: "/devotion/section/guided-meditation",
    icon: Headphones,
  },
  {
    title: "Build an AreekeerA® protocol",
    href: "/devotion/areekeera",
    icon: Compass,
  },
  {
    title: "Open healing templates",
    href: "/devotion/section/healing-templates",
    icon: FileHeart,
  },
  { title: "Explore courses", href: "/devotion/energy-hygiene", icon: BookOpen },
  { title: "View live offerings", href: "/all-live-sessions", icon: Radio },
];

export function BeginPractice() {
  return (
    <section
      id="begin-practice"
      aria-labelledby="begin-practice-heading"
      className="mb-12"
    >
      <h2
        id="begin-practice-heading"
        className="font-serif text-2xl text-foreground mb-3"
      >
        Begin a practice
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map(({ title, href, icon: Icon }) => (
          <Link
            key={href}
            to={href}
            className="group flex items-center gap-3 p-4 rounded-lg border border-border/60 bg-card/60 hover:border-primary/40 hover:bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[64px]"
          >
            <Icon
              className="h-5 w-5 text-primary flex-shrink-0"
              aria-hidden
            />
            <span className="font-serif text-foreground text-sm sm:text-base">
              {title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}