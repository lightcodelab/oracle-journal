import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHomeContinuation } from "@/hooks/useHomeContinuation";

interface ContinueJourneyProps {
  enabled: boolean;
}

export function ContinueJourney({ enabled }: ContinueJourneyProps) {
  const { data, isLoading, isError } = useHomeContinuation(enabled);

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

      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : isError || !data || data.kind === "none" ? (
        <Card className="bg-card/60 border-border/60">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-serif text-lg text-foreground">
                Choose a place to begin
              </p>
              <p className="text-sm text-muted-foreground">
                The Temple is yours to explore in any order.
              </p>
            </div>
            <a
              href="#begin-practice"
              className="inline-flex items-center gap-1.5 text-primary text-sm font-medium hover:underline"
            >
              Begin a practice <ArrowRight className="h-4 w-4" />
            </a>
          </CardContent>
        </Card>
      ) : (
        <Link to={data.href} className="block group">
          <Card className="bg-card border-border/60 group-hover:border-primary/40 transition-colors">
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {data.label}
                  </p>
                  <p className="font-serif text-lg text-foreground truncate">
                    {data.title}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-primary flex-shrink-0" aria-hidden />
            </CardContent>
          </Card>
        </Link>
      )}
    </motion.section>
  );
}