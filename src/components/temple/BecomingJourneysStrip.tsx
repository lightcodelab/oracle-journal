import { Link } from "react-router-dom";
import { BecomingCoursesSection } from "@/components/becoming/BecomingCoursesSection";

export function BecomingJourneysStrip() {
  return (
    <section aria-labelledby="becoming-journeys-heading" className="mb-12">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 id="becoming-journeys-heading" className="font-serif text-2xl text-foreground">
          Your Becoming journeys
        </h2>
        <Link to="/becoming" className="text-sm text-primary hover:underline">
          Open the Door of Becoming for more →
        </Link>
      </div>
      <BecomingCoursesSection limit={3} />
    </section>
  );
}
