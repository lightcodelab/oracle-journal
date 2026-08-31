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
    <Link to={href} className="block group h-full">
      <Card className="h-full bg-card border-border/60 group-hover:border-primary/40 transition-colors">
        <CardContent className="p-5 flex items-start gap-4 h-full">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {item.label}
            </p>
            <p className="font-serif text-lg text-foreground truncate">
              {item.available ? item.title : item.emptyHint}
            </p>
          </div>
          <ArrowRight
            className="h-5 w-5 text-primary flex-shrink-0 mt-0.5"
            aria-hidden
          />
        </CardContent>
      </Card>
    </Link>
  );
}

export function ContinueJourney({ enabled }: ContinueJourneyProps) {
  const { data, isLoading } = useHomeContinuation(enabled);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      aria-labelledby="continue-heading"
      className="mb-10"
    >
      <h2
        id="continue-heading"
        className="font-serif text-2xl text-foreground mb-3"
      >
        Continue your journey
      </h2>

      {isLoading || !data ? (
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(22rem,1fr))]">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(22rem,1fr))]">
          <ContinuationColumn item={data.card} />
          <ContinuationColumn item={data.lesson} />
          <ContinuationColumn item={data.resource} />
        </div>
      )}
    </motion.section>
  );
}
