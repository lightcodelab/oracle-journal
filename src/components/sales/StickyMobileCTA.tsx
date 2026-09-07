import { ReactNode } from "react";

interface StickyMobileCTAProps {
  children: ReactNode;
}

export function StickyMobileCTA({ children }: StickyMobileCTAProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur md:hidden">
      {children}
    </div>
  );
}
