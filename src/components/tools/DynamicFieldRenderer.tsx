import { ToolField } from "@/hooks/useTransformationTools";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  field: ToolField;
  value: any;
  onChange: (v: any) => void;
}

const optLabel = (o: any) => (typeof o === "object" ? o.label : String(o));

export const DynamicFieldRenderer = ({ field, value, onChange }: Props) => {
  const opts = Array.isArray(field.options) ? field.options : [];

  return (
    <div className="space-y-3">
      <Label className="font-serif text-xl text-foreground leading-snug block">
        {field.label}
        {field.is_required && <span className="text-primary/70 ml-1">·</span>}
      </Label>
      {field.helper_text && (
        <p className="text-sm text-muted-foreground italic">{field.helper_text}</p>
      )}

      {field.field_type === "text" && (
        <Input value={value || ""} onChange={(e) => onChange(e.target.value)} />
      )}

      {field.field_type === "textarea" && (
        <Textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="resize-none text-base"
        />
      )}

      {field.field_type === "slider" && (
        <div className="space-y-3 pt-2">
          <Slider
            value={[Number(value ?? field.min ?? 0)]}
            min={field.min ?? 0}
            max={field.max ?? 10}
            step={1}
            onValueChange={(v) => onChange(v[0])}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{field.min_label ?? field.min ?? 0}</span>
            <span className="font-medium text-foreground">{value ?? "—"}</span>
            <span>{field.max_label ?? field.max ?? 10}</span>
          </div>
        </div>
      )}

      {field.field_type === "dropdown" && (
        <Select value={value ?? ""} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
          <SelectContent>
            {opts.map((o: any, i: number) => (
              <SelectItem key={i} value={optLabel(o)}>{optLabel(o)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.field_type === "multiselect" && (
        <div className="flex flex-wrap gap-2">
          {opts.map((o: any, i: number) => {
            const label = optLabel(o);
            const arr: string[] = Array.isArray(value) ? value : [];
            const active = arr.includes(label);
            return (
              <Badge
                key={i}
                variant={active ? "default" : "outline"}
                className={cn("cursor-pointer transition-all py-1.5 px-3",
                  active ? "" : "hover:bg-primary/10")}
                onClick={() => onChange(active ? arr.filter((x) => x !== label) : [...arr, label])}
              >
                {label}
              </Badge>
            );
          })}
        </div>
      )}

      {field.field_type === "radio" && (
        <RadioGroup value={value ?? ""} onValueChange={onChange} className="flex flex-wrap gap-4">
          {opts.map((o: any, i: number) => {
            const label = optLabel(o);
            return (
              <div key={i} className="flex items-center gap-2">
                <RadioGroupItem value={label} id={`${field.id}-${i}`} />
                <Label htmlFor={`${field.id}-${i}`} className="font-normal">{label}</Label>
              </div>
            );
          })}
        </RadioGroup>
      )}

      {field.field_type === "yes_no" && (
        <RadioGroup value={value ?? ""} onValueChange={onChange} className="flex gap-6">
          {["Yes", "No"].map((o) => (
            <div key={o} className="flex items-center gap-2">
              <RadioGroupItem value={o} id={`${field.id}-${o}`} />
              <Label htmlFor={`${field.id}-${o}`} className="font-normal">{o}</Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {field.field_type === "yes_partial_no" && (
        <RadioGroup value={value ?? ""} onValueChange={onChange} className="flex gap-6">
          {["Yes", "Partially", "No"].map((o) => (
            <div key={o} className="flex items-center gap-2">
              <RadioGroupItem value={o} id={`${field.id}-${o}`} />
              <Label htmlFor={`${field.id}-${o}`} className="font-normal">{o}</Label>
            </div>
          ))}
        </RadioGroup>
      )}
    </div>
  );
};