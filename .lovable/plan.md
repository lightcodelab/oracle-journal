## Transformation Tracking Tools — Build Plan

A guided-reflection system that feels like the Temple speaking to the user, not a form. 9 tools shipped on day one, but every field is editable — admins can add, remove, or reorder anything without a code change.

---

### 1. Database (single migration)

Four new tables, all RLS-protected.

**`transformation_tools`** — one row per tool
- `slug`, `title`, `short_description`, `when_to_use`, `purpose`
- `intro_microcopy` (the "Take a breath…" lead-in)
- `save_button_label` (e.g. "Save as Revelation")
- `icon_name`, `display_order`, `is_published`
- `recommended_resource_ids` (uuid[]) → links to courses/resources
- `score_formula` (jsonb): e.g. `{ type: "average", fields: ["presence","honesty","follow_through"] }` or `{ type: "single", field: "clarity" }`

**`transformation_tool_fields`** — ordered field definitions per tool
- `tool_id`, `order_index`, `key` (snake_case identifier)
- `label` (the guided question)
- `helper_text` (sub-prompt, optional)
- `field_type` enum: `text`, `textarea`, `slider`, `dropdown`, `multiselect`, `radio`, `yes_no`, `yes_partial_no`
- `options` (jsonb array, for dropdown/multiselect/radio)
- `min`, `max`, `min_label`, `max_label` (sliders)
- `is_required`, `contributes_to_score` (boolean — only numeric fields)

**`transformation_entries`** — every saved reflection
- `user_id`, `tool_id`, `created_at`
- `answers_json` (jsonb, keyed by field `key`)
- `scores_json` (jsonb: `{ primary: 3.5, breakdown: {...} }`)
- `linked_card_id`, `linked_course_id`, `linked_symptom_pathway` (all optional)

**`transformation_recommendation_rules`** — admin-mapped rules engine
- `tool_id`, `priority`
- `condition_json` (e.g. `{ field: "clarity", op: "<", value: 2 }`)
- `recommended_tool_id` and/or `recommended_resource_id`
- `microcopy` (admin-written reason, optional)

RLS: users CRUD their own entries; everyone reads published tools/fields/rules; admins manage everything.

---

### 2. User-facing routes

**`/tools`** — the hub (Temple-styled)
- Hero: "Today's reflection" — chosen by the rules engine from recent entries (fallback: oldest-used tool)
- Recent entries strip (last 3, with the tool icon + a one-line preview)
- Progress Snapshot card: clarity trend, regulation recovery, boundary score, devotion score, stability baseline (only shows metrics the user has data for)
- Pattern Insights panel: AI-generated paragraph (cached 24h) in Sacred Rewrite voice
- Grid of all 9 tools

**`/tools/:slug`** — individual tool page
- Title, short description, "When to use this", "Start Reflection" CTA
- Past entries list with timestamps + primary score
- Recharts trend graph (line/radar depending on `score_formula.type`)
- Recommended next training (from `recommended_resource_ids` + rules)

**`/tools/:slug/new`** — the guided reflection
- Single-question-per-screen feel (one card, generous spacing, Playfair prompt)
- Renders dynamically from `transformation_tool_fields`
- Save → run score formula → insert entry → toast → return to tool page

Components: `<DynamicFieldRenderer>` switches on `field_type`. Shared `<TrendChart>` reads `scores_json.primary` over time.

---

### 3. Admin uploader (`/admin/transformation-tools`)

Tile on AdminDashboard ("Transformation Tools").

- Left: list of tools (drag to reorder, publish toggle, duplicate, delete)
- Right pane (tabs):
  1. **Details** — title, slugs, descriptions, microcopy, save button, icon, score formula builder
  2. **Fields** — drag-to-reorder list; each row inline-editable; add/remove field; for dropdown/multiselect, options edited as a chip list
  3. **Recommendations** — rule builder (when answer X meets condition, suggest tool/resource Y)
  4. **Preview** — renders the live `<DynamicFieldRenderer>` exactly as users see it

"Create new tool from scratch" button at top. Everything saves via the admin client; no migration needed to add a tool.

---

### 4. Seed data

A second migration inserts all 9 tools verbatim from your spec — every field, dropdown option, slider range, score formula, and save button label. After ship, you can edit any of them from the admin.

---

### 5. Insights engine

**Rules first** (synchronous, in-app):
- "Today's tool" picked by scanning the user's last 14 days of entries against `transformation_recommendation_rules`. If no rules match, suggest the tool they haven't logged the longest.
- "Recommended next training" on each tool page = `recommended_resource_ids` + any rule matches.

**AI for prose** (edge function `generate-transformation-insights`):
- Runs on demand from the `/tools` hub, cached 24h per user in a tiny `transformation_insights_cache` table
- Reads the last 30 days of `scores_json` + answer summaries (counts, not raw text where possible)
- Uses `google/gemini-2.5-flash` with a system prompt anchored in the Sacred Rewrite tone (same approach as the Remembrance Letters generator)
- Returns 2–3 short poetic paragraphs: "You have logged Safety Distortions 6 times this month. Your recognition speed has moved from same-day to within minutes. Something in you is learning to hear itself sooner."

---

### 6. Technical details

```text
src/
  pages/
    Tools.tsx                        ← hub
    ToolDetail.tsx                   ← /tools/:slug
    ToolReflection.tsx               ← /tools/:slug/new
    TransformationToolsAdmin.tsx     ← /admin/transformation-tools
  components/tools/
    DynamicFieldRenderer.tsx
    ToolTrendChart.tsx
    ProgressSnapshot.tsx
    PatternInsights.tsx
    RecentEntries.tsx
    admin/
      ToolListPanel.tsx
      ToolDetailsForm.tsx
      ToolFieldsEditor.tsx
      RecommendationRulesEditor.tsx
      ToolPreview.tsx
  hooks/
    useTransformationTools.ts
    useTransformationEntries.ts
supabase/functions/
  generate-transformation-insights/index.ts
```

- Charts: Recharts (already in the project).
- All copy uses Playfair Display for prompts, Inter for body, gold accents — matches Temple aesthetic.
- Standard RLS, like Journal — no client-side encryption.

---

### What I will NOT do without further direction
- Won't wire these into the Daily Check-In automatically (the spec mentions it but no Daily Check-In exists yet). The "today's tool" will use recent entries + rules instead.
- Won't add a separate "linked_symptom_pathway" picker UI in v1 — it's stored on the entry and editable from the admin, but the user-facing flow doesn't expose it yet.

Approve and I'll ship the full system.