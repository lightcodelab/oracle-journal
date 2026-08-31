import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

export function GuideNextStepCard() {
  return (
    <section aria-labelledby="guide-next-step-heading" className="mb-12">
      <div className="rounded-lg border border-border/50 bg-card/50 p-8">
        <h3
          id="guide-next-step-heading"
          className="font-serif text-2xl text-foreground mb-2 font-bold"
        >
          Not sure what you need today?
        </h3>
        <p className="text-sm text-muted-foreground mb-5">
          Tell The AreekeerA® Guide what life feels like right now, and it will
          help you choose your next experiment — what to try, in what order, and
          why it may meet this moment.
        </p>
        <Button asChild>
          <Link to="/devotion/areekeera" className="inline-flex items-center gap-2">
            <Compass className="h-4 w-4" aria-hidden />
            Find my next step
          </Link>
        </Button>
      </div>
    </section>
  );
}
