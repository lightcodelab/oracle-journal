import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Home, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMemberState } from "@/hooks/useMemberState";
import NavActions from "@/components/NavActions";
import { Button } from "@/components/ui/button";
import PatternReturnForm from "@/components/temple/living/PatternReturnForm";
import {
  CAPACITY_OPTIONS,
  CONTINUE_IDENTITY_OPTIONS,
  FAMILIARITY_OPTIONS,
  PREDICTION_OUTCOME_OPTIONS,
  labelFor,
} from "@/components/temple/living/patternRecordContent";
import {
  getPatternRecord,
  type PatternRecordWithReturns,
} from "@/hooks/usePatternRecords";

/**
 * One saved Pattern Record and its Returns. Owner-only, read through the
 * owner-scoped RPCs. Her own words are shown back to her unchanged — nothing
 * here interprets, scores, or diagnoses.
 */

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const Field = ({ label, value }: { label: string; value: string | null }) => {
  if (!value || !value.trim()) return null;
  return (
    <div>
      <p className="text-[0.7rem] uppercase tracking-[0.15em] text-primary">{label}</p>
      <p className="mt-1 text-foreground leading-relaxed whitespace-pre-wrap break-words">
        {value}
      </p>
    </div>
  );
};

const PatternRecordDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { hasFullTempleAccess, loading: memberLoading } = useMemberState();
  const [data, setData] = useState<PatternRecordWithReturns | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReturn, setShowReturn] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getPatternRecord(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "That record could not be opened.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user && hasFullTempleAccess) void load();
  }, [user, hasFullTempleAccess, load]);

  if (authLoading || memberLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary font-serif text-xl">Opening a quiet place…</div>
      </div>
    );
  }

  if (!hasFullTempleAccess) {
    return (
      <div className="min-h-screen bg-background">
        <header className="max-w-3xl mx-auto px-4 pt-4 pb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <Home className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="font-medium truncate">THE TEMPLE of Sustainment</span>
          </div>
          <NavActions />
        </header>
        <main className="max-w-xl mx-auto px-4 pt-16 pb-16 text-center">
          <h1 className="font-serif text-3xl text-foreground mb-4">
            Your Living Pattern is private
          </h1>
          <Button asChild size="lg">
            <Link to="/">Return to the entrance</Link>
          </Button>
        </main>
      </div>
    );
  }

  const record = data?.record;

  return (
    <div className="min-h-screen bg-background">
      <header className="max-w-3xl mx-auto px-4 pt-4 pb-3 flex items-center justify-between gap-3">
        <Link
          to="/living-pattern/record"
          className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="font-medium truncate">Back to My Living Pattern</span>
        </Link>
        <NavActions />
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-16">
        {loading && (
          <p className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Opening your record…
          </p>
        )}
        {error && !loading && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {record && (
          <>
            <p className="text-[0.7rem] tracking-[0.2em] uppercase text-primary">
              Pattern Record
            </p>
            <h1 className="mt-1 font-serif text-2xl sm:text-3xl text-foreground leading-snug break-words">
              {record.moment_text}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{when(record.occurred_at)}</p>

            <section className="mt-8 rounded-xl border border-border/60 bg-card p-5 sm:p-6 space-y-5">
              <p className="font-serif text-xl text-foreground">Pause</p>
              {record.state_words.length > 0 && (
                <Field label="What was happening in you" value={record.state_words.join(", ")} />
              )}
              <Field label="In your body" value={record.body_text} />
              {record.body_cues.length > 0 && (
                <Field label="Body cues" value={record.body_cues.join(", ")} />
              )}
              <Field label="Capacity" value={labelFor(CAPACITY_OPTIONS, record.capacity)} />
            </section>

            <section className="mt-4 rounded-xl border border-border/60 bg-card p-5 sm:p-6 space-y-5">
              <p className="font-serif text-xl text-foreground">Perceive</p>
              <Field label="The meaning your mind made" value={record.meaning_text} />
              <Field label="What it predicted" value={record.prediction_text} />
              <Field label="Familiarity" value={labelFor(FAMILIARITY_OPTIONS, record.familiarity)} />
              <Field label="What it may have protected" value={record.protection_text} />
            </section>

            <section className="mt-4 rounded-xl border border-border/60 bg-card p-5 sm:p-6 space-y-5">
              <p className="font-serif text-xl text-foreground">Practise</p>
              <Field label="What you did" value={record.action_text} />
              <Field label="Who you were being" value={record.identity_text} />
              <Field
                label="Keep being her here"
                value={labelFor(CONTINUE_IDENTITY_OPTIONS, record.continue_identity)}
              />
              <Field label="Your experiment" value={record.experiment_text} />
            </section>

            <section className="mt-8" aria-label="Returns">
              <h2 className="font-serif text-2xl text-foreground">Evidence</h2>
              {data.returns.length === 0 ? (
                <p className="mt-2 text-muted-foreground leading-relaxed">
                  Nothing has come back yet. When life has had time to answer, you can add what it
                  actually showed you.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {data.returns.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl border border-border/60 bg-card p-4 sm:p-5 space-y-4"
                    >
                      <p className="text-sm text-muted-foreground">{when(r.recorded_at)}</p>
                      <Field label="What you tried" value={r.tried_text} />
                      <Field label="What happened" value={r.happened_text} />
                      <Field label="What you noticed" value={r.noticed_text} />
                      <Field
                        label="The prediction"
                        value={labelFor(PREDICTION_OUTCOME_OPTIONS, r.prediction_outcome)}
                      />
                      <Field label="Support" value={r.support_text} />
                      <Field label="Carrying forward" value={r.carry_forward_text} />
                    </li>
                  ))}
                </ul>
              )}

              {showReturn ? (
                <div className="mt-6">
                  <PatternReturnForm
                    recordId={record.id}
                    onSaved={() => {
                      setShowReturn(false);
                      void load();
                    }}
                  />
                </div>
              ) : (
                <Button className="mt-6" onClick={() => setShowReturn(true)}>
                  {data.returns.length === 0 ? "Return to this record" : "Add more evidence"}
                </Button>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default PatternRecordDetail;
