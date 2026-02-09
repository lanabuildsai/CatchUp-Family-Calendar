# Agentic AI Architecture: When to Use Agents vs. Deterministic Pipelines

## The Decision

CatchUp's most important architecture decision was **choosing NOT to use agents for the core extraction pipeline** — and designing a clear framework for where agents DO belong.

---

## The Framework

```
                    TASK COMPLEXITY
                    
         Simple              Complex
         extraction          coordination
         
    ┌──────────────────┬──────────────────┐
    │                  │                  │
    │  DETERMINISTIC   │    AGENTIC       │
    │  PIPELINE        │    WORKFLOW      │
    │                  │                  │
    │  • Parse document│  • Plan playdate │
    │  • Extract fields│  • Resolve       │
    │  • Score conf.   │    conflicts     │
    │  • Route to      │  • Match prefs   │
    │    review        │  • Negotiate     │
    │                  │    time slots    │
    │  Fixed steps     │  Dynamic         │
    │  Predictable     │  reasoning       │
    │  Debuggable      │  Adaptive        │
    │                  │                  │
    └──────────────────┴──────────────────┘
```

**Rule of thumb:** If the task has a known sequence of steps and the output schema is fixed, use a deterministic pipeline. If the task requires reasoning over multiple data sources with variable paths, use agents.

---

## Comparison Matrix

| Factor | Deterministic Pipeline ✅ | Agentic Workflow |
|--------|--------------------------|-----------------|
| **Latency** | 2-3s predictable | 8-15s variable (reasoning loops) |
| **Consistency** | Same input → same output | Non-deterministic across runs |
| **Debuggability** | Step-by-step trace, clear failure points | Opaque chain-of-thought |
| **User Trust** | "Tuesday 3 PM" is always "Tuesday 3 PM" | May reason differently per run |
| **Cost** | 1 API call per extraction | 3-7 calls per orchestration |
| **Error Handling** | Known failure modes per step | Emergent failures from reasoning |
| **Scalability** | Linear cost scaling | Superlinear (more calls per task) |
| **When to Use** | Extraction, classification, scoring | Coordination, planning, negotiation |

---

## Why Not Agents for Extraction

### The Trust Problem
When a parent sees "Soccer Practice · Tuesday 3:00 PM · Lincoln Park," they need to trust it's correct. An agent that "reasons" about the date might:
- Run 1: Interpret "this Tuesday" as March 12
- Run 2: Interpret "this Tuesday" as March 19 (different reasoning path)

Non-determinism in extraction erodes trust. For calendar events, **one wrong date = missed event = broken trust.**

### The Latency Problem
Parents check their calendar in 2-second glances. Agent reasoning loops (tool calls, reflection, retry) add 5-12 seconds of variable latency. A deterministic pipeline delivers in 2-3 seconds consistently.

### The Debugging Problem
When an extraction is wrong, we need to know exactly where it failed: was it the date parsing? The location resolution? The confidence scoring? A deterministic pipeline has clear step boundaries. An agent's reasoning chain is opaque — "it thought about it and got it wrong" is not actionable.

---

## Where Agents Shine: Coordination Tasks

CatchUp designed (but did not ship) three agentic modules for V2. These are tasks where **reasoning IS the value proposition:**

### Module 1: Playdate Coordination
```
User: "Can Lily have a playdate this week?"

Agent workflow:
1. [TOOL: Calendar] Check Lily's schedule for open slots
2. [TOOL: Contacts] Retrieve compatible friends (age, distance, preferences)
3. [REASON] Score each friend × time slot for compatibility
4. [TOOL: Calendar] Check other families' shared availability
5. [REASON] Resolve conflicts, rank options
6. [TOOL: Message] Draft invitation to top match
7. [HUMAN] Present top 3 options for parent approval
```

Why agents work here: The task requires **multi-step reasoning** over multiple data sources (calendars, contacts, preferences) with variable paths depending on availability.

### Module 2: Gift Recommendations
```
User: "Ava's birthday is in 2 weeks"

Agent workflow:
1. [TOOL: Profile] Retrieve Ava's age, interests, past gifts
2. [TOOL: Search] Find age-appropriate gift ideas
3. [REASON] Filter by budget, availability, past gifts (avoid duplicates)
4. [TOOL: Calendar] Check delivery timing against party date
5. [REASON] Rank by match score
6. [HUMAN] Present top 5 with reasoning
```

### Module 3: Schedule Optimization
```
User: "I need a haircut but I'm swamped this week"

Agent workflow:
1. [TOOL: Calendar] Scan for gaps in schedule
2. [TOOL: Search] Find available appointments at preferred salon
3. [REASON] Match salon availability × calendar gaps × travel time
4. [TOOL: Calendar] Check for kid coverage (partner/sitter availability)
5. [REASON] Rank options by convenience score
6. [HUMAN] Present top 3 with tradeoffs explained
```

---

## Multi-Agent Orchestration Pattern

For complex coordination, a **router agent** delegates to specialized sub-agents:

```
┌─────────────────────────────────────────────┐
│              ROUTER AGENT                    │
│  Classifies intent → delegates to module     │
├──────────┬──────────┬───────────────────────┤
│          │          │                       │
▼          ▼          ▼                       │
┌────────┐ ┌────────┐ ┌──────────┐           │
│ Play   │ │ Gifts  │ │ Schedule │           │
│ Agent  │ │ Agent  │ │ Agent    │           │
│        │ │        │ │          │           │
│ Tools: │ │ Tools: │ │ Tools:   │           │
│ Calendar│ │ Search │ │ Calendar │           │
│ Contacts│ │ Profile│ │ Search   │           │
│ Message│ │ Budget │ │ Location │           │
└────────┘ └────────┘ └──────────┘           │
     │          │          │                  │
     └──────────┴──────────┘                  │
                │                             │
         ┌──────────────┐                     │
         │ HUMAN REVIEW │ ←── Always in loop  │
         │ Approve/Edit │                     │
         └──────────────┘                     │
```

**Design principles:**
1. **Router classifies, never executes.** Misrouting is cheaper than misexecution.
2. **Each agent has bounded tools.** No agent can access everything.
3. **Human-in-the-loop at every terminal step.** Agents suggest; humans confirm.
4. **Fallback to deterministic.** If agent reasoning fails (timeout, error), fall back to a simpler deterministic path.

---

## Decision Checklist: Agents vs. Deterministic

Use this checklist when designing a new AI feature:

| Question | If YES → | If NO → |
|----------|----------|---------|
| Does the task require reasoning over multiple data sources? | Consider agents | Use pipeline |
| Is the output schema fixed and known? | Use pipeline | Consider agents |
| Does the user need to trust the output is the same every time? | Use pipeline | Agents OK |
| Is latency critical (<3 seconds)? | Use pipeline | Agents OK |
| Are there more than 3 sequential steps with branching logic? | Consider agents | Use pipeline |
| Does the task involve negotiation or optimization? | Consider agents | Use pipeline |
| Is debuggability critical for compliance/audit? | Use pipeline | Agents OK |

---

## Lessons Learned

1. **Start deterministic, add agents later.** It's easy to add agent capabilities to a working deterministic system. It's hard to make a flaky agent system reliable.

2. **Agents are not "better AI."** They're a different tool for a different job. Using agents for extraction is like using a search engine to do arithmetic — technically possible, unnecessarily complex, and less reliable.

3. **The hybrid is the answer.** Most real products need both: deterministic pipelines for data processing, agents for coordination and planning. Design clear boundaries between them.

4. **Human-in-the-loop is non-negotiable for agents.** Agent reasoning is non-deterministic. Until we can formally verify agent behavior, a human must approve any action with real-world consequences.

5. **Cost model matters.** A deterministic extraction costs 1 API call. An agent orchestration costs 3-7. At scale, this is the difference between viable and unsustainable unit economics.
