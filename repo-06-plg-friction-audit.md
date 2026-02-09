# CatchUp Home Screen — PLG Friction Audit

## Framework
Evaluating through the PLG activation loop: **Land → Capture Value → Aha Moment → Habit → Expand**

Every extra click, every unexplained element, every moment of "wait, what do I do?" is a drop-off risk. In PLG, the product IS the sales team — if the home screen doesn't convert a visitor to an activated user in under 60 seconds, you've lost them.

---

## 🔴 Critical Friction (Likely Causing Drop-off)

### 1. No "Up Next" — the #1 reason people open a calendar app
**What's wrong:** User opens CatchUp and sees a month grid + pending sidebar. But the most common calendar action is a 2-second glance: *"What's my next thing?"* The "Today" mini-agenda is buried at the bottom of the right sidebar, below 4 pending event cards that require scrolling. Most users will never see it.

**Impact:** Fails the "glance test." If CatchUp can't replace the user's lock-screen calendar widget for the most basic need, it becomes a secondary app they open occasionally — not a daily driver.

**Fix:** Add an "Up Next" strip directly below the Add Event bar, before the main 2/3+1/3 layout. One line: `⏰ Up Next: Team Standup · 10:00 AM · Zoom — in 23 min`. Always visible. Tapping it opens Event detail view. This is what Apple Calendar, Google Calendar, and Fantastical all lead with.

---

### 2. No "Approve All" for high-confidence events
**What's wrong:** 4 pending events × 3 buttons each (Approve / Edit / Dismiss) = 12 decisions on first load. The user just wanted to check their schedule. Now they're doing review work. The 96%-confidence "Dentist — Lily" from email shouldn't need the same review process as the 79%-confidence WhatsApp playdate.

**Impact:** Cognitive overload on every visit. Users learn that opening CatchUp = chore. This kills daily return rate — exactly the metric that was already concerning in beta (52% W1 retention vs 60% target).

**Fix:**
- **Auto-approve events ≥90% confidence** with a dismissable "✓ 2 events auto-added" banner (matches the HITL design: ≥85% auto-approve threshold).
- Add **"Approve All (2)"** button at the top of the pending queue for remaining events.
- Only show individual Approve/Edit/Dismiss for events below the confidence threshold.
- Net result: 4 pending events → user sees 2 auto-added + 2 requiring quick review. Decision count drops from 12 to ~4.

---

### 3. "Edit" navigates away from Home entirely
**What's wrong:** Clicking "Edit" on a pending event triggers `onNavigate("pipeline")`, which switches to the AI Pipeline tab. The user loses their calendar context, their pending queue position, and has to mentally switch modes. Then there's no clear path back to finish reviewing the remaining pending events.

**Impact:** Classic PLG anti-pattern — forcing a context switch in the middle of a flow. Users who click Edit on event #2 of 4 will likely not return to approve events #3 and #4.

**Fix:** Inline editing. Clicking "Edit" should expand the pending card in-place to show editable fields (date picker, time picker, location text input). "Save" collapses it back. Never leave the Home screen for a simple field correction. Reserve the Pipeline tab for the technical demo / power-user debugging view.

---

### 4. No empty state / first-run experience
**What's wrong:** New users land on a pre-populated calendar with 14+ events, 4 pending items, and a full Today agenda. In reality, Day 1 = empty calendar. There's no onboarding flow, no "Snap your first school flyer to get started," no progressive disclosure.

**Impact:** In PLG, the empty state IS the onboarding. Slack's "You have no messages yet" is one of the most studied empty states in SaaS. A blank CatchUp calendar with a prominent "📷 Snap your first event" CTA would drive activation 3-5x better than a pre-populated demo.

**Fix:** Detect `calendarEvents.length === 0` and render a dedicated first-run state:
- Big centered CTA: "📷 Snap a school flyer to add your first event"
- 3-step visual: Snap → AI Extracts → Calendar Updated (15 seconds)
- Social proof: "Join 68 families already using CatchUp"
- Skip the calendar grid entirely until there's at least 1 event

---

### 5. No visible cause → effect when approving
**What's wrong:** When user clicks "✓ Approve," the pending card fades out (opacity + scale animation) and disappears. But nothing visibly happens on the calendar side. The event doesn't animate from sidebar → calendar cell. The user has no confirmation that the event actually landed where it should.

**Impact:** Breaks the feedback loop. The whole CatchUp value proposition is "pending → confirmed on your calendar." If that transition is invisible, the "aha moment" never lands. User thinks: "Did it work? Where did it go?"

**Fix:** On approve: (1) animate the card color from pending-stripe → solid, (2) briefly highlight/pulse the corresponding calendar cell on the left, (3) show a toast: "✓ Spring Fair added to Mar 15." The approved event should immediately appear as a solid pill in the month grid. This is the aha moment — make it unmissable.

---

## 🟡 Medium Friction (Degrading Experience)

### 6. "Event" in the view switcher breaks the mental model
**What's wrong:** The view tabs show: Event | Day | Week | Month | Year. "Event" is not a calendar granularity — it's a detail view. Placing it alongside temporal views violates the established Google/Apple Calendar pattern where the switcher only contains time-based views. Users clicking through Day → Week → Month will be confused when "Event" shows a completely different UI pattern.

**Fix:** Remove "Event" from the view switcher. Make it an overlay/modal or a slide-in panel triggered only by clicking an event pill. The view switcher should only contain: Day | Week | Month | Year.

### 7. Confidence badge is unexplained
**What's wrong:** Pending events show badges like "94%", "87%", "79%". A new user has no idea what this number means. Is it how likely the event is real? How accurate the extracted fields are? How confident the AI is? There's no tooltip, no "?" icon, no first-time explanation.

**Fix:** Add a subtle info icon next to the first badge that shows a one-line tooltip: "AI confidence that these details are correct." Consider showing what drove the score down: "79% — location uncertain" gives the user a reason to edit rather than just a scary number.

### 8. Striped vs. solid is too subtle for the primary UI distinction
**What's wrong:** The entire pending/confirmed system relies on a CSS stripe pattern at 15% opacity vs a solid fill. On smaller screens, lower contrast displays, or at a glance, these look nearly identical. This is the most important visual distinction in the entire product — it separates "done" from "needs your attention."

**Fix:** Stronger differentiation. Options:
- Pending events get a **pulsing left border** or a small **⏳ icon prefix**
- Use a **dotted/dashed border** (more universally understood as "incomplete") instead of stripes
- Add a subtle **"needs review"** label on hover
- Consider making pending events slightly translucent (50% opacity) — universally understood as "ghost/draft"

### 9. Today agenda doesn't sync with calendar view
**What's wrong:** The mini "Today" panel on the right sidebar shows 5 hardcoded events. Switching the calendar to Day view shows the same events in timeline format. There's now redundant information on screen — the left panel (Day view timeline) and the right panel (Today agenda) show identical content.

**Fix:** Make the Today agenda context-aware. When calendar is in Day view, replace Today agenda with "Tomorrow" or "This Week" summary. When in Month/Year view, Today agenda stays. This maximizes information density without redundancy.

### 10. Add Event bar doesn't tell the user what happens next
**What's wrong:** The 6 input sources (Photo, Voice, Email, WhatsApp, Facebook, Gallery) are all equal-weight buttons with no indication of what happens after tapping. Does "Photo" open the camera? Does "Email" ask for a forwarding address? Does "WhatsApp" monitor a chat?

**Fix:** Add micro-copy under each source when expanded:
- 📷 Photo → "Opens camera"
- 🎙️ Voice → "Record a memo"
- ✉️ Email → "Forward to catchup@..."
- 💬 WhatsApp → "Share/paste message"

---

## 🟢 Polish (Nice-to-Have Improvements)

### 11. No search
Calendar users expect Ctrl+F / 🔍. Add a search icon in the calendar header that filters events by title, location, or attendee. Low effort, high perceived completeness.

### 12. No "shared with" indicator
CatchUp's viral loop depends on CatchUp Circles — families sharing availability. But no event on the calendar shows who it's shared with, and there's no CTA to invite another family. The viral mechanic is invisible.

**Fix:** Add a "👥 Shared with 2 families" badge on relevant events, and an "Invite a family" CTA in the sidebar below the Today agenda.

### 13. No notification badge / return trigger
When the user returns after being away, there's no "3 new events captured since your last visit" indicator. PLG apps use these to create urgency. The pending count badge (4) is static — it doesn't communicate recency or urgency.

### 14. Calendar click-to-create
Clicking an empty time slot in Day/Week view should prompt "Add event at 2:00 PM?" — standard in Google Calendar. Currently, empty slots are dead clicks.

### 15. No dark/light mode toggle
Minor, but parents using CatchUp at 6 AM may want a lighter theme. The current dark-only design limits accessibility.

---

## Priority Matrix

| # | Issue | Effort | Impact on Activation | Impact on Retention |
|---|-------|--------|---------------------|-------------------|
| 1 | Up Next strip | S | 🔴 High | 🔴 High |
| 2 | Approve All / auto-approve | M | 🔴 High | 🔴 High |
| 3 | Inline edit (no tab switch) | M | 🔴 High | 🟡 Med |
| 4 | Empty state / onboarding | M | 🔴 High | 🟡 Med |
| 5 | Approve → calendar animation | S | 🟡 Med | 🔴 High |
| 6 | Remove "Event" from switcher | S | 🟡 Med | 🟢 Low |
| 7 | Confidence badge tooltip | S | 🟡 Med | 🟢 Low |
| 8 | Stronger pending visual | S | 🟡 Med | 🟡 Med |
| 9 | Context-aware Today panel | M | 🟢 Low | 🟡 Med |
| 10 | Input source micro-copy | S | 🟡 Med | 🟢 Low |
| 11 | Search | M | 🟢 Low | 🟡 Med |
| 12 | Shared/invite CTA | M | 🟢 Low | 🔴 High |
| 13 | Return notification badge | S | 🟢 Low | 🟡 Med |
| 14 | Click-to-create | M | 🟢 Low | 🟡 Med |
| 15 | Light mode | L | 🟢 Low | 🟢 Low |

**S** = hours, **M** = 1-2 days, **L** = 3+ days

---

## Recommended Sprint

**If I had one week to maximize activation + retention:**

1. **Up Next strip** (4 hrs) — Biggest bang for smallest effort. Makes CatchUp pass the "glance test."
2. **Auto-approve ≥90% + Approve All** (6 hrs) — Cuts review friction by 70%. Directly addresses the retention gap from beta.
3. **Approve → calendar visual feedback** (4 hrs) — Delivers the aha moment. User sees the value loop close.
4. **Inline edit on pending cards** (8 hrs) — Eliminates the worst context-switch. Keeps users in flow.
5. **Remove "Event" from switcher** (1 hr) — Free cleanup, reduces confusion.

**Total: ~23 hrs → measurably better activation funnel.**

The empty state (#4) and viral invite CTA (#12) are next-sprint priorities — they require more design thinking but unlock the acquisition and expansion stages of the PLG loop.
