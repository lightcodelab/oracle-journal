import { ReactNode, useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";

/**
 * Look-but-don't-touch wrapper for free accounts. Everything renders, but
 * interactive elements are blocked; hovering (or tapping) one shows a greyed
 * "Join to Access" box that leads to the membership section.
 * Elements inside a <header> or [data-preview-allow] stay usable (nav/menu).
 */
const INTERACTIVE =
  'a,button,[role="button"],[role="link"],[role="tab"],input,textarea,select,label,[tabindex]:not([tabindex="-1"]),.cursor-pointer';

type Box = { top: number; left: number; width: number; height: number };

// Links stay usable: the page they open shows the "join" screen itself.
let allowLinks = true;
const isAllowed = (el: Element) =>
  !!el.closest(allowLinks ? "header,[data-preview-allow],a[href]" : "header,[data-preview-allow]");

export const PreviewLock = ({ children, allowLinks: links = true }: { children: ReactNode; allowLinks?: boolean }) => {
  allowLinks = links;
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [box, setBox] = useState<Box | null>(null);

  const boxFor = useCallback((target: EventTarget | null): Box | null => {
    const container = ref.current;
    if (!container || !(target instanceof Element)) return null;
    if (target.closest("[data-preview-overlay]")) return undefined as unknown as Box;
    const el = target.closest(INTERACTIVE);
    if (!el || !container.contains(el) || isAllowed(el)) return null;
    const c = container.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, 150);
    const height = Math.max(r.height, 44);
    return {
      top: r.top - c.top - (height - r.height) / 2,
      left: r.left - c.left - (width - r.width) / 2,
      width,
      height,
    };
  }, []);

  const onMove = (e: React.MouseEvent) => {
    const next = boxFor(e.target);
    if (next === undefined) return; // over the overlay itself
    setBox(next);
  };

  const block = (e: React.SyntheticEvent) => {
    const t = e.target as Element;
    if (t.closest?.("[data-preview-overlay]") || isAllowed(t)) return;
    if (!t.closest?.(INTERACTIVE)) return;
    e.preventDefault();
    e.stopPropagation();
    const next = boxFor(t);
    if (next) setBox(next);
  };

  return (
    <div
      ref={ref}
      className="relative"
      onMouseMove={onMove}
      onMouseLeave={() => setBox(null)}
      onClickCapture={block}
      onSubmitCapture={block}
      onKeyDownCapture={(e) => {
        if (e.key === "Enter" || e.key === " ") block(e);
      }}
    >
      {children}
      {box && (
        <button
          type="button"
          data-preview-overlay
          onClick={() => navigate("/#membership")}
          onMouseLeave={() => setBox(null)}
          style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
          className="absolute z-40 flex items-center justify-center gap-2 rounded-lg border border-primary/40 bg-muted/85 backdrop-blur-sm text-sm font-medium text-foreground shadow-lg transition-opacity"
        >
          <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
          Join to Access
        </button>
      )}
    </div>
  );
};

export default PreviewLock;
