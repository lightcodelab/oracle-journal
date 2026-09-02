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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="relative w-full overflow-hidden rounded-lg mb-8"
        >
          <img
            src={livingPatternBanner.url}
            alt=""
            aria-hidden
            className="w-full h-[180px] sm:h-[240px] md:h-[300px] object-cover object-center"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/10 via-foreground/25 to-foreground/50 md:from-transparent md:via-foreground/10 md:to-foreground/55" />
          <div className="absolute inset-0 flex items-center justify-center px-6 md:px-10 md:justify-end">
            <div className="max-w-md text-center md:text-right">
              <p className="text-[0.65rem] sm:text-[0.7rem] tracking-[0.2em] uppercase text-on-image/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                Your Living Pattern
              </p>
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-on-image drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] mt-1">
                Pause, Perceive, Practice
              </h1>
              <p className="mt-3 font-sans text-sm sm:text-base text-on-image/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] leading-relaxed">
                A private Conservatory laboratory for noticing what is true,
                trying one small different thing, and gathering evidence from
                what life shows you next.
              </p>
            </div>
          </div>
        </motion.div>

        <p className="text-center text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-6">
          These are not steps you must complete in sequence; choose to log
          whatever is true in the moment.
        </p>

        <Tabs
          value={lens}
          onValueChange={(v) => setParams({ lens: v }, { replace: true })}
          className="mt-6"
        >
          <TabsList className="w-full grid grid-cols-3 bg-primary text-primary-foreground">
            <TabsTrigger value="pause" className="text-primary-foreground/90 data-[state=active]:bg-primary-foreground data-[state=active]:text-primary">
              Pause
            </TabsTrigger>
            <TabsTrigger value="perceive" className="text-primary-foreground/90 data-[state=active]:bg-primary-foreground data-[state=active]:text-primary">
              Perceive
            </TabsTrigger>
            <TabsTrigger value="practice" className="text-primary-foreground/90 data-[state=active]:bg-primary-foreground data-[state=active]:text-primary">
              Practice
            </TabsTrigger>
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
