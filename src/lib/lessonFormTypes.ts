export type LessonFormQuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_choice'
  | 'multiple_choice'
  | 'dropdown'
  | 'linear_scale'
  | 'date'
  | 'time'
  | 'number'
  | 'email';

export interface LessonFormQuestion {
  id: string;
  type: LessonFormQuestionType;
  label: string;
  helpText?: string;
  required?: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
}

export type LessonFormResponses = Record<string, string | string[] | number | null>;

export const QUESTION_TYPE_LABELS: Record<LessonFormQuestionType, string> = {
  short_text: 'Short answer',
  long_text: 'Paragraph',
  single_choice: 'Multiple choice (one answer)',
  multiple_choice: 'Checkboxes (multiple answers)',
  dropdown: 'Dropdown',
  linear_scale: 'Linear scale',
  date: 'Date',
  time: 'Time',
  number: 'Number',
  email: 'Email',
};

export const newQuestion = (type: LessonFormQuestionType = 'short_text'): LessonFormQuestion => ({
  id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  type,
  label: '',
  required: false,
  options: ['single_choice', 'multiple_choice', 'dropdown'].includes(type) ? ['Option 1'] : undefined,
  scaleMin: type === 'linear_scale' ? 1 : undefined,
  scaleMax: type === 'linear_scale' ? 5 : undefined,
});

/** Migrate the legacy single survey_question + survey_options into the new shape. */
export const legacyToFormQuestions = (
  surveyQuestion: string | null,
  surveyOptions: string[] | null,
): LessonFormQuestion[] | null => {
  if (!surveyQuestion || !surveyOptions || surveyOptions.length === 0) return null;
  return [
    {
      id: 'legacy_survey',
      type: 'single_choice',
      label: surveyQuestion,
      required: false,
      options: surveyOptions,
    },
  ];
};