import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTransformationTool, useToolEntries } from "@/hooks/useTransformationTools";
import { ToolTrendChart } from "@/components/tools/ToolTrendChart";

interface ToolDetailDialogProps {
  slug: string | null;
  open: boolean;
  onClose: () => void;
}

export const ToolDetailDialog = ({ slug, open, onClose }: ToolDetailDialogProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tool, isLoading } = useTransformationTool(slug ?? undefined);
  const { data: entries = [] } = useToolEntries(tool?.id, user?.id);

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
              <Button size="lg" onClick={() => navigate(`/tools/${tool.slug}/new`)}>
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