import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLivingActivePatterns } from "@/hooks/useLivingActivePatterns";
import {
  formatDay,
  formatWhen,
  recordKindLabel,
  recordLink,
} from "@/components/temple/living/livingRecordDisplay";

/**
 * LP-F.1B — Active Patterns.
 *
 * A quiet gathering of what she has already attached to each Pattern of
 * Choosing. Counts are totals of her own records, not scores or progress.
 */

interface Props {
  enabled: boolean;
  lensLinks: React.ReactNode;
}

const ActivePatternsPanel = ({ enabled, lensLinks }: Props) => {
  const { patterns, loading, error, includeRetired, setIncludeRetired } =
    useLivingActivePatterns(enabled);

  return (
    <section className="mt-8 min-w-0" aria-label="Active Patterns">
      <p className="text-muted-foreground leading-relaxed">
        Each Pattern you have named, with the evidence, links, experiments, and resources you chose
        to gather around it. These are counts of your own records — nothing here is a score, a
        streak, or a judgement.
      </p>

      <div className="mt-4">
        <Button variant="outline" size="sm" onClick={() => setIncludeRetired(!includeRetired)}>
          {includeRetired ? "Hide set-down Patterns" : "Also show Patterns you have set down"}
        </Button>
      </div>

      {loading && (
        <p className="mt-6 text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Opening your Patterns…
        </p>
      )}
      {error && !loading && (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {error}
        </p>
      )}

      {!loading && !error && patterns.length === 0 && (
        <div className="mt-6 rounded-xl border border-border/60 bg-card p-5 sm:p-6">
          <p className="text-muted-foreground">
            You have not named a Pattern of Choosing yet. Practice is where one can be named,
            whenever you would like to.
          </p>
          {lensLinks}
        </div>
      )}

      {!loading && patterns.length > 0 && (
        <ul className="mt-6 space-y-4">
          {patterns.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-border/60 bg-card p-4 sm:p-5 min-w-0"
            >
              <Link
                to={`/living-pattern/patterns/${p.id}`}
                className="font-serif text-lg text-foreground break-words hover:text-primary transition-colors"
              >
                {p.label}
              </Link>
              {p.commitment && (
                <p className="mt-1 text-sm text-muted-foreground break-words">{p.commitment}</p>
              )}
              <p className="mt-1 text-sm text-muted-foreground break-words">
                Chosen {formatDay(p.chosen_at)}
                {p.rechosen_at ? ` · re-chosen ${formatDay(p.rechosen_at)}` : ""}
                {p.retired_at ? ` · set down ${formatDay(p.retired_at)}` : ""}
              </p>

              <p className="mt-3 text-sm text-muted-foreground break-words">
                {p.evidence_count} evidence · {p.linked_count} linked records ·{" "}
                {p.experiment_count} experiments · {p.support_count} resources noted
              </p>

              {[
                { title: "Evidence you gathered", rows: p.evidence },
                { title: "Records you linked", rows: p.links },
                { title: "Experiments that began here", rows: p.experiments },
              ]
                .filter((g) => g.rows.length > 0)
                .map((g) => (
                  <div key={g.title} className="mt-4">
                    <p className="text-[0.7rem] uppercase tracking-[0.15em] text-primary">
                      {g.title}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {g.rows.map((r) => {
                        const href = recordLink(r);
                        const when = formatWhen(r.occurred_at ?? r.created_at ?? null);
                        const text = `${recordKindLabel(r.kind)}${r.label ? ` — ${r.label}` : ""}${
                          when ? ` · ${when}` : ""
                        }`;
                        return (
                          <li key={`${r.kind}:${r.id}`} className="text-sm break-words">
                            {href ? (
                              <Link to={href} className="text-foreground hover:text-primary">
                                {text}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">{text}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}

              {p.supports.length > 0 && (
                <div className="mt-4">
                  <p className="text-[0.7rem] uppercase tracking-[0.15em] text-primary">
                    Resources you noted here
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {p.supports.map((s) => (
                      <li key={s.id} className="text-sm text-muted-foreground break-words">
                        {s.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default ActivePatternsPanel;
