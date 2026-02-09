# RAG-Style Context Injection for Document Extraction

## Overview

CatchUp uses **retrieval-augmented prompting** — injecting user-specific context into extraction prompts at inference time — to dramatically improve accuracy without fine-tuning models. This is the same RAG pattern used in enterprise knowledge bases, applied to a consumer document intelligence product.

The result: **+13 points accuracy improvement** from context injection alone, the single largest gain in the entire iteration cycle.

---

## The Problem with Context-Free Extraction

Without user-specific context, the AI operates blind on two critical fields:

**Dates:** "This Thursday," "next Saturday," "the 3rd" are meaningless without knowing today's date.

**Locations:** "Sarah's house," "the gym," "Room 204" are meaningless without knowing the user's prior locations.

V1 (context-free) achieved only 72% accuracy. Most errors were on exactly these two fields.

---

## Three Context Injection Strategies

### 1. Temporal Anchoring

**What:** Inject current date, day-of-week, and calendar context into every prompt.

**Implementation:**
```
System context injected at prompt construction:

  Today's date: {YYYY-MM-DD} ({day_of_week})
  Current school year: September through June
  
  Resolution rules:
  - "this Thursday" → {calculated_next_thursday}
  - "next week" → week of {calculated_next_monday}
  - "the 3rd" → 3rd of current month, or next month if passed
```

**Impact:** Date accuracy 68% → 81% (+13 points). Cost: ~20 extra tokens per prompt.

**Why it works:** LLMs have no sense of "now." They process text in a temporal vacuum. Injecting today's date anchors all relative references to a concrete point. This is trivial to implement but has outsized impact — one of the highest-ROI prompt techniques.

---

### 2. Per-User Location Retrieval (The RAG Pattern)

**What:** Maintain a per-user location history store. At extraction time, retrieve relevant locations and inject them into the prompt as grounding context.

**This is the core RAG pattern:**
```
Query (new document) → Retrieve (user's known locations) → Augment (inject into prompt) → Generate (extraction with context)
```

**Location Store Schema:**
```json
{
  "userId": "u_001",
  "locations": [
    {
      "aliases": ["sarahs house", "sarah's place", "at sarah's"],
      "resolved": "Sarah Chen, 142 Oak Lane, Maple Heights",
      "uses": 12,
      "lastUsed": "2024-03-10",
      "source": "user_correction"
    },
    {
      "aliases": ["the gym", "main gym"],
      "resolved": "Lincoln Elementary Gymnasium",
      "uses": 8,
      "lastUsed": "2024-03-08",
      "source": "user_correction"
    },
    {
      "aliases": ["room 204"],
      "resolved": "Room 204, Washington Middle School",
      "uses": 5,
      "lastUsed": "2024-03-05",
      "source": "auto_detected"
    }
  ]
}
```

**Prompt Injection:**
```
KNOWN LOCATIONS for this user:
- "Sarah's house" / "Sarah's place" / "at Sarah's" → Sarah Chen, 142 Oak Lane
- "the gym" / "main gym" → Lincoln Elementary Gymnasium  
- "Room 204" → Room 204, Washington Middle School

RULES:
- If location matches a known alias, use the resolved form. Confidence += 0.05
- If location is partially matching, suggest the resolved form. Confidence unchanged.
- If location is ambiguous or unknown, return null. DO NOT guess.
```

**Impact:** Location accuracy 71% → 84% (+13 points). This was the single largest accuracy improvement across all iterations.

**Why it works:** The location store acts as a **user-specific knowledge base.** Each user accumulates a personalized "vocabulary" of locations through their corrections. After 2 weeks of usage, the average user had 8-12 cached locations covering ~85% of their event venues. The retrieval cost is negligible (Firebase read), but the accuracy impact is massive.

---

### 3. User Correction History as Training Signal

**What:** Every time a user corrects an extracted field, log the correction and use it to improve future extractions for that user AND to identify systemic prompt failures.

**Correction Log Schema:**
```json
{
  "extractionId": "ext_001",
  "userId": "u_001",
  "field": "location",
  "original": "the gym",
  "corrected": "Lincoln Elementary Gymnasium",
  "timestamp": "2024-03-08T14:22:00Z",
  "source": "photo",
  "confidence_at_extraction": 0.72
}
```

**Two uses of correction data:**

**Per-user improvement:** Corrections populate the location cache and tune confidence thresholds per user. Heavy editors get lower auto-approve thresholds; users who rarely edit get higher ones.

**Systemic improvement:** Aggregate corrections across all users reveal prompt-level failures. When >10% of users correct the same pattern (e.g., "next Saturday" being off by a week), it triggers a prompt revision.

```
Weekly Analysis Pipeline:
1. Aggregate corrections by field and pattern
2. Identify top failure mode (>5% error rate on any pattern)
3. Design prompt fix targeting that pattern
4. Deploy in next iteration
5. Measure correction rate drop
```

---

## RAG Architecture Comparison

| Component | CatchUp Implementation | Enterprise RAG Equivalent |
|-----------|----------------------|--------------------------|
| **Knowledge Store** | Firebase per-user location cache | Vector database (Pinecone, Weaviate) |
| **Retrieval** | Exact + fuzzy alias matching | Semantic similarity search |
| **Augmentation** | Inject locations + temporal context into prompt | Inject relevant document chunks into prompt |
| **Generation** | GPT-4 extracts structured JSON | LLM generates answer with grounded context |
| **Feedback Loop** | User corrections → cache updates | User ratings → retrieval ranking updates |

**Key similarity:** Both systems solve the same fundamental problem — **LLMs lack domain-specific context at inference time.** The solution is the same: retrieve relevant context, inject it into the prompt, and ground the generation in user-specific data.

**Key difference:** CatchUp uses structured retrieval (exact field matching) rather than semantic vector search. For location aliases, exact/fuzzy matching is more reliable than embedding similarity. Enterprise RAG typically needs semantic search because queries are more open-ended.

---

## Results Summary

| Strategy | Field Improved | Accuracy Gain | Token Cost | Iteration |
|----------|:-------------:|:-------------:|:----------:|:---------:|
| Temporal Anchoring | Dates | +13 pts | ~20 tokens | V2 |
| Location Retrieval | Locations | +13 pts | ~50-100 tokens | V3 |
| Confidence Rules | Routing quality | +4 pts overall | ~40 tokens | V4 |
| **Combined** | **Overall** | **+20 pts (72% → 92%)** | **~110-160 tokens** | **V1 → V4** |

**Total cost of context injection: ~110-160 extra tokens per prompt.** At GPT-4 pricing, this is approximately $0.003-0.005 per extraction. The accuracy gain is worth orders of magnitude more than the token cost.

---

## Lessons for Enterprise RAG

1. **Start with structured retrieval before semantic search.** If your use case has known entities (locations, clause types, product names), exact matching is faster, cheaper, and more reliable than vector similarity.

2. **User corrections are the highest-quality training data.** When a user corrects "the gym" to "Lincoln Elementary Gymnasium," that's a perfect supervised learning signal. Design your UX to capture these corrections with minimal friction.

3. **Context > capability.** A less capable model with the right context outperforms a more capable model without it. Before upgrading your LLM, ask: "What context is this model missing?"

4. **Retrieval quality compounds.** Each correction improves the knowledge store, which improves future retrievals, which reduces future corrections. Design for this flywheel from day one.

5. **Measure retrieval impact separately from generation impact.** Track accuracy with and without context injection to understand the value of your retrieval layer independent of your LLM.
