import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { LessonFormQuestion, LessonFormResponses } from '@/lib/lessonFormTypes';

interface Props {
  questions: LessonFormQuestion[];
  responses: LessonFormResponses;
  onChange: (responses: LessonFormResponses) => void;
}

const LessonFormRenderer = ({ questions, responses, onChange }: Props) => {
  const setVal = (id: string, value: any) => onChange({ ...responses, [id]: value });

  return (
    <div className="space-y-6">
      {questions.map((q) => {
        const v = responses[q.id];
        return (
          <div key={q.id} className="space-y-2">
            <Label className="font-serif text-lg text-foreground">
              {q.label || 'Untitled question'}
              {q.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {q.helpText && (
              <p className="text-sm text-muted-foreground">{q.helpText}</p>
            )}

            {q.type === 'short_text' && (
              <Input
                value={(v as string) || ''}
                onChange={(e) => setVal(q.id, e.target.value)}
                required={q.required}
              />
            )}

            {q.type === 'long_text' && (
              <Textarea
                value={(v as string) || ''}
                onChange={(e) => setVal(q.id, e.target.value)}
                rows={4}
                required={q.required}
              />
            )}

            {q.type === 'email' && (
              <Input
                type="email"
                value={(v as string) || ''}
                onChange={(e) => setVal(q.id, e.target.value)}
                required={q.required}
              />
            )}

            {q.type === 'number' && (
              <Input
                type="number"
                value={(v as number | string) ?? ''}
                onChange={(e) => setVal(q.id, e.target.value === '' ? null : Number(e.target.value))}
                required={q.required}
              />
            )}

            {q.type === 'date' && (
              <Input
                type="date"
                value={(v as string) || ''}
                onChange={(e) => setVal(q.id, e.target.value)}
                required={q.required}
              />
            )}

            {q.type === 'time' && (
              <Input
                type="time"
                value={(v as string) || ''}
                onChange={(e) => setVal(q.id, e.target.value)}
                required={q.required}
              />
            )}

            {q.type === 'single_choice' && (
              <RadioGroup
                value={(v as string) || ''}
                onValueChange={(val) => setVal(q.id, val)}
                className="space-y-2"
              >
                {(q.options || []).map((opt, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <RadioGroupItem value={opt} id={`${q.id}-${i}`} className="border-primary" />
                    <Label htmlFor={`${q.id}-${i}`} className="cursor-pointer font-sans text-foreground/90">
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {q.type === 'multiple_choice' && (
              <div className="space-y-2">
                {(q.options || []).map((opt, i) => {
                  const arr = Array.isArray(v) ? (v as string[]) : [];
                  const checked = arr.includes(opt);
                  return (
                    <div key={i} className="flex items-center space-x-3">
                      <Checkbox
                        id={`${q.id}-${i}`}
                        checked={checked}
                        onCheckedChange={(c) => {
                          const next = c ? [...arr, opt] : arr.filter((o) => o !== opt);
                          setVal(q.id, next);
                        }}
                      />
                      <Label htmlFor={`${q.id}-${i}`} className="cursor-pointer font-sans text-foreground/90">
                        {opt}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}

            {q.type === 'dropdown' && (
              <Select value={(v as string) || ''} onValueChange={(val) => setVal(q.id, val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {(q.options || []).map((opt, i) => (
                    <SelectItem key={i} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {q.type === 'linear_scale' && (() => {
              const min = q.scaleMin ?? 1;
              const max = q.scaleMax ?? 5;
              const range: number[] = [];
              for (let n = min; n <= max; n++) range.push(n);
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    {q.scaleMinLabel && <span className="text-xs text-muted-foreground">{q.scaleMinLabel}</span>}
                    <div className="flex gap-3 flex-wrap">
                      {range.map((n) => (
                        <label key={n} className="flex flex-col items-center gap-1 cursor-pointer">
                          <span className="text-xs text-muted-foreground">{n}</span>
                          <input
                            type="radio"
                            name={q.id}
                            value={n}
                            checked={v === n}
                            onChange={() => setVal(q.id, n)}
                            className="accent-primary w-4 h-4"
                          />
                        </label>
                      ))}
                    </div>
                    {q.scaleMaxLabel && <span className="text-xs text-muted-foreground">{q.scaleMaxLabel}</span>}
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
};

export default LessonFormRenderer;