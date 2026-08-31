import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useLivingInvitations,
  type Invitation,
} from "@/hooks/useLivingInvitations";
import {
  formatDay,
  formatWhen,
  PHASE_LABELS,
  recordKindLabel,
  recordLink,
} from "@/components/temple/living/livingRecordDisplay";

/**
 * LP-F.1B — Transparent invitations.
 *
 * Each invitation states plainly why it appeared and shows the records that
 * produced it. Nothing is inferred, predicted, or model-generated, and nothing
 * comes from Arrival. She can hide any invitation.
 */

interface Props {
  enabled: boolean;
}

function heading(i: Invitation): string {
  switch (i.invitation_key) {
    case "support_repeated":
      return "Something you have returned to";
    case "pattern_rechosen":
      return "A Pattern you chose again";
    case "experiment_open":
      return "An experiment still open";
    case "pattern_links":
      return "A Pattern you keep connecting things to";
    case "theme_named":
      return "A theme you have been gathering";
    default:
      return "An invitation";
  }
}

function body(i: Invitation): string {
  switch (i.invitation_key) {
    case "support_repeated":
      return `You noted “${i.title ?? "this resource"}” ${i.n} times. If you would like to, you could read what you wrote each time and see whether it says something you want to keep.`;
    case "pattern_rechosen":
      return `You chose “${i.label ?? "this Pattern"}” again on ${formatDay(i.rechosen_at) ?? "a later day"}. Everything below was saved after that choosing.`;
    case "experiment_open":
      return `“${i.label ?? "This experiment"}” has a Try but no Return yet. That is not a failure — you can write a Return whenever it becomes true, or leave it open.`;
    case "pattern_links":
      return `You have connected ${i.n} of your records to “${i.label ?? "this Pattern"}”. Reading them together is one way to see what you already know.`;
    case "theme_named":
      return `You have gathered ${i.n} records under “${i.theme ?? "this theme"}”. Only you named this word, and only you decided what belongs to it.`;
    default:
      return "";
  }
}

function why(i: Invitation): string {
  switch (i.invitation_key) {
    case "support_repeated":
      return `Shown because you noted the same resource ${i.n} times.`;
    case "pattern_rechosen":
      return "Shown because you re-chose this Pattern, and there are records saved since.";
    case "experiment_open":
      return "Shown because this experiment has a Try and no Return.";
    case "pattern_links":
      return `Shown because ${i.n} of your records are linked to this Pattern.`;
    case "theme_named":
      return `Shown because you attached ${i.n} records to a theme you named.`;
    default:
      return "";
  }
}

const InvitationsPanel = ({ enabled }: Props) => {
  const { invitations, loading, error, hide, unhide, includeHidden, setIncludeHidden } =
    useLivingInvitations(enabled);

  if (!enabled) return null;

  return (
    <section className="mt-10 min-w-0" aria-label="Invitations">
      <h2 className="font-serif text-2xl text-foreground">Invitations</h2>
      <p className="mt-2 text-muted-foreground leading-relaxed">
        These appear only when something you saved repeats. They are simple counts of your own
        records, shown together with the records themselves. Nothing here is a conclusion about you,
        and nothing is analysed. You can hide any of them.
      </p>

      {loading && (
        <p className="mt-6 text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Looking only at what you saved…
        </p>
      )}
      {error && !loading && (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {error}
        </p>
      )}

      {!loading && !error && invitations.length === 0 && (
        <p className="mt-6 rounded-xl border border-border/60 bg-card p-5 text-muted-foreground">
          Nothing is repeating yet, so there is nothing to invite. This is a good and ordinary place
          to be.
        </p>
      )}

      {!loading && invitations.length > 0 && (
        <ul className="mt-6 space-y-4">
          {invitations.map((i) => (
            <li
              key={`${i.invitation_key}:${i.subject_key}`}
              className="rounded-xl border border-border/60 bg-card p-4 sm:p-5 min-w-0"
            >
              <p className="text-[0.7rem] uppercase tracking-[0.15em] text-primary">
                {heading(i)}
                {i.hidden ? " · hidden" : ""}
              </p>
              <p className="mt-2 text-foreground break-words leading-relaxed">{body(i)}</p>
              <p className="mt-2 text-sm text-muted-foreground break-words">{why(i)}</p>

              {i.records.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {i.records.map((r, idx) => {
                    const href = recordLink(r);
                    const when = formatWhen(r.occurred_at ?? r.created_at ?? null);
                    const label =
                      r.kind === "field_note"
                        ? PHASE_LABELS[r.label ?? ""] ?? "Note"
                        : r.label ?? null;
                    const text = `${recordKindLabel(r.kind)}${label ? ` — ${label}` : ""}${
                      when ? ` · ${when}` : ""
                    }`;
                    return (
                      <li key={`${r.kind}:${r.id}:${idx}`} className="text-sm break-words">
                        {href ? (
                          <Link to={href} className="text-foreground hover:text-primary">
                            {text}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{text}</span>
                        )}
                        {r.noticed_after && (
                          <span className="text-muted-foreground"> · “{r.noticed_after}”</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-4">
                {i.hidden ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void unhide(i.invitation_key, i.subject_key)}
                  >
                    Show this again
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void hide(i.invitation_key, i.subject_key)}
                  >
                    Hide this
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <Button variant="outline" size="sm" onClick={() => setIncludeHidden(!includeHidden)}>
          {includeHidden ? "Hide what you have set aside" : "Show what you have hidden"}
        </Button>
      </div>
    </section>
  );
};

export default InvitationsPanel;
