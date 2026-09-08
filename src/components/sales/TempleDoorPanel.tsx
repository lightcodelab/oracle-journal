import { ReactNode } from "react";

interface TempleDoorPanelProps {
  eyebrow?: string;
  title: ReactNode;
  lead?: string;
  body: string;
  note?: string;
  image: string;
  imageAlt: string;
  steps?: string[];
  reverse?: boolean;
  contain?: boolean;
}

export function TempleDoorPanel({
  eyebrow,
  title,
  lead,
  body,
  note,
  image,
  imageAlt,
  steps,
  reverse = false,
  contain = false,
}: TempleDoorPanelProps) {
  return (
    <article className="grid items-center gap-7 md:grid-cols-2 md:gap-14">
      <div className={reverse ? "md:order-2" : undefined}>
        <img
          src={image}
          alt={imageAlt}
          loading="lazy"
          className="aspect-[4/3] w-full rounded-2xl border border-border/50 object-cover"
        />
      </div>
      <div className={reverse ? "md:order-1" : undefined}>
        {eyebrow && (
          <p className="mb-3 text-[0.68rem] uppercase tracking-[0.28em] text-primary">
            {eyebrow}
          </p>
        )}
        <h3 className="font-serif text-2xl leading-tight text-foreground sm:text-[1.8rem]">
          {title}
        </h3>
        {lead && (
          <p className="mt-4 font-serif text-lg italic text-foreground/90">
            {lead}
          </p>
        )}
        <p className="mt-4 text-base leading-relaxed text-foreground/85">
          {body}
        </p>
        {steps && (
          <ul className="mt-6 flex flex-wrap gap-2">
            {steps.map((step) => (
              <li
                key={step}
                className="rounded-full border border-primary/40 px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-primary"
              >
                {step}
              </li>
            ))}
          </ul>
        )}
        {note && (
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            {note}
          </p>
        )}
      </div>
    </article>
  );
}
