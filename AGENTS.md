# Project Architecture Rules

- Keep the four member Doors aligned to their distinct purposes: Remembrance for cards, Devotion for rites and healing practices, Becoming for personal-development courses, and Communion for community; this keeps navigation consistent with member focus choices.
- Route fixed content artwork through stable site-image keys while retaining bundled fallbacks; this lets admins replace presentation imagery without redeploying the app.- Home page focus ordering: the Temple home reorders sections below the fixed top row from profiles.primary_focus via one focus-to-order map in Temple.tsx; why: one place to tune what each Door's focus brings forward.

- Member tool icons (Journal, Playlists, Living Pattern, Tracking, Readings, Protocols) come from one shared map in src/lib/toolIcons.ts; why: the same tool always shows the same icon everywhere.
- Lessons embed a Quiz Builder quiz with a `[[quiz:slug]]` marker in their text, rendered inline by QuizEmbed; why: admins can place quizzes in any lesson without new fields.
- Intuition Builder Clairs, tracker slugs and quiz slug live in src/lib/intuitionClairs.ts and drive the Signs & Signals dashboard on My Tracking; why: one source for which trackers count toward each Clair.
- Site analytics: privacy-first events table + admin_site_analytics aggregate RPC; admin views show group patterns only (avatar groups need 3+ members); why: member insight without exposing individuals.
