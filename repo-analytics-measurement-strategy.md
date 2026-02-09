# Measurement Strategy: Analytics Framework

## North Star Metric

**Events Added per Active User per Week**

This metric captures the core value loop: users input information → AI extracts events → events appear on calendar. It correlates with retention (r=0.82), satisfaction (r=0.74), and monetization (r=0.68).

| Segment | Events/Week | Retention | Revenue Potential |
|---------|:-----------:|:---------:|:-----------------:|
| Power Users | 8+ | 85% | High — will pay for premium |
| Core Users | 3-7 | 55% | Medium — need habit reinforcement |
| Casual Users | 1-2 | 25% | Low — need activation optimization |
| At-Risk | 0 | 8% | Churn — need win-back |

**Target:** 3+ events/week across 60%+ of active users.

---

## AARRR Funnel Framework

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  ACQUISITION │──→│  ACTIVATION  │──→│  RETENTION   │──→│   REVENUE    │──→│   REFERRAL   │
│              │   │              │   │              │   │              │   │              │
│  How users   │   │  First value │   │  Continued   │   │  Conversion  │   │  Viral       │
│  find us     │   │  moment      │   │  usage       │   │  to paid     │   │  growth      │
│              │   │              │   │              │   │              │   │              │
│  Signup Rate │   │  Day 7 Act.  │   │  W1 Ret.     │   │  Trial→Paid  │   │  Viral Coef. │
│  15% actual  │   │  40% actual  │   │  52% actual  │   │  12% actual  │   │  0.25 actual │
│  18% target  │   │  55% target  │   │  60% target  │   │  20% target  │   │  0.35 target │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
```

### Key Conversion Points

| Transition | Current | Target | Optimization |
|-----------|:-------:|:------:|-------------|
| Visit → Signup | 15% | 18% | Reduce photo upload friction |
| Signup → First Event | 67% | 80% | Empty state CTA ("Snap your first flyer") |
| First Event → Day 7 Active | 40% | 55% | Push notifications + onboarding checklist |
| Day 7 → W1 Return | 52% | 60% | Habit loops: "Up Next" + return badges |
| W1 → W4 Retention | 35% | 45% | Value reinforcement + family sharing |
| Free → Trial | 22% | 30% | Value-based paywall after 5th event |
| Trial → Paid | 12% | 20% | Feature gating on premium modules |

---

## Analytics Stack Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        DATA COLLECTION                           │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │ Segment  │  │ Firebase │  │ API Logs │  │ Error Track  │    │
│  │ (events) │  │ Analytics│  │ (extract)│  │ (Sentry)     │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘    │
│       │              │              │               │            │
├───────┴──────────────┴──────────────┴───────────────┴────────────┤
│                        DATA STORAGE                              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │                    BigQuery                              │     │
│  │  • Raw events (append-only)                             │     │
│  │  • User profiles (daily snapshot)                       │     │
│  │  • Extraction logs (every AI call)                      │     │
│  │  • Correction logs (every user edit)                    │     │
│  └────────────────────────┬────────────────────────────────┘     │
│                           │                                      │
├───────────────────────────┴──────────────────────────────────────┤
│                      TRANSFORMATION                              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │                      dbt                                 │     │
│  │  • Standardized metric definitions                      │     │
│  │  • Cohort assignment logic                              │     │
│  │  • Funnel stage calculations                            │     │
│  │  • Retention curve computation                          │     │
│  │  • Experiment assignment + results                      │     │
│  └────────────────────────┬────────────────────────────────┘     │
│                           │                                      │
├───────────────────────────┴──────────────────────────────────────┤
│                      VISUALIZATION                               │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │ Looker   │  │ Metabase │  │ Custom   │  │ Alerts       │    │
│  │ (exec)   │  │ (product)│  │ (ad hoc) │  │ (PagerDuty)  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Event Taxonomy

Every user action generates a structured event for analysis:

### Core Events
| Event | Properties | Purpose |
|-------|-----------|---------|
| `event_captured` | source, type, processing_time | Track input patterns |
| `extraction_completed` | confidence, fields_extracted, model_used | AI performance monitoring |
| `extraction_reviewed` | action (approve/edit/dismiss), time_to_action | HITL efficiency |
| `field_corrected` | field, original, corrected, confidence_at_extraction | Prompt improvement signal |
| `event_added_to_calendar` | source (auto/manual), confidence | Value delivery |
| `calendar_viewed` | view_type (day/week/month), duration | Engagement depth |

### Growth Events
| Event | Properties | Purpose |
|-------|-----------|---------|
| `signup_completed` | source, referral_code | Acquisition tracking |
| `first_event_added` | time_since_signup, source | Activation measurement |
| `family_member_invited` | relationship, accepted | Viral loop tracking |
| `paywall_shown` | trigger, plan_shown | Revenue optimization |
| `subscription_started` | plan, price, trial_used | Revenue tracking |

---

## Dashboard Hierarchy

### 1. Executive Dashboard (Daily)
**Audience:** Leadership, investors
**Metrics:** North Star (events/active user/week), MAU, MRR, LTV:CAC
**Format:** Automated daily email + live Looker dashboard

### 2. Product Dashboard (Weekly)
**Audience:** Product team
**Metrics:** Feature adoption rates, activation funnel, time-to-value, AI accuracy by source type, user edit rates
**Key views:**
- Extraction accuracy by input source (photo vs. voice vs. text)
- Confidence distribution histogram (identify threshold drift)
- Time-to-first-value by onboarding path

### 3. Growth Dashboard (Weekly)
**Audience:** Growth/marketing
**Metrics:** CAC by channel, conversion rates by stage, viral coefficient, referral attribution
**Key views:**
- Funnel waterfall with drop-off percentages
- Cohort retention curves (weekly)
- Channel efficiency scatter (CAC vs. LTV)

### 4. AI/ML Dashboard (Daily)
**Audience:** Engineering, data science
**Metrics:** Extraction accuracy, confidence calibration, model latency, error rates, correction patterns
**Key views:**
- Accuracy trending by model version
- Confidence calibration plot (predicted vs. actual accuracy)
- Top correction patterns (candidates for prompt improvement)
- Latency percentiles (p50, p95, p99)

### 5. Monetization Dashboard (Monthly)
**Audience:** Business, finance
**Metrics:** ARPU, churn rate, plan distribution, upgrade/downgrade flow, renewal rates
**Key views:**
- Revenue waterfall (new + expansion - contraction - churn)
- Pricing sensitivity analysis
- Feature usage by plan tier

---

## Key Derived Metrics

### Metric Definitions (dbt models)

```sql
-- Time to Value: seconds from signup to first event added
time_to_value AS (
  SELECT
    user_id,
    TIMESTAMP_DIFF(
      MIN(CASE WHEN event = 'event_added_to_calendar' THEN timestamp END),
      MIN(CASE WHEN event = 'signup_completed' THEN timestamp END),
      SECOND
    ) AS ttv_seconds
  FROM events
  GROUP BY user_id
)

-- Weekly Retention Rate
weekly_retention AS (
  SELECT
    cohort_week,
    weeks_since_signup,
    COUNT(DISTINCT active_user_id) / COUNT(DISTINCT cohort_user_id) AS retention_rate
  FROM user_activity_weekly
  GROUP BY cohort_week, weeks_since_signup
)

-- AI Accuracy by Source
extraction_accuracy AS (
  SELECT
    source_type,
    COUNT(CASE WHEN corrections = 0 THEN 1 END) / COUNT(*) AS accuracy_rate,
    AVG(confidence) AS avg_confidence,
    COUNT(*) AS total_extractions
  FROM extractions
  GROUP BY source_type
)
```

---

## KPI Summary Table

| Category | Metric | Beta | Target | Gap | Owner |
|----------|--------|:----:|:------:|:---:|-------|
| **Engagement** | Events/active user/week | 4.2 | 5.0 | -0.8 | Product |
| **Engagement** | DAU/MAU ratio | 0.32 | 0.40 | -0.08 | Product |
| **AI Quality** | Extraction accuracy | 92% | 95% | -3 pts | AI/ML |
| **AI Quality** | Auto-approve rate | 68% | 75% | -7 pts | AI/ML |
| **AI Quality** | User edit rate | 6% | <5% | -1 pt | AI/ML |
| **Retention** | W1 retention | 52% | 60% | -8 pts | Growth |
| **Retention** | W4 retention | 35% | 45% | -10 pts | Growth |
| **Revenue** | Trial → Paid | 12% | 20% | -8 pts | Revenue |
| **Revenue** | LTV:CAC | 3.2 | 4.0 | -0.8 | Revenue |
| **Growth** | Viral coefficient | 0.25 | 0.35 | -0.10 | Growth |
