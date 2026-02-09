# Cohort Analysis: User Segmentation & Retention

## Segmentation Model

Users are segmented by **behavioral depth** (events per week) rather than demographics. Behavioral segmentation predicts retention 3x better than demographic segmentation in our data.

```
                    EVENTS PER WEEK
                    
  0        1-2        3-7        8+
  │         │          │          │
  ▼         ▼          ▼          ▼
┌────────┐┌──────────┐┌──────────┐┌──────────┐
│AT-RISK ││ CASUAL   ││  CORE    ││  POWER   │
│  15%   ││   25%    ││   45%    ││   15%    │
│        ││          ││          ││          │
│ 8% ret ││ 25% ret  ││ 55% ret  ││ 85% ret  │
│        ││          ││          ││          │
│Win-back││Activation││  Habit   ││  Amplify │
│nudges  ││optimize  ││  loops   ││  virality│
└────────┘└──────────┘└──────────┘└──────────┘
```

---

## Segment Profiles

### Power Users (15% of users)
**Behavior:** 8+ events/week, multiple input sources, family sharing active
**Retention:** 85% W1, 72% W4
**Profile:** Parents with 2+ children in organized activities. Use photo capture 60% of the time. First to adopt new features.
**Strategy:** Model their behaviors for other segments. Amplify viral loops (they're the best referrers). Upsell premium features.

### Core Users (45% of users)
**Behavior:** 3-7 events/week, primarily photo and email input
**Retention:** 55% W1, 38% W4
**Profile:** Parents with 1-2 children. Use the product when events arrive (reactive, not habitual). Need reminders to return.
**Strategy:** Convert to habitual usage through push notifications, weekly digest, and "Up Next" as the default landing experience. This is the segment where the PLG friction audit had the most impact.

### Casual Users (25% of users)
**Behavior:** 1-2 events/week, single input source (usually photo)
**Retention:** 25% W1, 12% W4
**Profile:** Parents who tried the product for a specific use case (one school flyer) but didn't build a habit. Often have simpler schedules.
**Strategy:** Reduce activation friction. The empty state / first-run experience targets this segment. Auto-detection of events from email could convert them to passive users.

### At-Risk Users (15% of users)
**Behavior:** 0 events in the past 7 days
**Retention:** 8% W1 (effectively churned)
**Strategy:** Win-back campaigns via push notification: "📷 3 events may be waiting — snap a photo to catch up." If no engagement after 2 nudges, mark as churned and stop notifications (respect user attention).

---

## Retention Curves

```
100% ┤
     │ ██
 90% ┤ ██
     │ ██
 80% ┤ ██ ← Power Users (85% W1)
     │ ██
 70% ┤ ██ ···
     │ ██    ···
 60% ┤ ██       ··· ← Power Users (72% W4)
     │ ██
 50% ┤ ██ ▓▓ ← Core Users (55% W1)
     │ ██ ▓▓
 40% ┤ ██ ▓▓ ···
     │ ██ ▓▓    ··· ← Core Users (38% W4)
 30% ┤ ██ ▓▓
     │ ██ ▓▓ ░░ ← Casual Users (25% W1)
 20% ┤ ██ ▓▓ ░░
     │ ██ ▓▓ ░░ ···
 10% ┤ ██ ▓▓ ░░    ··· ← Casual Users (12% W4)
     │ ██ ▓▓ ░░ ▒▒ ← At-Risk (8%)
  0% ┤────────────────────
     W0  W1  W2  W3  W4
```

**Key insight:** The retention cliff is between Week 0 and Week 1. Users who survive W1 have significantly better W4 retention. This means the activation experience (first 7 days) is the highest-leverage investment.

---

## Behavioral Predictors of Retention

Analysis of beta data identified early signals that predict W4 retention:

| Signal (Day 0-3) | W4 Retention if YES | W4 Retention if NO | Predictive Power |
|-------------------|:-------------------:|:------------------:|:----------------:|
| Added 2+ events in first session | 52% | 18% | Strong |
| Used 2+ input sources | 61% | 24% | Strong |
| Returned within 48 hours | 58% | 15% | Very Strong |
| Approved an auto-suggested event | 48% | 22% | Moderate |
| Invited a family member | 67% | 29% | Very Strong |

**Strongest predictor:** Return within 48 hours. If we can get a user back within 2 days of signup, their W4 retention nearly quadruples.

**Activation checklist** (designed from these predictors):
1. ✅ Add your first event (photo capture)
2. ✅ Add a second event (any source)
3. ✅ Approve an AI-suggested event
4. ✅ Invite a family member
5. ✅ Check your calendar the next day

Users who complete 4/5 within 72 hours have 63% W4 retention.

---

## Conversion Funnel by Segment

```
                Power    Core     Casual   At-Risk
                ─────    ─────    ──────   ───────
Visit           100%     100%     100%     100%
  ↓ Signup      32%      18%      12%       8%
  ↓ 1st Event   95%      72%      45%      20%
  ↓ Day 7       88%      55%      28%      10%
  ↓ W1 Active   85%      55%      25%       8%
  ↓ W4 Active   72%      38%      12%       3%
  ↓ Trial       45%      15%       5%       0%
  ↓ Paid        28%       8%       2%       0%
```

**Observation:** The Power → Core gap is manageable (optimize habits). The Core → Casual gap is structural (fundamentally different use patterns). Growth strategy should focus on converting Casual → Core rather than acquiring more Casuals.

---

## Actionable Insights

1. **Focus on the W0 → W1 cliff.** Every percentage point of W1 retention improvement has compounding effects on W4 and revenue. The PLG friction audit directly targets this.

2. **48-hour return is the critical moment.** Design the push notification strategy around getting users back within 48 hours: "📷 We noticed a school email — want to scan it?"

3. **Two input sources = 2.5x retention.** Users who discover a second input method (e.g., voice after photo) are significantly stickier. The onboarding should explicitly showcase multiple input options.

4. **Family sharing is the viral unlock.** Users who invite a family member have 67% W4 retention vs. 29%. The invite flow should be prominent, not buried.

5. **Casual users need passive value.** They won't actively capture events. Email forwarding auto-detection could convert them to passive beneficiaries of the AI — events appear without effort.
