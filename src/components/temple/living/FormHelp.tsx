import { EXAMPLE_DISCLAIMER, GUIDE_OPTION_NOTE, GUIDE_SCRIPTS, type PromptHelp } from "./orientationContent";

/**
 * LP-O.2 — contextual, expandable teaching help.
 *
 * Purely presentational. Nothing here reads or writes member data, prefills a
 * field, infers a response, ranks anything, or blocks a save. Native
 * <details>/<summary> keeps keyboard focus visible and screen-reader friendly.
 */

function Disclosure({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group min-w-0 rounded-md border border-border/60 bg-background/40 open:bg-background/60">
      <summary className="cursor-pointer list-none rounded-md px-2.5 py-1.5 text-xs text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        {label}
      </summary>
      <div className="px-2.5 pb-2.5 pt-1 text-xs leading-relaxed text-muted-foreground break-words">
        {children}
      </div>
    </details>
  );
}

export function FormHelp({ help }: { help: PromptHelp | undefined }) {
  if (!help) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {help.meaning && (
        <Disclosure label="What does this mean?">
          <p>{help.meaning}</p>
        </Disclosure>
      )}
      {help.example && (
        <Disclosure label="Show me an example">
          <p className="italic text-foreground">{help.example}</p>
          <p className="mt-1.5 text-[0.7rem] text-muted-foreground">{EXAMPLE_DISCLAIMER}</p>
        </Disclosure>
      )}
      {help.enough && (
        <Disclosure label="What is enough for today?">
          <p>{help.enough}</p>
        </Disclosure>
      )}
    </div>
  );
}

/** Persistent, calm reminder shown beneath a three-part movement. */
export function MovementNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 max-w-2xl text-xs leading-relaxed text-muted-foreground">{children}</p>
  );
}

/** The approved Guide script library, rendered wherever a Guide is shown. */
export function GuideScriptPanel({ guideKey }: { guideKey: string | null | undefined }) {
  const script = guideKey ? GUIDE_SCRIPTS[guideKey] : undefined;
  if (!script) return null;
  return (
    <div className="space-y-2 border-t border-border/50 pt-3 text-sm">
      <p className="text-muted-foreground">
        <span className="text-primary">For — </span>
        {script.forWhen}
      </p>
      {script.tryThis && (
        <p className="text-foreground">
          <span className="text-primary">Try — </span>
          {script.tryThis}
        </p>
      )}
      {script.wordsToBorrow?.length ? (
        <div className="space-y-1.5">
          <p className="text-primary">Words to borrow</p>
          {script.wordsToBorrow.map((w) => (
            <p
              key={w}
              className="rounded-md border border-border/60 p-3 italic text-foreground break-words"
            >
              “{w}”
            </p>
          ))}
        </div>
      ) : null}
      <p className="text-muted-foreground">
        <span className="text-primary">Notice — </span>
        {script.notice}
      </p>
      {script.boundary && (
        <p className="text-muted-foreground">
          <span className="text-primary">A boundary — </span>
          {script.boundary}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{GUIDE_OPTION_NOTE}</p>
    </div>
  );
}
