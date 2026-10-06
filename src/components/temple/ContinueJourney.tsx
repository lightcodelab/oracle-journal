import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, BookOpen, Compass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHomeContinuation, type Continuation } from "@/hooks/useHomeContinuation";

interface ContinueJourneyProps {
  enabled: boolean;
}

const ICONS = {
  card: Sparkles,
  lesson: BookOpen,
  resource: Compass,
} as const;

function ContinuationColumn({ item }: { item: Continuation }) {
  const Icon = ICONS[item.kind];
  const href = item.available ? item.href : item.fallbackHref;

  return (
    <Link to={href} className="block group h-full min-w-0">
      <Card className="h-full bg-card border-border/60 group-hover:border-primary/40 transition-colors">
        <CardContent className="p-3 flex items-start gap-3 h-full">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {item.label}
            </p>
            <p className="font-serif text-base text-foreground break-words line-clamp-2">
              {item.available ? item.title : item.emptyHint}
            </p>
          </div>
          <ArrowRight
            className="h-4 w-4 text-primary flex-shrink-0 mt-0.5"
            aria-hidden
          />
        </CardContent>
      </Card>
    </Link>
  );
}

const SAMPLES: Continuation[] = [
  { kind: "card", label: "Your last card", title: "The Prism", available: true, href: "/remembrance", fallbackHref: "/remembrance", emptyHint: "" },
  { kind: "resource", label: "Recently opened", title: "Grounding Meditation", available: true, href: "/devotion", fallbackHref: "/devotion", emptyHint: "" },
] as unknown as Continuation[];

export function ContinueJourney({ enabled }: ContinueJourneyProps) {
  const { data, isLoading } = useHomeContinuation(enabled);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      aria-labelledby="continue-heading"
      className="mb-10 h-full min-w-0"
    >
      <h2
        id="continue-heading"
        className="font-serif text-2xl text-foreground mb-3"
      >
        Continue your journey
      </h2>

      {!enabled ? (
        <div data-preview-block className="grid grid-cols-[minmax(0,1fr)] gap-4">
          {SAMPLES.map((item) => (
            <ContinuationColumn key={item.kind} item={item} />
          ))}
        </div>
      ) : isLoading || !data ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
          <ContinuationColumn item={data.card} />
          <ContinuationColumn item={data.resource} />
        </div>
      )}
    </motion.section>
  );
}
