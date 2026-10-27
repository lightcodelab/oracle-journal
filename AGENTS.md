# Project Architecture Rules

- Revelations uses a dedicated owner-private reading record, server-selected single-deck card and server-persisted generation; clients may update only evidence answers, never card or reading content. Why: extended card material must remain server-only and returning visitors must keep the same reading. It shares the existing reading gateway implementation; membership checkout remains the existing server-selected monthly flow.

- Newly tagged discovery reads creation timestamps only from all four tag catalogues through useNewlyTagged, never assignment timestamps; why: applying an existing tag must not count as creating a new tag. Global search resolves both shared tag catalogues as well as symptoms and conditions so every tag link can find published resources.

- Card draws preload and decode required artwork through loadCardImages before mounting the animation; animation completion, not a timer, unlocks reveal so slow images cannot race the draw.

- The simple membership signup reuses the existing Auth form and server-selected monthly Stripe checkout; why: one account-creation flow and no client-supplied payment prices.

- Keep the four member Doors aligned to their distinct purposes: Remembrance for cards, Devotion for rites and healing practices, Becoming for personal-development courses, and Communion for community; this keeps navigation consistent with member focus choices.
- Route fixed content artwork through stable site-image keys while retaining bundled fallbacks; this lets admins replace presentation imagery without redeploying the app.- Home page focus ordering: the Temple home reorders sections below the fixed top row from profiles.primary_focus via one focus-to-order map in Temple.tsx; why: one place to tune what each Door's focus brings forward. Focus is currently hidden from members, not retired: every focus control and the focus-driven ordering sit behind SHOW_TEMPLE_FOCUS in src/lib/templeFocus.ts, and a member's saved focus is never cleared — why: the feature must be switchable back on without rebuilding it or losing anyone's choice.

- Member tool icons (Journal, Playlists, Living Pattern, Tracking, Readings, Protocols) come from one shared map in src/lib/toolIcons.ts; why: the same tool always shows the same icon everywhere.
- Lessons embed a Quiz Builder quiz with a `[[quiz:slug]]` marker in their text, rendered inline by QuizEmbed; why: admins can place quizzes in any lesson without new fields.
- Intuition Builder Clairs, tracker slugs and quiz slug live in src/lib/intuitionClairs.ts and drive the Signs & Signals dashboard on My Tracking; why: one source for which trackers count toward each Clair.
- Site analytics: privacy-first events table + admin_site_analytics aggregate RPC; admin views show group patterns only (avatar groups need 3+ members); why: member insight without exposing individuals.
- Not-yet-recorded guided audio sections are hidden from members and shown to admins as a yellow to-do flag; the placeholder detection and hide/flag rules live in src/lib/guidedAudioTodo.ts, used by CardDetail and DevotionLessonPage; why: one source of the rule for both cards and lessons, and real content replaces the placeholder without code changes.
- Stripe invoice handling re-fetches each invoice through the webhook's pinned Stripe client and reads the subscription from every known field location; a daily reconcile (admin-daily-summary → stripe-webhook) records any live paid invoices still missing. Why: webhook payloads follow the endpoint's API version, and a silently skipped invoice lost real revenue and payment alerts.
- Launch Dashboard counts new paying members from first live subscriptions, not account creation; why: people with existing or hand-added accounts who later pay must still show as new members.

- Door section placement uses the shared doorSections catalogue and existing content location IDs (including nullable deck placement); all editors and navigation resolve the Door from that catalogue, preserving legacy placements so content remains reachable.
