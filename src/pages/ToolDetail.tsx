import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTransformationTool, useToolEntries } from "@/hooks/useTransformationTools";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import ProfileDropdown from "@/components/ProfileDropdown";
import { ToolTrendChart } from "@/components/tools/ToolTrendChart";
import { BoundaryIntegrityAuditHub } from "@/components/tools/BoundaryIntegrityAuditHub";
import { EmotionalMasteryAuditHub } from "@/components/tools/EmotionalMasteryAuditHub";

const ToolDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: tool, isLoading } = useTransformationTool(slug);
  const { data: entries = [] } = useToolEntries(tool?.id, user?.id);

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!tool) return <div className="p-10 text-center">Not found.</div>;

  if (tool.slug === "boundary-integrity-audit") {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <PageBreadcrumb items={[{ label: "Tools", href: "/tools" }, { label: tool.title }]} />
          <ProfileDropdown />
        </div>
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/tools")}>← Back to Tools</Button>
          <div className="space-y-2">
            <h1 className="font-serif text-4xl">{tool.title}</h1>
            {tool.short_description && <p className="text-lg text-foreground/80">{tool.short_description}</p>}
            {tool.when_to_use && (
              <p className="text-sm italic text-muted-foreground">
                <span className="font-medium not-italic">When to use this:</span> {tool.when_to_use}
              </p>
            )}
          </div>
          <BoundaryIntegrityAuditHub />
        </div>
      </div>
    );
  }

  if (tool.slug === "emotional-mastery-audit") {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <PageBreadcrumb items={[{ label: "Tools", href: "/tools" }, { label: tool.title }]} />
          <ProfileDropdown />
        </div>
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/tools")}>← Back to Tools</Button>
          <div className="space-y-2">
            <h1 className="font-serif text-4xl">{tool.title}</h1>
            {tool.short_description && <p className="text-lg text-foreground/80">{tool.short_description}</p>}
            {tool.when_to_use && (
              <p className="text-sm italic text-muted-foreground">
                <span className="font-medium not-italic">When to use this:</span> {tool.when_to_use}
              </p>
            )}
          </div>
          <EmotionalMasteryAuditHub />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <PageBreadcrumb items={[{ label: "Tools", href: "/tools" }, { label: tool.title }]} />
        <ProfileDropdown />
      </div>
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/tools")}>
            ← Back to Tools
          </Button>
          <hr className="border-border" />
        </div>
        <div className="space-y-3">
          <h1 className="font-serif text-4xl">{tool.title}</h1>
          {tool.short_description && <p className="text-lg text-foreground/80">{tool.short_description}</p>}
          {tool.when_to_use && (
            <p className="text-sm italic text-muted-foreground"><span className="font-medium not-italic">When to use this:</span> {tool.when_to_use}</p>
          )}
          <Button size="lg" onClick={() => navigate(`/tools/${tool.slug}/new`)}>Start Reflection</Button>
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
    </div>
  );
};

export default ToolDetail;