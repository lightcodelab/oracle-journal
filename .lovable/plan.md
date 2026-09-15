# The Remembrance Letters — a year-long digital pilgrimage

A twelve-month private letter series inside THE TEMPLE. Members choose to begin, and from that day a personal Reading Letter is written for them every 30 days, built from four cards drawn for that month's theme. Each letter arrives with its own small practices for the month and a private journaling space beneath it.

Included for all paying members. Nothing is generated and no email is sent until a member presses **Begin the Pilgrimage**.

## What a member experiences

1. **On the Temple home page** — a new doorway: *The Remembrance Letters — a year-long Sacred Undoing pilgrimage*. It explains the twelve months plainly, then one button: **Begin the Pilgrimage**. It is unmistakable that they are joining something ongoing.
2. **The moment they begin** — their first letter is written for them and appears straight away. Their next letter is due 30 days later, and so on for twelve months.
3. **My Remembrance Letters** (new entry in the My Profile menu) — monthly tabs. The open tab shows a row of the four card images drawn for them at the top, then the full letter, then that month's practices, then the journaling card.
4. **The journaling card** — three questions, saved privately, shown in a bordered card beneath the letter and editable any time:
   - What is asking to be seen? What truth, pattern, or feeling is this reading bringing into the light?
   - What am I being invited to shift? What am I ready to soften, release, reclaim, or choose differently?
   - How will I live this message? What is one intention, boundary, or action I will carry into this month?
5. **Once joined, the Temple doorway changes** — instead of the invitation it shows where they are (e.g. Month 3 of 12), this month's theme, a short column of the practices for the month, and a link to read the letter.
6. **Each month a branded email arrives** telling them their new letter is waiting, with a button to it. Same gold and warm brown as your other emails, signed *With Love, Julie & Tash*.

Only the member can ever see their own letters and notes.

## The letters themselves

The writing keeps the existing Remembrance Letters voice and the same twelve monthly themes already set up in the admin area — The Echo, The Inheritance, The Body Remembers, The Threshold, The Soft Animal, The Midpoint Mirror, The Voice, The Boundary, The Longing, The Offering, The Gratitude, The Becoming — including each month's deck weighting, so the right decks are drawn for the right theme. Earlier months are given as context so later letters can reference their own path, exactly as the admin version does.

Two adjustments for the digital version: the letter closes by pointing them to their journaling space rather than to a posted page, and each letter also produces three to five small practices for that month drawn from their own four cards — a prompt, a physical practice, and one reminder to carry.

The postal Remembrance Letters admin area stays exactly as it is; nothing there changes.

## Technical detail

**Shared themes source.** The twelve themes currently exist twice (in the letter generator and in the admin page). Add `supabase/functions/_shared/remembranceThemes.ts` as the single source and a matching `src/lib/remembranceThemes.ts` for display titles; point the existing generator and admin page at them.

**New tables (owner-only RLS, GRANTs on each):**
- `remembrance_pilgrims` — `user_id` unique, `joined_at`, `current_month`, `next_letter_due_at`, `status` (active/paused/completed), `paused_reason`, timestamps.
- `remembrance_letters` — `user_id`, `month_number` (1–12), `theme`, `card_ids uuid[]`, `card_snapshot jsonb`, `content`, `practices jsonb`, `model_used`, `generated_at`; unique on (`user_id`, `month_number`).
- `remembrance_reflections` — `letter_id`, `user_id`, three text answers, timestamps; unique per letter.

Reads/writes go through security-definer RPCs that derive the owner from the session, mirroring `usePatternRecords.ts`. Members never see another member's rows; no admin general read.

**`generate-remembrance-letter` edge function** — service-role, reuses the existing prompt and weighted four-card draw from `generate-snail-mail-letter`, adds the practices output as JSON, writes the letter, advances `current_month`/`next_letter_due_at`, then sends the email. Called on join and by the scheduler. Gateway failures are surfaced, not swallowed; a `402`/`403` pauses the run and flags it.

**Scheduler** — one `pg_cron` job (hourly) posting to a `run-remembrance-letters` function that processes a bounded batch of members whose letter is due: single-flight lease row, per-member idempotency via the unique month key, circuit breaker on credit/policy denials, and a check that skips anyone who has lost membership access.

**Email** — new `remembrance-letter-ready` template in the existing registry, branded to match the affiliate and auth emails, with the month, theme, and a button to My Remembrance Letters. Idempotency key per member and month.

**Front end** — `src/pages/MyRemembranceLetters.tsx` (route `/remembrance-letters`, gated on `hasFullTempleAccess`), `src/components/temple/RemembranceLettersCard.tsx` in `Temple.tsx`, a `useRemembranceLetters` hook, and a new item in `ProfileDropdown.tsx`. Card thumbnails use the existing `/cards/{image_file_name}` path. Keyboard and screen-reader conventions follow the recent accessibility work.

## Deliberately not in this build

- Purchasable physical journal pages (revisit later).
- Any admin ability to read member letters or reflections.
- Editing or regenerating a letter after it is written.
