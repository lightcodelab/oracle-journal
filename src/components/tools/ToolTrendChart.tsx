import { TransformationEntry, TransformationTool } from "@/hooks/useTransformationTools";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

interface Props {
  tool: TransformationTool;
  entries: TransformationEntry[];
}

export const ToolTrendChart = ({ tool, entries }: Props) => {
  const sorted = [...entries].reverse();
  const formula = tool.score_formula;
  const max = formula?.max ?? 10;

  if (formula?.type === "average" && formula.fields?.length && sorted.length) {
    const latest = sorted[sorted.length - 1];
    const data = (formula.fields || []).map((f) => ({
      axis: f.replace(/_/g, " "),
      value: Number(latest.scores_json?.breakdown?.[f] ?? latest.answers_json?.[f] ?? 0),
    }));
    return (
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <RadarChart data={data}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
            <PolarRadiusAxis angle={90} domain={[0, max]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
            <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const data = sorted
    .filter((e) => typeof e.scores_json?.primary === "number")
    .map((e) => ({
      date: new Date(e.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: e.scores_json!.primary as number,
    }));

  if (!data.length) {
    return <p className="text-sm text-muted-foreground italic">No measurable entries yet.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
          <YAxis domain={[0, max]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};