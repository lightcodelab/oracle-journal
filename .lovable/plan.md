
# AreekeerA® Sales-Page Provenance Audit (read-only)

No code, copy, database, billing or publishing changes were made. This report inspects the currently published section in `src/pages/Membership.tsx` (lines 347–548) against other in-repo sources.

## Legend

- **DS** = Directly supported (same claim exists verbatim or near-verbatim elsewhere in repo)
- **RP** = Reasonable paraphrase (source text present, wording changed but meaning preserved)
- **INF** = Inferred (assembled from adjacent facts, not explicitly stated anywhere)
- **NEW** = Newly invented in this Phase 2 pass with no prior in-repo source
- **Confirm?** = Owner confirmation recommended

## AreekeerA® The Method — section (Membership.tsx L347–478)

| # | Published claim | In-repo source | Supporting source text | Class | Confirm? |
|---|---|---|---|---|---|
| 1 | "AreekeerA® The Method is Julie Lewin's trauma-informed healing modality" | `src/pages/Membership.tsx` L792 (Julie bio, pre-existing); `supabase/functions/areekeera-bot/index.ts` L234 | "Julie's AreekeerA® Modality was channelled through decades of clinical practice"; "trauma-informed healing protocol guide" | RP | No — consistent with existing bio |
| 2 | "channelled through more than four decades of clinical practice" | Julie bio L786 + L792 | L786: "over 40 years of experience working with the body as an intelligent, communicative system." L792: "channelled through decades of clinical practice" | RP (arithmetic: 40+ yrs ≈ four decades) | **Yes** — "clinical practice" wording carried forward from bio; see ambiguity note below |
| 3 | "listens to the body as an intelligent, communicative system" | Julie bio L786–787 | "working with the body as an intelligent, communicative system" | DS | No |
| 4 | "treating symptoms as messages" | No prior in-repo text uses this phrasing | — | NEW | **Yes** |
| 5 | "survival responses as wisdom" | Julie bio L788: "release of long-held survival responses" | Original text frames survival responses as things to be *released*, not as "wisdom." Reframing them as "wisdom" is new. | INF/NEW | **Yes** |
| 6 | "identity as something the nervous system is quietly organised around" | Tash bio L802–804: "works at the intersection of trauma, identity, and nervous system regulation, helping people understand how protective patterns and energetic contracts quietly shape health"; L808 "rewriting of identity at both psychological and energetic levels" | Bio links identity + nervous system, but does not state the nervous system is "organised around" identity. | INF | **Yes** |
| 7 | "the philosophy that shapes every practice, deck, course and live gathering inside The Temple" | No source asserts the Method underlies every Temple artefact. Existing memory (`mem://features/areekeera-healing-protocol-system`) describes AreekeerA as the *protocol* system, not the through-line of every deck/course. | — | NEW | **Yes** |
| 8 | "Practices are chosen to meet your capacity, not to override it" | `supabase/functions/areekeera-bot/index.ts` L251–253, L267–268 | "For higher severity symptoms, recommend lower intensity practices first"; "If severity is critical (8-10), prioritize grounding and stabilization practices" | RP | No |
| 9 | "The Method treats symptoms — physical, mental, emotional and energetic — as communication" | `src/pages/AreekeeraBot.tsx` L27, L480: `'physical' \| 'mental' \| 'emotional' \| 'spiritual'` | Code enumerates four domains, but the fourth is **"spiritual"**, not **"energetic"**. | INF (partial mismatch) | **Yes** — domain label discrepancy |
| 10 | "works with grounding, processing and integration in that order" | `supabase/functions/areekeera-bot/index.ts` L255, L259 | "Create protocols with 3-5 steps that flow logically (grounding → processing → integration)"; "Place them where they fit best in the protocol flow (grounding → processing → integration)" | DS | No |
| 11 | "Trauma-informed by design" | Bot L250 "Be warm, empathetic, and trauma-informed"; AreekeeraBot L579 "Trauma-informed safety guardrails"; `mem://design/trauma-informed-safety-guardrails` | Multiple sources confirm trauma-informed framing at the system level. | DS | No |
| 12 | "Severity, capacity and safety are considered before intensity" | Bot L251–253, L267–268 as above; `mem://…recommendation-engine` step 3 | Severity bands drive intensity gating; escalation → grounding only. "Capacity" as a named concept is not in the bot prompt, but appears in `useNervousAnchoring` and CTA copy elsewhere. | RP | No |
| 13 | "When the system is under strain, the Method prioritises grounding and stabilisation — never force, never bypass" | Bot L222, L225, L230, L267; Tash bio L809 "without force or bypassing" | Direct match on "grounding and stabilization"; "never force, never bypass" mirrors Tash bio phrase "without force or bypassing." | DS | No |
| 14 | "It works across physical, mental, emotional and energetic layers as one system" | AreekeeraBot L27/L480 domains as above (fourth is **spiritual**) | Same discrepancy as #9. | INF | **Yes** — domain label |
| 15 | "and includes the identity and protective patterns that shape how healing is received" | Tash bio L802–804 "protective patterns and energetic contracts quietly shape health" | Bio speaks to shaping *health*, not "how healing is received." Close paraphrase. | RP | No |
| 16 | "Every practice honours a simple sequence: settle the nervous system first, meet what surfaces gently, and give the body time to integrate before moving on" | Bot L255/L259 grounding→processing→integration | Sequence is confirmed; the narrative gloss ("settle… meet… integrate") is a new plain-language expansion. | RP | No |
| 17 | Membership experience list: "AreekeerA® Protocol Builder — a personalised, symptom-informed sequence" | `src/pages/AreekeeraBot.tsx` intake UI; recommendation-engine memory | Feature exists and matches. | DS | No |
| 18 | "Guided meditations & energy hygiene practices" | Bot resource `modality` includes `meditation`, `visualisation`, `ritual`, `somatic`, `process` (edge fn L282) | "Energy hygiene" as a category label is not present in code. | INF | **Yes** (minor) |
| 19 | "Courses & learning journeys through Remembrance, Devotion and Communion" | Memory: Door of Remembrance, Devotion, Communion pages exist. | DS | DS | No |
| 20 | "Oracle card decks and Sacred Spreads for reflection" | `DeckSelection.tsx`, `SacredSpreads.tsx` | DS | DS | No |
| 21 | "Healing templates, journal prompts and nervous-system tools" | Journal + Transformation Tools (Nervous System Anchoring) exist | DS | DS | No |
| 22 | "Live gatherings with Julie & Tash each month" | Membership.tsx L325 "At least one live class… each month" | DS | DS | No |

## Protocol Builder — section (Membership.tsx L480–548)

| # | Published claim | In-repo source | Supporting source text | Class | Confirm? |
|---|---|---|---|---|---|
| 23 | "one practical application of AreekeerA® The Method — not the whole Method" | No prior source frames the Builder as a subset of a larger Method. | — | NEW (framing decision this pass) | **Yes** |
| 24 | "You share what you are experiencing across physical, mental, emotional and energetic domains" | AreekeeraBot L27/L480 domains (fourth = **spiritual**, not energetic) | Intake collects domain + severity, but 4th domain label differs. | INF | **Yes** — domain label |
| 25 | "along with relevant context and the time you have" | AreekeeraBot intake collects `goals` and `sessionTimeMinutes` (edge fn L20) | "goals?: string; sessionTimeMinutes: number" | DS | No |
| 26 | "assembles a personalised sequence of practices already inside The Temple — meditations, somatic tools, rituals and reflective processes" | Bot healing_resources modalities: `meditation \| visualisation \| ritual \| somatic \| process` (edge fn L282) | DS with modality list. | RP | No |
| 27 | "sequenced through the Method's grounding → processing → integration flow" | Bot L255/L259 | DS | DS | No |
| 28 | "Symptoms, severity, and what you have capacity for — held with trauma-informed safety guardrails" | AreekeeraBot intake + bot L222/L579; escalation memory | DS on symptoms/severity/guardrails. "Capacity" is a narrative addition (see #12). | RP | No |
| 29 | Step 2: "sequence of existing Temple practices, chosen to match your submitted state and the time you have" | Recommendation-engine memory (rules-first + semantic + filter by entitlement); intake `sessionTimeMinutes` | DS | RP | No |
| 30 | Step 3: "Save the protocol, return to it, adjust as your capacity changes. Nothing is prescribed; everything is offered." | Save/return supported by `MyProtocols.tsx`; "Nothing is prescribed; everything is offered" is a new sales-page framing. | Feature: DS. Wording: NEW. | RP + NEW phrasing | **Yes** (phrasing only) |
| 31 | Disclaimer: "does not diagnose conditions, determine a medical cause, or replace professional care" | `mem://design/trauma-informed-safety-guardrails` "Not medical advice…"; AreekeeraBot L559 "This is a trauma-informed healing protocol guide designed to support your wellbeing journey." | RP | RP | No |

## Focus items called out in the request

- **"channelled through more than four decades of clinical practice"** — Derived from Julie bio "over 40 years of experience" (L786) + "channelled through decades of clinical practice" (L792). Two existing sources, combined. **Owner confirmation recommended on "clinical practice"** (see ambiguity note).
- **"symptoms as messages"** — NEW phrase; no prior in-repo occurrence.
- **"survival responses as wisdom"** — Original bio speaks of *releasing* long-held survival responses; reframing them as "wisdom" is new.
- **Nervous system organised around identity** — INFERRED from Tash bio linking trauma, identity, and nervous system regulation; the specific "organised around" formulation is new.
- **"grounding → processing → integration"** — DS. Exact sequence appears twice in `supabase/functions/areekeera-bot/index.ts` (L255, L259).
- **Severity, capacity and safety before intensity** — RP. Severity-bands and intensity gating are explicit in the edge function; "capacity" is a narrative addition consistent with escalation rules.
- **Physical, mental, emotional and energetic domains** — MISMATCH. The intake schema and UI use `physical | mental | emotional | spiritual` (AreekeeraBot L27, L480). The sales page substitutes "energetic" for "spiritual." **Owner confirmation required** on the intended public label.
- **Trauma-informed by design** — DS across bot prompt, UI header, and memory.
- **Every deck / course / practice / live gathering shaped by the Method** — NEW as a global claim. In-repo the Method (via the recommendation engine) governs the Protocol Builder specifically; there is no source stating the decks (Sacred Rewrite, Magic Not Logic, Sacred Spreads, TAoSH), Devotion courses, or live sessions are curricularly shaped by AreekeeraBot logic. **Owner confirmation required.**
- **Protocol Builder — what it collects and how it sequences** — DS. Intake collects symptoms + severity per domain, `goals`, `sessionTimeMinutes`. Sequencing is rules-first with severity→intensity gating, must-include resources, condition priority boosts, and grounding→processing→integration ordering (`supabase/functions/areekeera-bot/index.ts` L143–265; `mem://architecture/areekeera-recommendation-engine`).

## "Clinical practice" — ambiguity flag (identification only, no legal determination)

The phrase "clinical practice" originates in the existing Julie bio at `src/pages/Membership.tsx` L792 and is carried forward into the new Method section at L366. In common Australian usage "clinical practice" often implies a regulated healthcare setting (e.g. AHPRA-registered practitioner, licensed clinic). Julie is described in the same bio as a "medical intuitive" (L786), a non-regulated modality. A reader could reasonably infer a regulated clinical qualification from "four decades of clinical practice" when combined with "medical intuitive" and "trauma-informed healing modality." Flagging for owner review; no change made.

## Summary counts

- Directly supported (DS): 10
- Reasonable paraphrase (RP): 11
- Inferred (INF): 5
- Newly invented (NEW): 5 (#4, #5 partial, #7, #23, #30 phrasing)
- Owner confirmation recommended: 10 items (see "Confirm?" column)

No files were modified. Awaiting your direction before any remediation.
