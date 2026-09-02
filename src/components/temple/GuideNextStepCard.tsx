import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";
import guideLogoAsset from "@/assets/areekeera-guide-logo-8.png.asset.json";

export function GuideNextStepCard() {
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-8 h-full flex flex-row items-start gap-6">
      <div className="flex-1 flex flex-col">
        <h3
          id="guide-next-step-heading"
          className="font-serif text-2xl text-foreground mb-2 font-bold"
        >
          Not sure what you need today?
        </h3>
        <p className="text-sm text-muted-foreground mb-5">
          Tell <strong>The AreekeerA® Guide</strong> what life feels like right now, and it will
           help you choose your next experiment — what resources to try, in what order, and
           why it may meet the moment you are in.
        </p>
        <div>
          <Button asChild>
            <Link to="/devotion/areekeera" className="inline-flex items-center gap-2">
              <Compass className="h-4 w-4" aria-hidden />
              Find my next step
            </Link>
          </Button>
        </div>
      </div>
      <div className="hidden lg:flex items-start justify-center shrink-0 pt-1">
        <img
          src={guideLogoAsset.url}
          alt="AreekeerA Guide"
          className="h-auto w-auto max-w-[100px] md:max-w-[140px] object-contain"
        />
      </div>
    </div>
  );
}
