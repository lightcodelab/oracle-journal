import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Copy } from 'lucide-react';
import {
  LessonFormQuestion,
  LessonFormQuestionType,
  QUESTION_TYPE_LABELS,
  newQuestion,
} from '@/lib/lessonFormTypes';

interface Props {
  questions: LessonFormQuestion[];
  onChange: (questions: LessonFormQuestion[]) => void;
}

const HAS_OPTIONS: LessonFormQuestionType[] = ['single_choice', 'multiple_choice', 'dropdown'];

const LessonFormBuilder = ({ questions, onChange }: Props) => {
  const update = (idx: number, patch: Partial<LessonFormQuestion>) => {
    const next = [...questions];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const remove = (idx: number) => onChange(questions.filter((_, i) => i !== idx));
  const duplicate = (idx: number) => {
    const copy = { ...questions[idx], id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` };
    const next = [...questions];
    next.splice(idx + 1, 0, copy);
    onChange(next);
  };
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= questions.length) return;
    const next = [...questions];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };
  const changeType = (idx: number, type: LessonFormQuestionType) => {
    const q = questions[idx];
    const needsOptions = HAS_OPTIONS.includes(type);
    update(idx, {
      type,
      options: needsOptions ? q.options && q.options.length > 0 ? q.options : ['Option 1'] : undefined,
      scaleMin: type === 'linear_scale' ? q.scaleMin ?? 1 : undefined,
      scaleMax: type === 'linear_scale' ? q.scaleMax ?? 5 : undefined,
    });
  };

  return (
    <div className="space-y-3">
      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No questions yet. Add your first question below.
        </p>
      )}

      {questions.map((q, idx) => (
        <Card key={q.id} className="p-4 space-y-3 bg-muted/30">
          <div className="flex items-start gap-2">
            <div className="flex flex-col items-center pt-1 text-muted-foreground">
              <GripVertical className="w-4 h-4" />
              <span className="text-xs mt-1">{idx + 1}</span>
            </div>

            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-2">
                <Input
                  value={q.label}
                  onChange={(e) => update(idx, { label: e.target.value })}
                  placeholder="Question"
                />
                <Select value={q.type} onValueChange={(v) => changeType(idx, v as LessonFormQuestionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(QUESTION_TYPE_LABELS) as LessonFormQuestionType[]).map((t) => (
                      <SelectItem key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                value={q.helpText || ''}
                onChange={(e) => update(idx, { helpText: e.target.value })}
                placeholder="Help text (optional)"
                rows={1}
                className="text-sm"
              />

              {HAS_OPTIONS.includes(q.type) && (
                <div className="space-y-2 pl-2 border-l-2 border-border">
                  <Label className="text-xs">Options</Label>
                  {(q.options || []).map((opt, oi) => (
                    <div key={oi} className="flex gap-2">
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const opts = [...(q.options || [])];
                          opts[oi] = e.target.value;
                          update(idx, { options: opts });
                        }}
                        placeholder={`Option ${oi + 1}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => update(idx, { options: (q.options || []).filter((_, i) => i !== oi) })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => update(idx, { options: [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`] })}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add option
                  </Button>
                </div>
              )}

              {q.type === 'linear_scale' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pl-2 border-l-2 border-border">
                  <div>
                    <Label className="text-xs">Min</Label>
                    <Input
                      type="number"
                      value={q.scaleMin ?? 1}
                      onChange={(e) => update(idx, { scaleMin: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max</Label>
                    <Input
                      type="number"
                      value={q.scaleMax ?? 5}
                      onChange={(e) => update(idx, { scaleMax: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Min label</Label>
                    <Input
                      value={q.scaleMinLabel || ''}
                      onChange={(e) => update(idx, { scaleMinLabel: e.target.value })}
                      placeholder="e.g. Low"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max label</Label>
                    <Input
                      value={q.scaleMaxLabel || ''}
                      onChange={(e) => update(idx, { scaleMaxLabel: e.target.value })}
                      placeholder="e.g. High"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!q.required}
                    onCheckedChange={(v) => update(idx, { required: v })}
                  />
                  <Label className="text-xs">Required</Label>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => move(idx, -1)} disabled={idx === 0}>
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => move(idx, 1)} disabled={idx === questions.length - 1}>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => duplicate(idx)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(idx)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}

      <AddQuestionButton onAdd={(type) => onChange([...questions, newQuestion(type)])} />
    </div>
  );
};

const AddQuestionButton = ({ onAdd }: { onAdd: (type: LessonFormQuestionType) => void }) => {
  const [type, setType] = useState<LessonFormQuestionType>('short_text');
  return (
    <div className="flex gap-2">
      <Select value={type} onValueChange={(v) => setType(v as LessonFormQuestionType)}>
        <SelectTrigger className="w-[260px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(QUESTION_TYPE_LABELS) as LessonFormQuestionType[]).map((t) => (
            <SelectItem key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={() => onAdd(type)}>
        <Plus className="w-4 h-4 mr-2" /> Add question
      </Button>
    </div>
  );
};

export default LessonFormBuilder;