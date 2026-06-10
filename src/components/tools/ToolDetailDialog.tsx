import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  useTransformationTool,
  useToolEntries,
  useToolFields,
  useSaveEntry,
  computeScore,
} from "@/hooks/useTransformationTools";
import { ToolTrendChart } from "@/components/tools/ToolTrendChart";
import { DynamicFieldRenderer } from "@/components/tools/DynamicFieldRenderer";
import { useToast } from "@/hooks/use-toast";

interface ToolDetailDialogProps {
  slug: string | null;
  open: boolean;
  onClose: () => void;
}

export const ToolDetailDialog = ({ slug, open, onClose }: ToolDetailDialogProps) => {
  const { user } = useAuth();
  const { data: tool, isLoading } = useTransformationTool(slug ?? undefined);
  const { data: entries = [] } = useToolEntries(tool?.id, user?.id);
  const { data: fields = [] } = useToolFields(tool?.id);
  const save = useSaveEntry();
  const { toast } = useToast();
  const [mode, setMode] = useState<"detail" | "reflection">("detail");
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!open) {
      setMode("detail");
      setAnswers({});
    }
  }, [open, slug]);

  useEffect(() => {
    if (mode !== "reflection") return;
    const defaults: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.field_type === "slider") defaults[f.key] = f.min ?? 0;
      if (f.field_type === "multiselect") defaults[f.key] = [];
    });
    setAnswers((prev) => ({ ...defaults, ...prev }));
  }, [fields, mode]);

  const handleSave = async () => {
    if (!tool) return;
    const missingRequired = fields.filter(
      (f) =>
        f.is_required &&
        (answers[f.key] === undefined ||
          answers[f.key] === "" ||
          (Array.isArray(answers[f.key]) && !answers[f.key].length)),
    );
    if (missingRequired.length) {
      toast({
        title: "A few things still need your attention",
        description: missingRequired.map((f) => f.label).join(" · "),
        variant: "destructive",
      });
      return;
    }
    const scores = computeScore(tool.score_formula, answers, fields);
    try {
      await save.mutateAsync({ tool_id: tool.id, answers_json: answers, scores_json: scores });
      toast({ title: "Saved", description: "Your reflection is held." });
      setMode("detail");
      setAnswers({});
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            ← Back to the course
          </Button>
          <hr className="border-border" />
        </div>

        {isLoading || !tool ? (
          <div className="p-10 text-center text-muted-foreground">Loading…</div>
        ) : mode === "reflection" ? (
          <div className="space-y-6 pt-2">
            <div className="text-center space-y-2">
              <h1 className="font-serif text-3xl">{tool.title}</h1>
              {tool.intro_microcopy && (
                <p className="italic text-muted-foreground">{tool.intro_microcopy}</p>
              )}
            </div>
            <div className="space-y-5">
              {fields.map((f) => (
                <Card key={f.id} className="bg-card/60">
                  <CardContent className="pt-6">
                    <DynamicFieldRenderer
                      field={f}
                      value={answers[f.key]}
                      onChange={(v) => setAnswers((a) => ({ ...a, [f.key]: v }))}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" onClick={() => setMode("detail")}>Cancel</Button>
              <Button onClick={handleSave} disabled={save.isPending} size="lg">
                {save.isPending ? "Saving…" : tool.save_button_label}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 pt-2">
            <div className="space-y-3">
              <h1 className="font-serif text-3xl md:text-4xl">{tool.title}</h1>
              {tool.short_description && (
                <p className="text-lg text-foreground/80">{tool.short_description}</p>
              )}
              {tool.when_to_use && (
                <p className="text-sm italic text-muted-foreground">
                  <span className="font-medium not-italic">When to use this:</span> {tool.when_to_use}
                </p>
              )}
              <Button size="lg" onClick={() => setMode("reflection")}>
                Start Reflection
              </Button>
            </div>

            {entries.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="font-serif">Your trend</CardTitle></CardHeader>
                <CardContent><ToolTrendChart tool={tool} entries={entries} /></CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="font-serif">Past entries</CardTitle></CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No entries yet. Begin when you are ready.</p>
                ) : (
                  <div className="space-y-3">
                    {entries.map((e) => (
                      <div key={e.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                        <div>
                          <p className="text-sm">{new Date(e.created_at).toLocaleString()}</p>
                          {typeof e.scores_json?.primary === "number" && (
                            <p className="text-xs text-muted-foreground">Score: {Number(e.scores_json.primary).toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};