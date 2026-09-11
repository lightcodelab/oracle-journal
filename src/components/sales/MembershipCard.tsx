import { ReactNode } from "react";

interface MembershipCardProps {
  label: string;
  price: ReactNode;
  cadence?: string;
  savings?: ReactNode;
  highlight?: boolean;
  lines: string[];
  cta?: ReactNode;
  footnote?: string;
}

export function MembershipCard({
  label,
  price,
  cadence = "per month",
  savings,
  highlight = false,
  lines,
  cta,
  footnote,
}: MembershipCardProps) {
  return (
    <div
      className={`flex flex-col rounded-2xl border p-7 md:p-8 ${
        highlight
          ? "border-primary/50 bg-card/70"
          : "border-border/60 bg-card/40"
      }`}
    >
      <div className="flex-1">
        <p className="text-[0.68rem] uppercase tracking-[0.28em] text-primary">
          {label}
        </p>
        <p className="mt-4 font-serif text-3xl text-foreground sm:text-4xl">
          {price}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{cadence}</p>
        {savings && (
          <p className="mt-2 text-sm font-medium text-primary">{savings}</p>
        )}
        <div className="my-6 h-px w-12 bg-primary/50" aria-hidden />
        <ul className="space-y-3 text-sm leading-relaxed text-foreground/85">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      {cta && <div className="mt-auto pt-8">{cta}</div>}
      {footnote && (
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          {footnote}
        </p>
      )}
    </div>
  );
}
