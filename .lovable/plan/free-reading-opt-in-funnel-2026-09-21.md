# Free reading opt-in funnel

Today there is no free account. Every sign-up is tied to paid membership, and Sacred Spreads requires full Temple access. This adds a free tier that grants exactly one Past, Present, Future reading, then keeps marketing to that person.

## The funnel

```text
Ad / social / email  ->  Free reading landing page  ->  Create free account
                                                          |
                                             One Past, Present, Future reading
                                                          |
                                 Reading + journal prompts saved to their account
                                                          |
                         Invitation to join THE TEMPLE (shown under the reading)
                                                          |
                    Welcome email + marketing sequence, plus membership page
```

1. A public landing page at `/free-reading` explains the one free reading and asks for name, email and password. The same offer appears as a section on the membership sales page, so both traffic paths work.
2. Creating a free account skips payment entirely (no Stripe, no pending price). Newsletter consent is collected on the form.
3. They land straight on their reading: three cards drawn, revealed, and the written shared reading, exactly as members see it.
4. The reading and their journal answers save to their account, so they can return to read and keep writing.
5. Once used, the spread page shows their saved reading plus a membership invitation instead of a new draw. The other five spreads stay locked with a short "what you unlock" note.
6. A welcome email delivers a link back to their reading; they are also added to a MailerLite free-signup group for the ongoing nurture sequence you write there.
7. Upgrading is one click to the membership page; after paying, their free limit disappears and nothing needs migrating.

## What a free member sees

- Their one saved reading, editable journal answers, and the membership invitation.
- Locked previews of the other spreads, card decks, courses and the rest of the Temple, each with a join button.
- No access to Remembrance Letters, Living Pattern, Field Notes, courses, or unlimited decks.

## Technical details

- Database: add a free-entitlement marker (a `free_reading_used_at` column on `profiles`, plus `is_free_account` derived from the absence of membership). Add a `has_free_spread_access(user_id)` helper so the reading function and page share one rule.
- Sign-up: new `signup_mode=free` path in `Auth.tsx` that does not store a pending price and does not redirect to checkout. Keep the existing signup-guard rate limits and disposable-domain blocking.
- Landing: new public `FreeReadingLanding.tsx` route `/free-reading` with its own title/description meta, plus a free-offer section on the membership page.
- Spread access: `SacredSpreads.tsx` gates the spread list — free accounts get Past, Present, Future only, and only while `free_reading_used_at` is null. `generate-sacred-spread-reading` accepts free accounts under the same server-side rule and stamps `free_reading_used_at` on first success, so the limit cannot be bypassed from the browser.
- Saving: free accounts may save exactly one reading; `saved_readings` policies enforce the cap for non-members.
- Emails: app-side welcome email template (`free-reading-welcome`) sent from a small edge function after signup; MailerLite sync extended with a free-signup group for marketing.
- Upsell: reusable `MembershipInvite` block used under the free reading and on locked spreads.

## Verification

- Free signup creates an account with no Stripe redirect, sends the welcome email, and adds the MailerLite contact.
- The free account can draw Past, Present, Future once, gets a written reading, and can save and edit journal answers.
- A second attempt is refused both in the page and directly at the server.
- Other spreads and member areas stay locked, and paying members are unaffected.
- Landing page and membership section render correctly on mobile and desktop.
