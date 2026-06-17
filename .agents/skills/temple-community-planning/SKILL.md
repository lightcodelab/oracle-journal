# Temple Community & Messaging Feature Planning

## Purpose
Deferred feature for community, messaging, and group functionality inside AreekeerA®. Revisit after gathering member feedback.

## Core Principles
- Must integrate with existing 3-tier membership (T1 Seeker, T2 Devotee, T3 Initiate)
- Must respect trauma-informed guardrails (escalation triggers, grounding practices)
- Must leverage existing Supabase Realtime infrastructure
- Must not introduce audio/video notes (Digital Journal feature freeze applies)

## Architectural Options

### A: Native (Built in Lovable Cloud)
- Full control, tier/RLS integration, brand-matched, existing Realtime subscriptions
- More build effort, moderation tooling required from day one
- Tables: `messages`, `conversations`, `groups`, `group_members`, `message_reports`, `blocks`
- RLS: all messages scoped to `auth.uid()`, group membership enforced via `group_members`
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;`

### B: External Embed (Circle, Discord, Mighty Networks)
- Faster launch, mature moderation, no backend build
- Outside Temple brand, cannot natively gate by tier, breaks unified experience
- Best for large open communities where tier-gating is less critical

### C: Hybrid
- Native DMs + external forum/space for larger community
- Two systems to manage, potential UX fragmentation

## Feature Categories to Survey Members On
1. 1:1 Direct Messaging (private inbox)
2. Group Spaces / Circles (topic or cohort-based with threaded discussion)
3. Live Chat Rooms (real-time, attached to sessions/protocols)
4. Public Feed / Posts + Comments (forum/social-feed style)

## Tier Gating Options
- Default: All active members (T1+)
- Sacred container: T2+ or T3-only
- Admin-curated groups for 1:1 client cohorts

## Moderation & Safety (Non-Negotiable)
Given trauma-informed context:
- Report — flag messages/content
- Block — stop DMs, hide posts from blocked user
- Mute — temporarily silence a user from your view
- Admin Review — dashboard for reports and actions
- Escalation Integration — community activity should feed existing escalation triggers if distress signals detected

## Deferred Decisions (Pending Member Feedback)
- Which feature categories are actually wanted
- Which tier(s) should have access
- Native vs. external vs. hybrid
- Group creation: admin-only or member-created

## Revisit Criteria
- After gathering explicit member feedback
- Once member density justifies build effort
- If external platform chosen, evaluate tier-gating fit first
