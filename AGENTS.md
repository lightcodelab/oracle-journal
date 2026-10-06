# Project Architecture Rules

- Keep the four member Doors aligned to their distinct purposes: Remembrance for cards, Devotion for rites and healing practices, Becoming for personal-development courses, and Communion for community; this keeps navigation consistent with member focus choices.
- Route fixed content artwork through stable site-image keys while retaining bundled fallbacks; this lets admins replace presentation imagery without redeploying the app.- Home page focus ordering: the Temple home reorders sections below the fixed top row from profiles.primary_focus via one focus-to-order map in Temple.tsx; why: one place to tune what each Door's focus brings forward.
