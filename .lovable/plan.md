# Quiz Builder (Interact-style)

A full admin quiz builder + public quiz player for personality/outcome quizzes with email gating (synced to MailerLite) and analytics.

## What you'll get

### 1. Admin — Quiz Builder (`/admin/quizzes`)
- List of quizzes with status (draft/published), views, completions, conversion rate.
- Create/edit quiz screen with tabs:
  - **Cover** — title, subtitle, description, cover image upload, brand colors (primary/accent), button label.
  - **Questions** — add/reorder/delete questions. Each question: text, help text, image (optional), and 2–6 answer options. Each option has: text, optional image, and a mapping to one of the results (which result it "votes" for).
  - **Results** — 2–6 result outcomes. Each result: title, description (rich text), image, CTA label + URL, redirect URL (optional).
  - **Lead Capture** — toggle email required (default on), fields shown (name, email), consent text, MailerLite group ID (defaults to project default).
  - **Settings** — slug, published toggle, access (Public URL vs Members-only), SEO title/description.
- Live preview panel showing the quiz as visitors will see it.

### 2. Public quiz page (`/quiz/:slug`)
- Cover → question flow (one at a time with progress bar) → email capture screen → result screen.
- Result is computed by tallying which result each answer voted for; highest tally wins (tiebreak: first defined).
- Submits lead to MailerLite (reusing existing `mailerlite-sync` edge function pattern) and stores the response in the DB.
- Mobile-first, uses existing brand tokens; per-quiz primary/accent colors override.

### 3. Members-only embedding
- Same `/quiz/:slug` route; when a quiz is marked **Members-only**, the page checks auth + active membership and redirects unauth users to `/auth`.
- Anywhere in the app you can drop `<QuizEmbed slug="..." />` to render inline.

### 4. Analytics dashboard (`/admin/quizzes/:id/analytics`)
- KPI cards: views, starts, completions, email opt-ins, conversion rate.
- Chart: completions over last 30 days (recharts).
- Breakdown: % of takers per result outcome.
- Recent leads table (email, name, result, date) with CSV export.

## Technical design

### Database (new tables, all with RLS + GRANTs)
- `quizzes` — id, slug (unique), title, subtitle, description, cover_image_url, primary_color, accent_color, button_label, status ('draft'|'published'), access ('public'|'members'), seo_title, seo_description, mailerlite_group_id, created_by, timestamps.
- `quiz_questions` — id, quiz_id, position, text, help_text, image_url.
- `quiz_options` — id, question_id, position, text, image_url, result_id (which result this option votes for).
- `quiz_results` — id, quiz_id, position, title, description, image_url, cta_label, cta_url, redirect_url.
- `quiz_responses` — id, quiz_id, result_id, answers (jsonb), name, email, user_id (nullable), created_at, completed (bool), ip_hash.
- `quiz_events` — id, quiz_id, event_type ('view'|'start'|'complete'|'optin'), created_at (for analytics funnel).

RLS:
- Admins: full CRUD on all quiz tables (via `has_role(auth.uid(),'admin')`).
- Anon/authenticated: SELECT on `quizzes`/`questions`/`options`/`results` only when quiz is `published` (and members-only enforced app-side + policy on responses).
- `quiz_responses` + `quiz_events`: INSERT open to anon (for public quizzes), SELECT admin-only.

### Edge functions
- `quiz-submit` — validates payload with zod, computes result server-side (prevents client tampering), inserts response + optin event, calls MailerLite sync, returns result payload.
- `quiz-track-event` — lightweight view/start/complete pings.

### Frontend
- New pages: `src/pages/AdminQuizzes.tsx`, `src/pages/AdminQuizEditor.tsx`, `src/pages/AdminQuizAnalytics.tsx`, `src/pages/QuizPlayer.tsx`.
- Components: `QuizBuilder/{CoverTab,QuestionsTab,ResultsTab,LeadCaptureTab,SettingsTab,LivePreview}.tsx`, `QuizPlayer/{Cover,Question,LeadForm,Result}.tsx`.
- Add "Quiz Builder" card to `AdminDashboard.tsx`.
- Routes registered in `App.tsx`.
- Images uploaded to existing `content-images` storage bucket.

### Out of scope (v1, per your answers)
- Branching logic (all takers see all questions in order).
- Scored/right-vs-wrong quiz types.
- A/B testing, custom domains, embed code snippets for external sites.

## Scope estimate
Roughly 15–20 new files + 1 migration + 2 edge functions. I'll build it end-to-end in one pass if you approve.
