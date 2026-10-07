import type { SVGProps } from "react";

/** Temple archway mark — matches the favicon and app icon. */
export function ArchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 20V10a7 7 0 0 1 14 0v10" />
      <path d="M9 20v-8.5a3 3 0 0 1 6 0V20" />
      <path d="M3.5 20h17" />
    </svg>
  );
}
