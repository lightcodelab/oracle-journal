import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const SESSION_KEY = "temple_letter_opened";

/**
 * A sealed letter that cracks open before the member lands in The Temple.
 * Plays once per browser session for signed-in members.
 */
export default function LetterOpening() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    if (pathname.startsWith("/admin")) return;
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(SESSION_KEY)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.sessionStorage.setItem(SESSION_KEY, "1");
      return;
    }
    window.sessionStorage.setItem(SESSION_KEY, "1");
    setPlaying(true);
    const timer = window.setTimeout(() => setPlaying(false), 3800);
    return () => window.clearTimeout(timer);
  }, [loading, user, pathname]);

  return (
    <AnimatePresence>
      {playing && (
        <motion.div
          key="letter"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          aria-hidden="true"
        >
          <motion.div
            className="relative w-[min(88vw,460px)] aspect-[3/2]"
            initial={{ scale: 0.86, opacity: 0, y: 18 }}
            animate={{
              scale: [0.86, 1, 1, 1.9],
              opacity: [0, 1, 1, 0],
              y: [18, 0, 0, -10],
            }}
            transition={{ duration: 3.8, times: [0, 0.16, 0.7, 1], ease: "easeInOut" }}
          >
            {/* envelope body */}
            <div className="absolute inset-0 rounded-sm bg-secondary border border-border shadow-glow" />

            {/* letter sliding out */}
            <motion.div
              className="absolute left-[7%] right-[7%] top-[10%] bottom-[16%] rounded-sm bg-card border border-border flex items-center justify-center"
              initial={{ y: "22%", opacity: 0 }}
              animate={{ y: ["22%", "22%", "-14%"], opacity: [0, 0, 1] }}
              transition={{ duration: 3.8, times: [0, 0.5, 0.82], ease: "easeOut" }}
            >
              <span className="font-serif text-xl sm:text-2xl text-foreground/80 tracking-wide">
                Enter The Temple
              </span>
            </motion.div>

            {/* envelope flap */}
            <motion.div
              className="absolute inset-x-0 top-0 h-1/2 origin-top"
              style={{ transformStyle: "preserve-3d" }}
              initial={{ rotateX: 0 }}
              animate={{ rotateX: [0, 0, -168] }}
              transition={{ duration: 3.8, times: [0, 0.44, 0.72], ease: "easeInOut" }}
            >
              <div
                className="w-full h-full bg-accent border border-border"
                style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
              />
            </motion.div>

            {/* wax seal */}
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 border-destructive/60 bg-destructive shadow-glow"
              initial={{ scale: 0, rotate: -18 }}
              animate={{ scale: [0, 1, 1, 0.9, 0], rotate: [-18, 0, 0, 6, 14], opacity: [0, 1, 1, 1, 0] }}
              transition={{ duration: 3.8, times: [0, 0.18, 0.4, 0.46, 0.56], ease: "easeOut" }}
            >
              <span className="font-serif text-2xl text-destructive-foreground">T</span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}