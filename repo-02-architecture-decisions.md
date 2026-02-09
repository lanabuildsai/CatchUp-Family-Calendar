# Architecture Decision Records

## ADR-001: Three-Layer Pipeline (Capture → Extraction → Validation)

**Status:** Adopted

**Decision:** Separate the system into three layers that can be tested, monitored, and improved independently.

**Rationale:** Adding new input sources only requires a new Capture adapter. Extraction model improvements don't affect validation logic. Confidence thresholds can be tuned without retraining models.

**Consequence:** ~200ms additional latency from layer handoffs. Significantly easier debugging — when an extraction is wrong, the failure is isolated to a specific layer.

---

## ADR-002: GPT-4 Vision over Tesseract OCR

**Status:** Adopted

| Factor | GPT-4 Vision ✅ | Tesseract + NLP |
|--------|----------------|-----------------|
| Semantic understanding | Knows "Spring Fair" is a title | Raw text needs NLP pipeline |
| Complex layouts | Handles tables, decorative fonts | Struggles with multi-column |
| First-pass accuracy | 89% on 50 school flyers | 62% |
| Cost per image | $0.01-0.03 | Free |
| Latency | 1.5-3s | 0.5-1s |

**Decision:** GPT-4 Vision for primary extraction. Tesseract as offline fallback.

**Rationale:** School flyers have decorative fonts, multi-column layouts, and embedded images. GPT-4 Vision understands semantic structure directly. The $0.03/extraction cost is acceptable at consumer scale (~$1.50/family/month).

---

## ADR-003: Confidence Threshold at 0.90

**Status:** Adopted (V4)

Calibrated against beta data to balance auto-approve volume vs. error rate:

| Threshold | Auto-Approve Rate | Error Rate | Assessment |
|:---------:|:-----------------:|:----------:|:----------:|
| 0.95 | 34% | 0.8% | Too much manual review |
| **0.90** | **68%** | **2.1%** | **Optimal balance** |
| 0.85 | 81% | 6.8% | Errors noticed by users |
| 0.80 | 89% | 11.2% | Trust eroded |

**Confidence scoring rules:**
```
Base: 0.85
+0.05  Location matches user history
+0.03  Source is structured (email with ICS)
-0.15  Relative date AND >7 days out
-0.10  Tentative language ("maybe", "?", "TBD")
-0.05  Any field is null
-0.08  Date conflict with existing event
```

---

## ADR-004: Per-User Location Cache (RAG Pattern)

**Status:** Adopted (V3)

**Decision:** Maintain a per-user location store and inject historical locations into extraction prompts at inference time.

**Impact:** Location accuracy +13 points (71% → 84%). Single largest accuracy gain in all iterations.

**Implementation:** Firebase document per user. Aliases map to resolved addresses. Cache grows with each user correction. After 2 weeks, average user has 8-12 cached locations covering ~85% of venues.

→ See [RAG & Context Injection](03-rag-context-injection.md) for full details.

---

## ADR-005: Deterministic Pipeline (Not Agents) for Extraction

**Status:** Adopted

**Decision:** Use a fixed-step deterministic pipeline for document extraction. Reserve agentic architecture for coordination features.

**Rationale:** Extraction requires consistency (same input → same output), low latency (2-3s), and debuggability. Agents add non-determinism, 3-5x latency, and opaque reasoning chains.

→ See [Agentic Architecture](05-agentic-architecture.md) for full comparison.

---

## Technology Stack Rationale

| Component | Choice | Why |
|-----------|--------|-----|
| Mobile | React Native | Cross-platform, fast iteration, large ecosystem |
| Backend | Node.js + Express | JavaScript throughout, async I/O for API calls |
| Database | Firebase Firestore | Real-time sync for family sharing, serverless |
| Image AI | GPT-4 Vision | Semantic understanding of complex document layouts |
| Voice AI | Whisper API | Best-in-class speech-to-text accuracy |
| Text AI | GPT-4 Turbo | Structured prompting for message/email parsing |
| Analytics | Segment → BigQuery → dbt → Looker | Industry-standard composable stack |
