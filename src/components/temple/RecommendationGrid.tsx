import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import type { HomeRecommendation } from "@/hooks/useHomeRecommendations";

interface Props {
  items: HomeRecommendation[];
}

export function RecommendationGrid({ items }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((r) => (
        <Link
          key={r.id}
          to={r.resolved_href!}
          className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        >
          <Card className="h-full overflow-hidden bg-card/70 border-border/60 group-hover:border-primary/40 transition-colors">
            {r.image_url && (
              <img
                src={r.image_url}
                alt=""
                aria-hidden
                className="w-full h-40 object-cover"
                loading="lazy"
              />
            )}
            <CardContent className="p-4">
              <h3 className="font-serif text-lg text-foreground">{r.title}</h3>
              {r.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                  {r.description}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}