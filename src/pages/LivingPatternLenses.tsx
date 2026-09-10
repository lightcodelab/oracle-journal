import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import NavActions from "@/components/NavActions";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useMemberState } from "@/hooks/useMemberState";
import PatternRecordFlow from "@/components/temple/living/PatternRecordFlow";
import livingPatternBanner from "@/assets/living-pattern-banner.webp";

/**
 * /living-pattern — one guided Pattern Record.
 *
 * Pause → Perceive → Practise are one coherent practice, completed in sequence
 * before saving. Return is added later on the saved record. Private to its
 * owner; no Arrival or AreekeerA® Guide connection, no generative AI.
 */

const LivingPatternLenses = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { hasFullTempleAccess, loading: memberLoading } = useMemberState();

  if (authLoading || memberLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  if (!user || !hasFullTempleAccess) {
    return (
      <div className="min-h-screen bg-background">
        <header className="max-w-3xl mx-auto px-4 pt-4 pb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <Home className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="font-medium truncate">THE TEMPLE of Sustainment</span>
          </div>
          <NavActions />
        </header>
        <main className="max-w-xl mx-auto px-4 pt-16 pb-16 text-center">
          <h1 className="font-serif text-3xl text-foreground mb-4">
            Your Living Pattern is private
          </h1>
          <p className="text-muted-foreground mb-8">
            An active membership opens this practice. Return to the entrance to see what is
            currently open.
          </p>
          <Button asChild size="lg">
            <Link to="/">Return to the entrance</Link>
          </Button>
        </main>
      </div>
    );
  }

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
                One Pattern Record
              </h1>
              <p className="mt-3 font-sans text-sm sm:text-base text-on-image/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] leading-relaxed">
                Pause, Perceive, Practise — one moment followed all the way
                through, so you can see the whole chain that shapes a response.
              </p>
            </div>
          </div>
        </motion.div>

        <p className="text-center text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
          These questions belong together: what happened, what your mind made of
          it, and one small experiment you will try. Later, when life has
          answered back, you return to the same record and add what it actually
          showed you.
        </p>

        <PatternRecordFlow />

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
