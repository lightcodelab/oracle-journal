import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  useTransformationTool, useToolFields, useSaveEntry, computeScore,
} from "@/hooks/useTransformationTools";
import { DynamicFieldRenderer } from "@/components/tools/DynamicFieldRenderer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import ProfileDropdown from "@/components/ProfileDropdown";
import { useToast } from "@/hooks/use-toast";

const ToolReflection = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: tool } = useTransformationTool(slug);
  const { data: fields = [] } = useToolFields(tool?.id);
  const save = useSaveEntry();
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    const defaults: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.field_type === "slider") defaults[f.key] = f.min ?? 0;
      if (f.field_type === "multiselect") defaults[f.key] = [];
    });
    setAnswers((prev) => ({ ...defaults, ...prev }));
  }, [fields]);

  if (!tool) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  const missingRequired = fields.filter((f) => f.is_required && (answers[f.key] === undefined || answers[f.key] === "" || (Array.isArray(answers[f.key]) && !answers[f.key].length)));

  const handleSave = async () => {
    if (missingRequired.length) {
      toast({ title: "A few things still need your attention", description: missingRequired.map((f) => f.label).join(" · "), variant: "destructive" });
      return;
    }
    const scores = computeScore(tool.score_formula, answers, fields);
    try {
      await save.mutateAsync({ tool_id: tool.id, answers_json: answers, scores_json: scores });
      toast({ title: "Saved", description: "Your reflection is held." });
      navigate(`/tools/${tool.slug}`);
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <PageBreadcrumb items={[{ label: "Tools", href: "/tools" }, { label: tool.title, href: `/tools/${tool.slug}` }, { label: "New" }]} />
        <ProfileDropdown />
      </div>
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <h1 className="font-serif text-3xl">{tool.title}</h1>
          {tool.intro_microcopy && <p className="italic text-muted-foreground">{tool.intro_microcopy}</p>}
        </motion.div>

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

        <div className="flex gap-3 justify-end pt-4">
          <Button variant="ghost" onClick={() => navigate(`/tools/${tool.slug}`)}>Cancel</Button>
          <Button onClick={handleSave} disabled={save.isPending} size="lg">
            {save.isPending ? "Saving…" : tool.save_button_label}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ToolReflection;