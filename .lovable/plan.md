
# Historical AreekeerA® sales-page recovery (read-only)

No code, copy, database or publishing changes. Repository history is available and was inspected via `git log/show` on all refs. This report is the deliverable — approve to close, or send follow-up direction.

## 1. Relevant historical commits for `src/pages/Membership.tsx`

The Phase 2 rewrite that replaced the tiered sales page with the single-membership homepage landed on **2026-07-20**. The immediately preceding version (still tiered, still containing the AreekeerA® Method section) is:

- **`049c9e5` — 2026-03-01 05:03 UTC** — last commit touching `Membership.tsx` before the July 20 rewrite. This is the "previous sales page" the request is asking for.
- Earlier same-shape versions on the tiered page: `ea625e2`, `cfe8263`, `4bfb594`, `c3e13c2`, `f3fb54f`, `272d502`, `c961241`, `d5cfd1c`, `6292b77`, `7022b73`, `53a409e`, `46e598c`, `4e5ccc9` (all 2026-03-01), and February 2026 predecessors back to `02eeb2c` (2026-02-02).
- Phase 2 rewrite commits (2026-07-20): `46d5cb8` 09:44, `2ee128f` 09:44, `b3bf701` 09:45 (single-membership rewrite); `f3af457` 10:28, `d1730ec` 10:29 (Phase 2 remediation); `1e3ff50` 10:43, `a91104f` 10:44 (AreekeerA® Method section that Phase 2 introduced into the new page).
- `-S` searches for `AreekeerA`, `Modality`, `Maelin` confirm no earlier deleted or renamed sales/landing/pricing component ever carried this copy. `Landing.tsx`, `Pricing.tsx`, `Home.tsx` never existed. All historical public sales copy lived in `src/pages/Membership.tsx`.
- `Maelin` appears only in Edge Function / bot code and in `docs/DEPRECATED_MAELIN.md` — never on the public sales page.

Conclusion: `049c9e5` is the canonical "previous AreekeerA® sales-page copy". No other recoverable source exists.

## 2. Exact previous AreekeerA® sales copy (verbatim from `049c9e5:src/pages/Membership.tsx`)

### Section header (lines 195–213)

> Introducing
>
> **The AreekeerA® Method**
>
> A revolutionary approach to understanding the energetic language of your body — developed over 40 years of clinical practice by Medical Intuitive Julie Lewin.

### Three feature cards (lines 222–255)

> **40+ Years Proven**
> Trusted by thousands of clients worldwide

> **Guided Creative Visualisations**
> A body-based healing modality that works with the energy blueprint beneath physical symptoms

> **Immediate Tools**
> Start shifting energy today

### Julie provenance paragraph (line 266)

> For over 40 years, Julie Lewin has been a pioneer in Medical Intuition. Her AreekeerA® Modality was channelled through after appearing on the TV Show The Extraordinary twice to international acclaim. With over 1.1 million listens on Insight Timer and a lifetime of clinical practice, she has helped thousands move from chronic pain to extraordinary health. She is excited to finally make her whole body of work available to everyone. It is a paid app because reciprocation is required for true lasting healing to occur.

### Protocol Builder references elsewhere on the same page (lines 345–350, 591)

> Deepen your practice with personalized healing protocols and sacred rituals.
> — Your symptoms automatically mapped to personalised protocols

> Your AreekeerA® Healing Protocol Builder  *(feature row, tiers T2 and T3)*

### Julie & Tash bios (lines 638, 641, 648, 651) — unchanged and still present in current page

> **Julie Lewin** is a medical intuitive with over 40 years of experience working with the body as an intelligent, communicative system. Her work focuses on identifying how trauma, stress, and unresolved emotional patterns become stored in the physical body and nervous system — often long before symptoms appear.
>
> Rather than treating symptoms in isolation, Julie tracks chronic pain and illness patterns through time, using the AreekeerA® approach to read the body's energetic and neurological history. Her work supports the release of long-held survival responses so the system can return to safety, repair, and resilience.
>
> **Tash Lewin** works at the intersection of trauma, identity, and nervous system regulation. Her role within AreekeerA® focuses on helping people understand how subconscious beliefs, protective patterns, and energetic contracts form around unresolved trauma — and how these patterns quietly shape health, relationships, and life outcomes.
>
> Through structured, trauma-informed processes, Tash supports the rewriting of identity at both psychological and energetic levels, allowing new patterns of safety, capacity, and self-trust to emerge without force or bypassing.

## 3. Original page structure and heading order

```text
Hero (tiered pricing)
  ↓
"AreekeerA Method" section
  - Kicker: "Introducing"
  - H2: "The AreekeerA® Method"
  - Sub: "A revolutionary approach ... 40 years of clinical practice by Medical Intuitive Julie Lewin."
  - 3-card grid: "40+ Years Proven" | "Guided Creative Visualisations" | "Immediate Tools"
  - Julie provenance paragraph (Insight Timer, The Extraordinary, reciprocation)
  ↓
"Three Doors to Your Transformation"
  - Door of Remembrance (feature bullets)
  - Door of Devotion  (protocols, energy hygiene, healing templates)
  - Door of Communion (live sessions, replays)
  ↓
Tier comparison table
  - Seeker (T1) / Devotee (T2) / Initiate (T3)
  - Row: "Your AreekeerA® Healing Protocol Builder" (T2, T3 only)
  ↓
"Your Guides"
  - Julie bio (2 paragraphs)
  - Tash bio (2 paragraphs)
  ↓
FAQ (billing / change plan / payment methods)
```

There was **no separate "Protocol Builder" explainer section** on the historical page — the Builder appeared only as a feature-comparison row and a single Devotion bullet ("symptoms automatically mapped to personalised protocols"). All narrative weight on AreekeerA® was carried by the Method section and the Guides bios.

## 4. Historical statements now outdated

| Historical claim | Outdated because |
|---|---|
| Three-tier model (Seeker/Devotee/Initiate) with Protocol Builder gated to T2/T3 | Phase 1 collapsed to a single membership; Protocol Builder is available to all active members. |
| "Your symptoms automatically mapped to personalised protocols" (Devotion bullet) | Overstates automation; current Builder is intake-driven and safety-gated (severity/capacity/grounding). |
| Tier-comparison table row "Your AreekeerA® Healing Protocol Builder — T2, T3" | Tier gating removed. |
| "40+ Years Proven — Trusted by thousands of clients worldwide" as a headline claim | Retained in bios but no longer used as a hero-adjacent trust badge; social-proof claims currently require owner sign-off. |
| Insight Timer "1.1 million listens" + "The Extraordinary" TV mention as a public sales claim | Currently not on the public homepage; retained only if owner reconfirms figures. |
| "It is a paid app because reciprocation is required for true lasting healing to occur." | Superseded by Phase 2 single-membership framing and Founding-window messaging. |
| "Guided Creative Visualisations — A body-based healing modality that works with the energy blueprint beneath physical symptoms" | Not currently used; the Method section now speaks in nervous-system/trauma-informed terms rather than "energy blueprint". |
| FAQ: "Can I change my plan later? … upgrade or downgrade" | No plans to switch between; single membership. |

`Maelin` never appeared on the public sales page in any recovered commit, so nothing to remove there.

## 5. Historical explanations of AreekeerA® The Method that remain factually current

- Julie Lewin as **Medical Intuitive with 40+ years of clinical practice** — still current (source of the "four decades of clinical practice" line in the new page). Same "clinical practice" ambiguity flagged in the prior provenance audit applies verbatim here.
- **Body as an intelligent, communicative system** — current; carried straight into the new Method section.
- **Trauma, stress, and unresolved emotional patterns stored in the body and nervous system before symptoms appear** — current.
- **Reads the body's energetic and neurological history; supports release of long-held survival responses so the system returns to safety, repair, resilience** — current (this is the source paragraph for the new "survival responses" / "return to safety" framing).
- **Tash's remit: trauma, identity, and nervous-system regulation; protective patterns / energetic contracts shape health** — current (source for the new "identity as something the nervous system is quietly organised around" paraphrase).
- **Trauma-informed, no force, no bypassing** — current; matches the Edge Function guardrails.

## 6. Recoverability statement

Repository history **is available**. A recoverable older version of the AreekeerA® sales copy exists in commit `049c9e5` (2026-03-01) and its immediate predecessors. No separate deleted/renamed landing, pricing or sales component contained additional AreekeerA® copy — `Membership.tsx` has been the sole public sales-page host across all history. No further historical material to recover.

No changes made. Awaiting direction on whether to fold any of the recovered copy (e.g. "energy blueprint beneath physical symptoms", Insight Timer / The Extraordinary provenance, "reciprocation" line) back into the current page.
