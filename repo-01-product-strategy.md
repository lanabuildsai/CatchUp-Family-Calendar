# Product Strategy: CatchUp AI

## Problem Definition

**The Information Capture Gap:** Parents spend 10-15 minutes daily scanning school emails, WhatsApp threads, paper flyers, and verbal commitments to manually type events into their calendar. Information is scattered across 6+ channels with no unified capture mechanism.

This isn't a "better calendar" problem. It's a **document intelligence** problem — converting unstructured multi-modal inputs into structured, actionable data.

---

## User Research: Mom Test Methodology

Conducted 15 in-depth interviews using [Mom Test](http://momtestbook.com/) principles: focus on past behavior, not future intent. Never ask "would you use X?" — instead ask "tell me about the last time you missed an event."

### Research Protocol
- Open-ended behavioral questions only
- No leading questions about solution preferences  
- Focused on concrete examples of information overload
- Validated pain frequency and current workarounds

### Findings

**Information Sources Causing Friction:**
| Source | % Finding "Very Challenging" |
|--------|:---:|
| School flyers (paper/photo) | 85% |
| WhatsApp / group chats | 78% |
| Email newsletters | 71% |
| Verbal commitments | 69% |

**Behavioral Insights:**
- Average time to manually create a calendar event: **5+ minutes**
- Most common workaround: screenshot the flyer, never act on it
- Trust in AI increases significantly when confidence scores are visible
- Visual confirmation preferred over automatic addition (trust gap)
- Family sharing is essential, not optional

---

## Market Sizing

| Level | Estimate | Basis |
|-------|----------|-------|
| **TAM** | 1.5B+ | Global digital calendar users |
| **SAM** | 120M | Parents & caregivers in NA + EU |
| **SOM** | 2M | Tech-forward parents with children under 14 |

---

## Competitive Landscape

| Feature | CatchUp | Ohai | Dola | Cozi | Apple Calendar |
|---------|:-------:|:----:|:----:|:----:|:--------------:|
| AI Event Capture | ✅ Photo/Voice/Text | ✅ Photo/Voice/Human | ⚠️ Email only | ❌ Manual | ❌ Manual |
| Multi-modal Input | ✅ 6 sources | ✅ 3 sources | ❌ | ❌ | ❌ |
| Confidence Scoring | ✅ Visible to user | ❌ | ❌ | ❌ | ❌ |
| Family Sharing | ✅ Built-in | ✅ | ⚠️ | ✅ | ⚠️ |
| Price Point | $4.99/mo | Freemium/paid | Free | $29.99/yr | Free |

**Differentiation:** CatchUp is the only product combining multi-modal AI extraction with visible confidence scoring and human-in-the-loop validation. Competitors either use human assistants (expensive, slow) or offer no AI extraction at all.

---

## Feature Prioritization (MoSCoW)

### Must Have (MVP)
- Photo-to-calendar extraction (GPT-4 Vision)
- Voice memo extraction (Whisper API)
- Text/email parsing
- Confidence scoring with threshold routing
- Human review with inline editing
- Calendar integration (Google/Apple)

### Should Have (V2)
- Family sharing ("CatchUp Circles")
- Push notification reminders
- Auto-approve for high-confidence events
- Return notification badges

### Could Have (V3)
- Playdate coordination (agentic module)
- Gift/birthday planning assistant
- Personal schedule optimization
- Recurring event detection

### Won't Have (This Phase)
- Full social network features
- E-commerce / booking integration
- Multi-language support
- Enterprise/school admin portal

---

## Success Metrics

### North Star Metric
**Events Added per Active User per Week**
- Measures core value delivery
- Target: 3+ events/week
- Correlates with retention and satisfaction

### AARRR Funnel Targets

| Stage | Metric | Beta Actual | Target | Gap |
|-------|--------|:-----------:|:------:|:---:|
| Acquisition | Signup rate | 15% | 18% | -3 pts |
| Activation | Day 7 activated | 40% | 55% | -15 pts |
| Retention | W1 retention | 52% | 60% | -8 pts |
| Revenue | Trial → Paid | 12% | 20% | -8 pts |
| Referral | Viral coefficient | 0.25 | 0.35 | -0.10 |

→ See [Analytics Documentation](../analytics/measurement-strategy.md) for full measurement framework.

---

## Key Product Decisions

1. **Deterministic pipeline over agents** — Reliability > flexibility for extraction tasks where users need to trust the output. [→ Full analysis](05-agentic-architecture.md)

2. **Visible confidence scores** — Research showed trust increases when users can see AI uncertainty. Hiding it creates a black box that erodes adoption.

3. **Auto-approve at ≥90%** — Calibrated threshold balancing review burden vs. error rate. 68% of events skip review, 2.1% error rate. [→ Calibration data](02-architecture-decisions.md)

4. **Inline editing on Home screen** — PLG audit identified context-switching as the #1 friction point. Edit in-place, never navigate away. [→ PLG audit](06-plg-friction-audit.md)

5. **Kill decision at Week 12** — Strong technical validation (92% accuracy) but retention and revenue gaps didn't close. Licensed IP instead of burning runway. [→ Decision framework](07-kill-decision-framework.md)
