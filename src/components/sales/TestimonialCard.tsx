export interface Testimonial {
  quote: string;
  attribution?: string;
}

interface TestimonialCardProps {
  testimonial: Testimonial;
  className?: string;
}

export function TestimonialCard({
  testimonial,
  className,
}: TestimonialCardProps) {
  return (
    <figure
      className={`rounded-2xl border border-border/60 bg-card/50 p-7 ${className ?? ""}`}
    >
      <blockquote className="font-serif text-lg leading-relaxed text-foreground/90">
        {testimonial.quote}
      </blockquote>
      {testimonial.attribution && (
        <figcaption className="mt-5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {testimonial.attribution}
        </figcaption>
      )}
    </figure>
  );
}
