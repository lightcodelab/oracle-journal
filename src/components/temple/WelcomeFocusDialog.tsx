import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FOCUS_OPTIONS, TempleFocus } from "@/lib/templeFocus";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  initial?: TempleFocus | null;
  onChoose: (focus: TempleFocus | null) => Promise<void> | void;
  onClose: () => void;
}

export function WelcomeFocusDialog({ open, initial, onChoose, onClose }: Props) {
  const [selected, setSelected] = useState<TempleFocus | null>(initial ?? null);
  const [saving, setSaving] = useState(false);

  const submit = async (value: TempleFocus | null) => {
    setSaving(true);
    try {
      await onChoose(value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Welcome to THE TEMPLE</DialogTitle>
          <DialogDescription>
            What are you primarily here for? We'll bring that Door forward for you. Every Door stays open.
          </DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="Your focus" className="grid gap-2 mt-2">
          {FOCUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected === o.value}
              onClick={() => setSelected(o.value)}
              className={cn(
                "text-left rounded-lg border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                selected === o.value ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/50",
              )}
            >
              <span className="block text-foreground">{o.label}</span>
              <span className="block text-xs uppercase tracking-wider text-primary-strong mt-0.5">{o.door}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <Button variant="ghost" disabled={saving} onClick={() => submit(null)}>
            Skip for now
          </Button>
          <Button disabled={saving || !selected} onClick={() => submit(selected)}>
            Enter THE TEMPLE
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
