import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  CAPACITY_OPTIONS,
  CONTINUE_IDENTITY_OPTIONS,
  FAMILIARITY_OPTIONS,
  PREDICTION_OUTCOME_OPTIONS,
  labelFor,
} from "./patternRecordContent";
import { useCommonThemes, type ThemeCount } from "@/hooks/usePatternRecords";

/**
 * Common Themes — counts of her own answers, nothing more.
 *
 * Every number here is a plain count of rows she wrote herself, and every count
 * opens the exact records behind it. No clustering, no inference, no scoring,
 * no model, and no claim about what any of it means.
 */

type Group = {
  key: string;
  title: string;
  note: string;
  items: ThemeCount[];
  label?: (code: string) => string;
};

const Row = ({
  item,
  label,
}: {
  item: ThemeCount;
  label?: (code: string) => string;
}) => {
  const [open, setOpen] = useState(false);
  const text = label ? label(item.value) : item.value;
  const ids = Array.from(new Set(item.record_ids));
  return (
    <li className="rounded-lg border border-border/60 bg-card/70 p-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-baseline justify-between gap-3 text-left"
      >
        <span className="text-foreground break-words">{text}</span>
        <span className="shrink-0 text-sm text-muted-foreground">
          {item.count} {item.count === 1 ? "record" : "records"}
        </span>
      </button>
      {open && (
        <ul className="mt-3 space-y-1.5 border-t border-border/50 pt-3">
          {ids.map((id, i) => (
            <li key={id}>
              <Link
                to={`/living-pattern/records/${id}`}
                className="text-sm text-primary underline decoration-primary/40 underline-offset-4 hover:text-foreground"
              >
                Open record {i + 1}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

const CommonThemesPanel = () => {
  const { themes, loading } = useCommonThemes();

  if (loading) {
    return (
      <p className="mt-8 text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Counting only what you wrote…
      </p>
    );
  }

  if (!themes) {
    return (
      <p className="mt-8 text-muted-foreground">
        There is nothing to count yet. Themes appear once you have saved a few Pattern Records.
      </p>
    );
  }

  const groups: Group[] = [
    {
      key: "state_words",
      title: "Words you use for your state",
      note: "Counted exactly as you wrote or chose them.",
      items: themes.state_words,
    },
    {
      key: "body_cues",
      title: "Where your body speaks",
      note: "The cues you have named most often.",
      items: themes.body_cues,
    },
    {
      key: "capacity",
      title: "Capacity in these moments",
      note: "Context, not a measurement of you.",
      items: themes.capacity,
      label: (c) => labelFor(CAPACITY_OPTIONS, c),
    },
    {
      key: "familiarity",
      title: "How familiar these moments felt",
      note: "Your own answer, counted.",
      items: themes.familiarity,
      label: (c) => labelFor(FAMILIARITY_OPTIONS, c),
    },
    {
      key: "continue_identity",
      title: "Whether you wanted to keep being her",
      note: "Your own answer, counted.",
      items: themes.continue_identity,
      label: (c) => labelFor(CONTINUE_IDENTITY_OPTIONS, c),
    },
    {
      key: "prediction_outcome",
      title: "What happened to your predictions",
      note: "Only from Returns you have written.",
      items: themes.prediction_outcome,
      label: (c) => labelFor(PREDICTION_OUTCOME_OPTIONS, c),
    },
    {
      key: "repeated_meanings",
      title: "Meanings you have written more than once",
      note: "Shown only when you typed the same words again — never grouped by guesswork.",
      items: themes.repeated_meanings,
    },
  ].filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return (
      <p className="mt-8 text-muted-foreground">
        There is nothing to count yet. Themes appear once you have saved a few Pattern Records.
      </p>
    );
  }

  return (
    <section className="mt-8 space-y-8" aria-label="Common Themes">
      <p className="text-sm text-muted-foreground leading-relaxed">
        These are counts of your own answers. Nothing here is interpreted for you, and every count
        opens the records it came from.
      </p>
      {groups.map((g) => (
        <div key={g.key}>
          <h3 className="font-serif text-xl text-foreground">{g.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{g.note}</p>
          <ul className="mt-3 space-y-2">
            {g.items.map((item) => (
              <Row key={`${g.key}:${item.value}`} item={item} label={g.label} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
};

export default CommonThemesPanel;
