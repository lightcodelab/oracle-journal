import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import NavActions from "@/components/NavActions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LivingPatternPause from "./LivingPatternPause";
import LivingPatternPresence from "./LivingPatternPresence";
import LivingPatternPractice from "./LivingPatternPractice";
import livingPatternBanner from "@/assets/living-pattern-banner.png.asset.json";

/**
 * One private page holding all three Living Pattern lenses as tabs:
 * Pause, Perceive and Practice. Presentation only — each lens keeps its
 * own private form, saving and access behaviour.
 */

const LENSES = ["pause", "perceive", "practice"] as const;
type Lens = (typeof LENSES)[number];

const isLens = (v: string | null): v is Lens =>
  !!v && (LENSES as readonly string[]).includes(v);

const LivingPatternLenses = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const raw = params.get("lens");
  const lens: Lens = isLens(raw) ? raw : "pause";

  useEffect(() => {
    if (raw === "presence") setParams({ lens: "perceive" }, { replace: true });
  }, [raw, setParams]);

  return (
    <div className="min-h-screen bg-background">
      <header className="max-w-3xl mx-auto px-4 pt-4 pb-3 flex items-center justify-between gap-3">
        <Link
          to="/temple"
          className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="font-medium truncate">Back to Home</span>
        </Link>
        <NavActions />
      </header>

      <div className="max-w-3xl mx-auto px-4 pb-16">
        <p className="text-[0.7rem] tracking-[0.2em] uppercase text-primary">
          Your Living Pattern
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground mt-1">
          Pause, Perceive, Practice
        </h1>
        <p className="mt-3 text-sm sm:text-base leading-relaxed text-muted-foreground max-w-2xl">
          Three lenses, one private place. They are not steps and not a
          sequence — open whichever one meets the moment you are in.
        </p>

        <Tabs
          value={lens}
          onValueChange={(v) => setParams({ lens: v }, { replace: true })}
          className="mt-6"
        >
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="pause">Pause</TabsTrigger>
            <TabsTrigger value="perceive">Perceive</TabsTrigger>
            <TabsTrigger value="practice">Practice</TabsTrigger>
          </TabsList>

          <TabsContent value="pause" className="mt-6">
            <LivingPatternPause embedded />
          </TabsContent>
          <TabsContent value="perceive" className="mt-6">
            <LivingPatternPresence embedded />
          </TabsContent>
          <TabsContent value="practice" className="mt-6">
            <LivingPatternPractice embedded />
          </TabsContent>
        </Tabs>

        <p className="mt-10 text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => navigate("/living-pattern/record")}
            className="text-primary underline decoration-primary/40 underline-offset-4 hover:text-foreground"
          >
            Open My Living Pattern
          </button>{" "}
          to revisit everything you have recorded.
        </p>
      </div>
    </div>
  );
};

export default LivingPatternLenses;
