# Prompt Engineering: 4 HITL Iterations (72% → 92%)

## Core Insight

**User corrections are training data.** Every edit a parent makes tells us exactly where the AI is wrong and why. The HITL design isn't just a UX pattern — it's the improvement engine.

---

## Iteration Results

| Ver | Focus | Overall | Edit Rate | Key Change |
|-----|-------|:-------:|:---------:|------------|
| V1 | Baseline | 72% | 34% | Raw extraction, no context |
| V2 | Date context | 82% | 19% | Injected today's date + day-of-week |
| V3 | Location cache | 88% | 11% | Per-user location history (RAG) → **+13 pts** |
| V4 | Confidence | 92% | 6% | Threshold routing: ≥90% auto, <90% human |

**20-point accuracy improvement in 4 weeks. No fine-tuning. No model changes. Prompt engineering only.**

---

## V1: Baseline (Week 1) — 72%

```
Extract event details from this text.
Return JSON with: title, date, time, location
```

**Failures:** "This Thursday" → wrong date. "The gym" → returned as-is. No confidence scoring.

**User edits:** 34% of extractions needed correction. Most edits on dates (relative) and locations (abbreviated).

---

## V2: Temporal Anchoring (Week 2) — 82%

```
Today's date is {today} ({day_of_week}).
The current school year runs September through June.

Resolve ALL relative dates to YYYY-MM-DD:
- "this Thursday" = {next_thursday}
- "next week" = week of {next_monday}
- "the 3rd" = 3rd of current month, or next month if passed

Return JSON with: title, date, time, location, confidence (0.0-1.0)
```

**Impact:** Date accuracy +13 pts. Cost: ~20 extra tokens. Highest-ROI prompt technique.

**Lesson:** LLMs have no sense of "now." Injecting today's date is trivial but has outsized impact.

---

## V3: Location Retrieval — RAG (Week 3) — 88%

```
LOCATION RULES:
- Person's name + "house/place" → keep as-is
- School name → append full name if known
- Abbreviated → expand if in KNOWN LOCATIONS
- Ambiguous → return null (DO NOT guess)

KNOWN LOCATIONS for this user:
{user_location_history}
```

**Impact:** Location accuracy +13 pts. **Single largest accuracy gain in all iterations.**

**Lesson:** Context > capability. A less capable model with user-specific retrieval context outperforms a more capable model without it. This is the core RAG insight applied to document extraction.


---

## V4: Confidence Scoring + Auto-Approve (Week 4) — 92%

```
CONFIDENCE RULES:
- Base confidence: 0.85
- Relative date AND >7 days → confidence -= 0.15
- Location matches history → confidence += 0.05
- ANY field null → confidence -= 0.05
- Tentative language ("maybe","?") → -= 0.10

THRESHOLD: ≥0.90 auto-approve | <0.90 human review

Return JSON: title, date, time, location, type, confidence, confidence_reason
```

**Impact:** Overall +4 pts accuracy, but the real win is **routing quality.** 68% of events skip human review entirely. Cognitive load cut by 70%.

**Lesson:** Product design (how you present AI output) matters as much as model quality. Auto-approve at ≥90% had bigger UX impact than the accuracy improvement itself.

---

## Feedback Flywheel

```
📷 Capture → 🧠 Extract → 📊 Score → ✨ Auto/Review → 📝 Log Edits → 🔧 Tune Prompts → ↩
```

The system improves through use:
1. **Extraction** produces structured output + confidence
2. **Routing** sends high-confidence to auto-approve, low to review
3. **Human edits** logged with field-level granularity
4. **Aggregate analysis** reveals top failure mode
5. **Prompt fix** targets that failure mode
6. **Deploy** → cycle repeats

This is not a one-time optimization. It's a **continuous improvement engine** that compounds with usage.

---

## Impact Summary

| Technique | Accuracy Gain | Token Cost | Core Insight |
|-----------|:------------:|:----------:|-------------|
| Temporal anchoring | +10 pts | ~20 tokens | Context injection is the highest-ROI technique |
| Location retrieval (RAG) | +6 pts | ~50-100 tokens | Per-user data > generic capability |
| Confidence routing | +4 pts | ~40 tokens | Routing quality > extraction quality |
| **Total** | **+20 pts** | **~110-160 tokens** | **~$0.003-0.005 per extraction** |
