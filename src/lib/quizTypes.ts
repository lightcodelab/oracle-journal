export type QuizStatus = 'draft' | 'published';
export type QuizAccess = 'public' | 'members';

export interface Quiz {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_image_url: string | null;
  primary_color: string;
  accent_color: string;
  button_label: string;
  status: QuizStatus;
  access: QuizAccess;
  require_email: boolean;
  collect_name: boolean;
  consent_text: string | null;
  mailerlite_group_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizResult {
  id: string;
  quiz_id: string;
  position: number;
  title: string;
  description: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  redirect_url: string | null;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  position: number;
  text: string;
  help_text: string | null;
  image_url: string | null;
}

export interface QuizOption {
  id: string;
  question_id: string;
  result_id: string | null;
  position: number;
  text: string;
  image_url: string | null;
}

export interface QuizFull extends Quiz {
  results: QuizResult[];
  questions: Array<QuizQuestion & { options: QuizOption[] }>;
}

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);