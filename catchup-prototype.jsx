import { useState, useEffect, useRef } from "react";

// ══════════════════════════════════════════════════════════════
//  DATA
// ══════════════════════════════════════════════════════════════

const SAMPLE_EXTRACTIONS = [
  {
    id: 1, source: "photo", sourceLabel: "School Flyer", thumbnail: "📄",
    rawInput: "Riverside Elementary Spring Fair — Saturday, March 15, 2025 from 10:00 AM to 3:00 PM at the Main Playground. Games, food trucks, and a silent auction!",
    extracted: { title: "Riverside Elementary Spring Fair", date: "2025-03-15", time: "10:00 AM – 3:00 PM", location: "Main Playground, Riverside Elementary", type: "School Event", notes: "Games, food trucks, silent auction" },
    confidence: 0.94,
    processingSteps: [
      { step: "OCR / Vision API", status: "complete", detail: "GPT-4 Vision extracted 142 tokens", latency: "1.2s" },
      { step: "Entity Extraction", status: "complete", detail: "Date, time, location, title identified", latency: "0.8s" },
      { step: "Date Normalization", status: "complete", detail: "Resolved 'Saturday March 15' → 2025-03-15", latency: "0.1s" },
      { step: "Confidence Scoring", status: "complete", detail: "94% — all key fields extracted", latency: "0.05s" },
      { step: "Conflict Check", status: "complete", detail: "No conflicts detected", latency: "0.2s" }
    ]
  },
  {
    id: 2, source: "voice", sourceLabel: "Voice Memo", thumbnail: "🎙️",
    rawInput: "Hey, don't forget — Lily has soccer practice moved to Thursday this week, 4:30 at Greenfield Park instead of the usual spot.",
    extracted: { title: "Lily's Soccer Practice (Rescheduled)", date: "2025-03-13", time: "4:30 PM", location: "Greenfield Park", type: "Kids Activity", notes: "Moved from regular day/location" },
    confidence: 0.87,
    processingSteps: [
      { step: "Whisper ASR", status: "complete", detail: "Transcribed 22 words, en-US detected", latency: "1.8s" },
      { step: "Intent Classification", status: "complete", detail: "Schedule modification detected", latency: "0.3s" },
      { step: "Entity Extraction", status: "complete", detail: "Person: Lily, Activity: Soccer", latency: "0.6s" },
      { step: "Date Resolution", status: "warning", detail: "'Thursday this week' → 2025-03-13 (relative)", latency: "0.15s" },
      { step: "Confidence Scoring", status: "complete", detail: "87% — relative date reduces confidence", latency: "0.05s" }
    ]
  },
  {
    id: 3, source: "text", sourceLabel: "WhatsApp Message", thumbnail: "💬",
    rawInput: "Hi! Would love to set up a playdate for Emma and Lily this Saturday around 2pm? We could meet at Discovery Park if that works 😊",
    extracted: { title: "Playdate — Emma & Lily", date: "2025-03-15", time: "2:00 PM", location: "Discovery Park", type: "Playdate", notes: "Coordinating with Emma's parent" },
    confidence: 0.79,
    processingSteps: [
      { step: "Text Parsing", status: "complete", detail: "Cleaned emoji, identified intent", latency: "0.4s" },
      { step: "Intent Classification", status: "complete", detail: "Playdate proposal (tentative)", latency: "0.3s" },
      { step: "Entity Extraction", status: "complete", detail: "Children: Emma, Lily", latency: "0.5s" },
      { step: "Date Resolution", status: "warning", detail: "'this Saturday' → relative date", latency: "0.1s" },
      { step: "Confidence Scoring", status: "warning", detail: "79% — tentative language detected", latency: "0.05s" },
      { step: "Conflict Check", status: "warning", detail: "⚠ Overlaps with Spring Fair", latency: "0.2s" }
    ]
  },
  {
    id: 4, source: "email", sourceLabel: "Email Forward", thumbnail: "✉️",
    rawInput: "Subject: Dental Appointment Confirmation\nDr. Sarah Chen, Bright Smiles Pediatric\nAppointment for: Lily B.\nDate: Tuesday, March 18, 2025 at 2:30 PM\nAddress: 4521 Maple Ave, Suite 200",
    extracted: { title: "Lily — Dental Appointment (Dr. Chen)", date: "2025-03-18", time: "2:30 PM", location: "4521 Maple Ave, Suite 200", type: "Appointment", notes: "Pediatric dentistry" },
    confidence: 0.97,
    processingSteps: [
      { step: "Email Parsing", status: "complete", detail: "Structured body detected", latency: "0.3s" },
      { step: "Entity Extraction", status: "complete", detail: "All fields found", latency: "0.4s" },
      { step: "Date Normalization", status: "complete", detail: "Explicit date — high confidence", latency: "0.05s" },
      { step: "Confidence Scoring", status: "complete", detail: "97% — structured email", latency: "0.05s" },
      { step: "Reminder Suggestion", status: "complete", detail: "Auto-set 1-day reminder", latency: "0.1s" }
    ]
  }
];

const CALENDAR_EVENTS = [
  { id: "c1", title: "School Drop-off", date: "2025-03-10", time: "8:00 AM", type: "Routine", color: "#6366f1" },
  { id: "c2", title: "Lily — Dance", date: "2025-03-11", time: "4:00 PM", type: "Kids Activity", color: "#ec4899" },
  { id: "c3", title: "Team Standup", date: "2025-03-12", time: "10:00 AM", type: "Work", color: "#8b5cf6" },
  { id: "c4", title: "Grocery Run", date: "2025-03-12", time: "5:30 PM", type: "Errand", color: "#14b8a6" },
  { id: "c5", title: "Soccer Practice", date: "2025-03-13", time: "4:30 PM", type: "Kids Activity", color: "#ec4899" },
  { id: "c6", title: "Date Night 💕", date: "2025-03-14", time: "7:00 PM", type: "Personal", color: "#f43f5e" },
  { id: "c7", title: "Spring Fair", date: "2025-03-15", time: "10:00 AM", type: "School Event", color: "#f59e0b" },
];

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DATES = [10,11,12,13,14,15,16];
const F = "'DM Sans', -apple-system, sans-serif";
const FM = "'JetBrains Mono', monospace";

const MARCH_GRID = [
  ...[23,24,25,26,27,28].map(d=>({d,month:"feb",dim:true})),
  ...[1].map(d=>({d,month:"mar"})),
  ...[2,3,4,5,6,7,8].map(d=>({d,month:"mar"})),
  ...[9,10,11,12,13,14,15].map(d=>({d,month:"mar"})),
  ...[16,17,18,19,20,21,22].map(d=>({d,month:"mar"})),
  ...[23,24,25,26,27,28,29].map(d=>({d,month:"mar"})),
  ...[30,31].map(d=>({d,month:"mar"})),
  ...[1,2,3,4,5].map(d=>({d,month:"apr",dim:true})),
];

const EXTRA_MONTH_EVENTS = [
  { date:3, title:"PTA Meeting", time:"6:30 PM", color:"#f59e0b" },
  { date:5, title:"Lily's Dance", time:"4:00 PM", color:"#ec4899" },
  { date:7, title:"Grocery Run", time:"10:00 AM", color:"#14b8a6" },
  { date:8, title:"Brunch w/ Sarah", time:"11:00 AM", color:"#f43f5e" },
  { date:10, title:"Dentist (Mom)", time:"2:00 PM", color:"#06b6d4" },
  { date:11, title:"Lily's Dance", time:"4:00 PM", color:"#ec4899" },
  { date:17, title:"Soccer Game", time:"9:00 AM", color:"#10b981" },
  { date:19, title:"Lily's Dance", time:"4:00 PM", color:"#ec4899" },
  { date:20, title:"Parent Coffee", time:"8:30 AM", color:"#f59e0b" },
  { date:22, title:"Lily's Birthday!", time:"All Day", color:"#8b5cf6" },
  { date:24, title:"Spring Break Starts", time:"All Day", color:"#64748b" },
  { date:25, title:"Lily's Dance", time:"4:00 PM", color:"#ec4899" },
  { date:27, title:"Zoo Trip", time:"10:00 AM", color:"#10b981" },
  { date:29, title:"Haircut (Mom)", time:"10:00 AM", color:"#14b8a6" },
];

// ══════════════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════

function Badge({ score }) {
  const p = Math.round(score * 100);
  const c = p >= 90 ? "#10b981" : p >= 80 ? "#f59e0b" : "#ef4444";
  return <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 10px", borderRadius:20, fontSize:12, fontWeight:700, background:`${c}18`, color:c, border:`1.5px solid ${c}40`, fontFamily:FM }}><span style={{ width:6, height:6, borderRadius:"50%", background:c }} />{p}%</span>;
}

function SL({ children }) {
  return <div style={{ fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", letterSpacing:1.2, marginBottom:14 }}>{children}</div>;
}

function Card({ children, style, accent, onClick }) {
  return (
    <div onClick={onClick} style={{ background:"#0f172a", borderRadius:16, border:accent?`2px solid ${accent}40`:"1px solid #1e293b", overflow:"hidden", transition:"all 0.25s", cursor:onClick?"pointer":"default", ...style }}>
      {accent && <div style={{ height:3, background:`linear-gradient(90deg,${accent},${accent}60)` }} />}
      <div style={{ padding:20 }}>{children}</div>
    </div>
  );
}

function PipeStep({ step, i, anim }) {
  const [v, setV] = useState(false);
  useEffect(() => { if(anim){const t=setTimeout(()=>setV(true),i*350);return()=>clearTimeout(t)}else setV(true) },[anim,i]);
  const sc = step.status==="complete"?"#10b981":"#f59e0b";
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 0", opacity:v?1:0, transform:v?"translateX(0)":"translateX(-12px)", transition:"all 0.4s cubic-bezier(.4,0,.2,1)", borderBottom:"1px solid #1e293b" }}>
      <div style={{ width:24, height:24, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, background:`${sc}20`, color:sc, flexShrink:0 }}>{step.status==="complete"?"✓":"⚠"}</div>
      <div style={{ flex:1 }}>
        <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontWeight:600, fontSize:13, color:"#e2e8f0" }}>{step.step}</span><span style={{ fontSize:11, color:"#64748b", fontFamily:FM }}>{step.latency}</span></div>
        <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{step.detail}</div>
      </div>
    </div>
  );
}

// Toast notification component
function Toast({ message, visible }) {
  return (
    <div style={{
      position:"fixed", bottom:24, left:"50%", transform:`translateX(-50%) translateY(${visible?0:20}px)`,
      background:"#10b981", color:"white", padding:"10px 20px", borderRadius:10,
      fontSize:12, fontWeight:700, boxShadow:"0 8px 32px rgba(16,185,129,0.3)",
      opacity:visible?1:0, transition:"all 0.3s ease", zIndex:100, pointerEvents:"none"
    }}>{message}</div>
  );
}

// ══════════════════════════════════════════════════════════════
//  TAB 0: HOME — PLG-OPTIMIZED
// ══════════════════════════════════════════════════════════════

const PENDING_EVENTS = [
  { id:"p1", title:"Spring Fair", source:"📄 Flyer", confidence:0.94, date:"Mar 15", time:"10:00 AM", location:"Main Playground", color:"#f59e0b", updatedAgo:"2 min ago", reason:"All fields high-clarity" },
  { id:"p2", title:"Lily's Soccer (Moved)", source:"🎙️ Voice", confidence:0.87, date:"Mar 13", time:"4:30 PM", location:"Greenfield Park", color:"#ec4899", updatedAgo:"15 min ago", reason:"Relative date lowers score" },
  { id:"p3", title:"Playdate w/ Emma", source:"💬 WhatsApp", confidence:0.79, date:"Mar 15", time:"2:00 PM", location:"Discovery Park", color:"#8b5cf6", updatedAgo:"1 hr ago", reason:"Tentative language + conflict" },
  { id:"p4", title:"Dentist — Lily", source:"✉️ Email", confidence:0.96, date:"Mar 18", time:"2:30 PM", location:"Maple Dental", color:"#06b6d4", updatedAgo:"3 hr ago", reason:"Structured email — highest trust" },
];

const STRIPE_CSS = `.ev-stripe{background:repeating-linear-gradient(135deg,transparent,transparent 2px,currentColor 2px,currentColor 3px)!important;opacity:.15!important;position:absolute;inset:0;border-radius:inherit;pointer-events:none}.ev-pending{border:1.5px dashed currentColor!important;opacity:.55}.ev-pulse{animation:borderPulse 2s infinite}@keyframes borderPulse{0%,100%{border-color:currentColor}50%{border-color:transparent}}`;

function TabHome({ calendarEvents, addedCalIds, onNavigate }) {
  const [fabOpen, setFabOpen] = useState(false);
  const [calView, setCalView] = useState("month");
  const [pendingEvents, setPendingEvents] = useState(PENDING_EVENTS);
  const [justApproved, setJustApproved] = useState([]);
  const [autoApproved, setAutoApproved] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventOverlay, setShowEventOverlay] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [toast, setToast] = useState({ msg:"", vis:false });
  const [showConfTooltip, setShowConfTooltip] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [flashCell, setFlashCell] = useState(null);
  const [newBadge] = useState(3);

  const showToast = (msg) => { setToast({msg,vis:true}); setTimeout(()=>setToast({msg:"",vis:false}),2200); };

  // PLG Fix #2: Auto-approve ≥90% on first load
  useEffect(() => {
    const highConf = PENDING_EVENTS.filter(e => e.confidence >= 0.90);
    if (highConf.length > 0) setAutoApproved(highConf.map(e => e.id));
  }, []);

  const approve = (id) => {
    const ev = pendingEvents.find(e=>e.id===id);
    setJustApproved(p=>[...p,id]);
    // PLG Fix #5: Flash the calendar cell
    if (ev) { const day = parseInt(ev.date.replace("Mar ","")); setFlashCell(day); setTimeout(()=>setFlashCell(null),1500); }
    setTimeout(()=>{ setPendingEvents(p=>p.filter(e=>e.id!==id)); showToast(`✓ ${ev?.title || "Event"} added to calendar`); },600);
  };

  const approveAll = () => {
    pendingEvents.forEach((pe, i) => { setTimeout(()=>approve(pe.id), i*200); });
  };

  const dismissAutoApproved = () => setAutoApproved([]);

  // PLG Fix #3: Inline edit
  const startEdit = (pe) => { setEditingId(pe.id); setEditFields({ date:pe.date, time:pe.time, location:pe.location }); };
  const saveEdit = (id) => {
    setPendingEvents(p => p.map(e => e.id===id ? {...e, ...editFields} : e));
    setEditingId(null); showToast("✏️ Event updated");
  };

  const inputSources = [
    { icon:"📷", label:"Photo", accent:"#6366f1", hint:"Opens camera" },
    { icon:"🎙️", label:"Voice", accent:"#ec4899", hint:"Record a memo" },
    { icon:"✉️", label:"Email", accent:"#06b6d4", hint:"Forward to catchup@..." },
    { icon:"💬", label:"WhatsApp", accent:"#10b981", hint:"Share/paste msg" },
    { icon:"📘", label:"Facebook", accent:"#3b82f6", hint:"Share from FB" },
    { icon:"🖼️", label:"Gallery", accent:"#8b5cf6", hint:"Pick from photos" },
  ];

  // PLG Fix #6: Remove "Event" from switcher — it's now an overlay
  const viewTabs = [{id:"day",label:"Day"},{id:"week",label:"Week"},{id:"month",label:"Month"},{id:"year",label:"Year"}];

  const activePending = pendingEvents.filter(e => !autoApproved.includes(e.id));
  const autoApprovedPending = pendingEvents.filter(e => autoApproved.includes(e.id));

  // Pill: PLG Fix #8 — stronger pending visual (dashed border + lower opacity)
  const Pill = ({ title, color, pending, time, compact, onClick }) => (
    <div onClick={onClick} style={{ position:"relative", overflow:"hidden", cursor:onClick?"pointer":"default", fontSize:compact?7:9, fontWeight:600, padding:compact?"1px 2px":"2px 4px", marginBottom:1, borderRadius:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", color:pending?color:"white", lineHeight:compact?"11px":"14px", background:pending?"transparent":`${color}cc`, border:pending?`1px dashed ${color}60`:"none", opacity:pending?0.65:1 }}>
      {pending && <span style={{ marginRight:2 }}>⏳</span>}
      {!pending && !compact && time && time!=="All Day" ? time.replace(":00","").replace(" ","")+" " : ""}{title}
    </div>
  );

  // ── EVENT OVERLAY (PLG Fix #6 — no longer in switcher) ──
  const EventOverlay = () => {
    const ev = selectedEvent || { title:"Spring Fair", date:"Mar 15", time:"10:00 AM", location:"Main Playground", color:"#f59e0b", type:"School Event", source:"📄 School Flyer", notes:"Annual spring fair with games, food booths, and live music.", attendees:["Mom","Lily","Dad"], shared:2, pending:false };
    return (
      <div style={{ position:"absolute", inset:0, background:"rgba(2,6,23,0.85)", zIndex:20, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:12 }} onClick={()=>setShowEventOverlay(false)}>
        <div onClick={e=>e.stopPropagation()} style={{ background:"#0f172a", borderRadius:16, border:`2px solid ${ev.color}40`, width:"90%", maxWidth:520, padding:20, boxShadow:"0 24px 64px rgba(0,0,0,0.5)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:4, height:36, borderRadius:2, background:ev.color }} />
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:"#f1f5f9" }}>{ev.title}</div>
                <div style={{ fontSize:10, color:"#64748b", marginTop:2 }}>{ev.type || "Event"}{ev.source ? ` · via ${ev.source}` : ""}</div>
              </div>
            </div>
            <button onClick={()=>setShowEventOverlay(false)} style={{ background:"transparent", border:"1px solid #334155", borderRadius:6, color:"#94a3b8", cursor:"pointer", padding:"4px 8px", fontSize:10 }}>✕</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
            {[{icon:"📅",label:"Date",value:ev.date},{icon:"🕐",label:"Time",value:ev.time},{icon:"📍",label:"Location",value:ev.location||"—"},{icon:"👥",label:"Attendees",value:(ev.attendees||["Mom","Lily"]).join(", ")}].map(f=>(
              <div key={f.label} style={{ background:"#0c1322", borderRadius:8, padding:"8px 10px", border:"1px solid #1e293b" }}>
                <div style={{ fontSize:8, color:"#475569", textTransform:"uppercase", letterSpacing:0.5, marginBottom:2 }}>{f.icon} {f.label}</div>
                <div style={{ fontSize:12, fontWeight:600, color:"#e2e8f0" }}>{f.value}</div>
              </div>
            ))}
          </div>
          {ev.notes && <div style={{ background:"#0c1322", borderRadius:8, padding:"8px 10px", border:"1px solid #1e293b", marginBottom:12 }}>
            <div style={{ fontSize:8, color:"#475569", textTransform:"uppercase", letterSpacing:0.5, marginBottom:3 }}>📝 Notes</div>
            <div style={{ fontSize:11, color:"#94a3b8", lineHeight:1.5 }}>{ev.notes}</div>
          </div>}
          {/* PLG Fix #12: Shared indicator + invite CTA */}
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ flex:1, display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:10, color:"#818cf8" }}>👥 Shared with {ev.shared || 2} families</span>
            </div>
            <button style={{ padding:"7px 14px", borderRadius:6, border:"none", cursor:"pointer", background:ev.color, color:"white", fontWeight:700, fontSize:10 }}>✏️ Edit</button>
            <button style={{ padding:"7px 10px", borderRadius:6, border:"1px solid #334155", cursor:"pointer", background:"transparent", color:"#94a3b8", fontWeight:600, fontSize:10 }}>🗑️</button>
          </div>
        </div>
      </div>
    );
  };

  // ── EMPTY STATE (PLG Fix #4) ──
  const EmptyState = () => (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:380, padding:32 }}>
      <div style={{ fontSize:48, marginBottom:12 }}>📷</div>
      <div style={{ fontSize:18, fontWeight:800, color:"#f1f5f9", marginBottom:6, textAlign:"center" }}>Snap your first school flyer</div>
      <div style={{ fontSize:12, color:"#94a3b8", textAlign:"center", maxWidth:340, lineHeight:1.6, marginBottom:20 }}>Take a photo of any flyer, forward an email, or record a voice memo — CatchUp's AI extracts the event details in seconds.</div>
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[{i:"📷",l:"Snap",s:"Photo → Event"},{i:"🧠",l:"AI Extracts",s:"Title, date, time"},{i:"📅",l:"Calendar",s:"Added in 2s"}].map((s,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ background:"#1e293b", borderRadius:10, padding:"10px 14px", textAlign:"center", minWidth:80 }}>
              <div style={{ fontSize:20, marginBottom:2 }}>{s.i}</div>
              <div style={{ fontSize:10, fontWeight:700, color:"#818cf8" }}>{s.l}</div>
              <div style={{ fontSize:8, color:"#64748b", marginTop:1 }}>{s.s}</div>
            </div>
            {i<2 && <span style={{ fontSize:16, color:"#334155" }}>→</span>}
          </div>
        ))}
      </div>
      <button onClick={()=>setShowEmptyState(false)} style={{ padding:"12px 28px", borderRadius:10, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"white", fontWeight:800, fontSize:13, boxShadow:"0 4px 20px rgba(99,102,241,0.4)" }}>📷 Add Your First Event</button>
      <div style={{ fontSize:10, color:"#475569", marginTop:12 }}>Join 68 families already using CatchUp</div>
    </div>
  );

  // ── DAY VIEW ──
  const DayView = () => {
    const slots=[
      {h:"8 AM",ev:[]},{h:"9 AM",ev:[{t:"School Drop-off",tm:"8:45–9:00",c:"#6366f1"}]},
      {h:"10 AM",ev:[{t:"Team Standup",tm:"10:00–10:30",c:"#8b5cf6",loc:"Zoom"}]},
      {h:"11 AM",ev:[]},{h:"12 PM",ev:[{t:"Lunch",tm:"12:00–12:45",c:"#475569"}]},
      {h:"1 PM",ev:[]},{h:"2 PM",ev:[]},
      {h:"3 PM",ev:[{t:"Lily — Pickup",tm:"3:15–3:30",c:"#ec4899"}]},
      {h:"4 PM",ev:[]},{h:"5 PM",ev:[{t:"Grocery Run",tm:"5:30–6:15",c:"#14b8a6",loc:"Trader Joe's"}]},
      {h:"6 PM",ev:[]},{h:"7 PM",ev:[{t:"Family Dinner",tm:"7:00–7:45",c:"#f59e0b"}]},{h:"8 PM",ev:[]},
    ];
    return (
      <div style={{ position:"relative" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", borderBottom:"1px solid #1e293b" }}>
          <div style={{ width:30, height:30, borderRadius:"50%", background:"#6366f1", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" }}>
            <span style={{ fontSize:11, fontWeight:800, color:"white", lineHeight:1 }}>12</span>
            <span style={{ fontSize:6, color:"rgba(255,255,255,.7)", fontWeight:600 }}>WED</span>
          </div>
          <div><span style={{ fontSize:13, fontWeight:700, color:"#f1f5f9" }}>Wednesday, March 12</span><span style={{ fontSize:10, color:"#64748b", marginLeft:8 }}>5 events</span></div>
        </div>
        {slots.map((s,si)=>(
          <div key={si} style={{ display:"flex", minHeight:s.ev.length?40:24 }}>
            <div style={{ width:50, flexShrink:0, textAlign:"right", padding:"3px 6px 0 0", fontSize:9, color:"#475569", fontFamily:FM }}>{s.h}</div>
            <div style={{ flex:1, borderLeft:"1px solid #1e293b", borderBottom:"1px solid #0f172a", padding:"2px 0 2px 6px", cursor:s.ev.length===0?"pointer":"default" }}
              onClick={()=>{ if(s.ev.length===0) showToast(`➕ Add event at ${s.h}?`); }}
              title={s.ev.length===0?`Click to add event at ${s.h}`:""}>
              {s.ev.map((ev,ei)=>(
                <div key={ei} onClick={()=>{setSelectedEvent({title:ev.t,date:"Mar 12",time:ev.tm,location:ev.loc||"",color:ev.c,type:"",source:"",notes:"",attendees:["Mom"]});setShowEventOverlay(true);}} style={{ background:`${ev.c}15`, borderLeft:`3px solid ${ev.c}`, borderRadius:"0 5px 5px 0", padding:"4px 8px", cursor:"pointer" }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:11, fontWeight:700, color:ev.c }}>{ev.t}</span>{ev.loc&&<span style={{ fontSize:9, color:"#64748b" }}>📍 {ev.loc}</span>}</div>
                  <div style={{ fontSize:9, color:"#64748b", marginTop:1 }}>{ev.tm}</div>
                </div>
              ))}
              {/* PLG Fix #14: Click-to-create hint */}
              {s.ev.length===0 && <div style={{ fontSize:8, color:"#1e293b", textAlign:"center", lineHeight:"20px" }}>+</div>}
            </div>
          </div>
        ))}
        <div style={{ position:"absolute", left:46, right:0, top:"35%", display:"flex", alignItems:"center", zIndex:2, pointerEvents:"none" }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#ef4444", marginLeft:-4 }} /><div style={{ flex:1, height:2, background:"#ef4444" }} />
        </div>
      </div>
    );
  };

  // ── WEEK VIEW ──
  const WeekView = () => {
    const wd=[10,11,12,13,14,15,16];
    const hrs=["8AM","9AM","10AM","11AM","12PM","1PM","2PM","3PM","4PM","5PM","6PM","7PM","8PM"];
    const wE=[
      {day:10,start:2,t:"Dentist (Mom)",c:"#06b6d4"},
      {day:11,start:1,t:"Lily's Dance",c:"#ec4899"},
      {day:12,start:2,t:"Team Standup",c:"#8b5cf6"},
      {day:12,start:7,t:"Grocery Run",c:"#14b8a6"},
      {day:12,start:9,t:"Family Dinner",c:"#f59e0b"},
      {day:13,start:4,t:"Lily Soccer",c:"#ec4899",p:true},
      {day:14,start:7,t:"Date Night 💕",c:"#f43f5e"},
      {day:15,start:2,t:"Spring Fair",c:"#f59e0b",p:true},
      {day:15,start:6,t:"Playdate",c:"#8b5cf6",p:true},
    ];
    return (
      <div style={{ display:"grid", gridTemplateColumns:"40px repeat(7,1fr)" }}>
        <div style={{ borderBottom:"1px solid #1e293b" }} />
        {wd.map((d,i)=>{const t=d===12;return<div key={d} style={{ textAlign:"center", padding:"4px 0 6px", borderBottom:"1px solid #1e293b", borderLeft:"1px solid #1e293b" }}>
          <div style={{ fontSize:9, color:"#64748b", fontWeight:600 }}>{DAYS[i]}</div>
          {t?<div style={{ width:22, height:22, borderRadius:"50%", background:"#6366f1", margin:"2px auto 0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"white" }}>{d}</div>
            :<div style={{ fontSize:13, fontWeight:600, color:"#94a3b8", marginTop:2 }}>{d}</div>}
        </div>})}
        {hrs.map((h,hi)=><React.Fragment key={h}>
          <div style={{ fontSize:8, color:"#475569", fontFamily:FM, textAlign:"right", padding:"3px 4px 0 0", borderBottom:"1px solid #0f172a" }}>{h}</div>
          {wd.map((d,di)=>{const evts=wE.filter(e=>e.day===d&&e.start===hi);return<div key={di} style={{ borderLeft:"1px solid #1e293b", borderBottom:"1px solid #0f172a", minHeight:24, padding:"1px 1px" }}>
            {evts.map((ev,ei)=><div key={ei} style={{ position:"relative", overflow:"hidden", fontSize:8, fontWeight:600, padding:"2px 3px", borderRadius:3, color:ev.p?ev.c:"white", background:ev.p?"transparent":`${ev.c}cc`, lineHeight:"11px", border:ev.p?`1px dashed ${ev.c}50`:"none", opacity:ev.p?0.6:1 }}>
              {ev.p && <span style={{ marginRight:1 }}>⏳</span>}
              <span style={{ position:"relative", zIndex:1 }}>{ev.t}</span>
            </div>)}
          </div>})}
        </React.Fragment>)}
      </div>
    );
  };

  // ── MONTH VIEW ──
  const MonthView = () => (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:"1px solid #1e293b" }}>
        {DAYS.map((d,i)=><div key={d} style={{ textAlign:"center", padding:"6px 0", fontSize:9, fontWeight:700, color:i===0||i===6?"#475569":"#64748b", textTransform:"uppercase", letterSpacing:0.8 }}>{d}</div>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
        {MARCH_GRID.map((cell,ci)=>{
          const isToday=cell.month==="mar"&&cell.d===12, isMar=cell.month==="mar", dayCol=ci%7, isWknd=dayCol===0||dayCol===6;
          const conf=isMar?calendarEvents.filter(e=>parseInt(e.date.split("-")[2])===cell.d):[];
          const extra=isMar?EXTRA_MONTH_EVENTS.filter(e=>e.date===cell.d):[];
          const pend=isMar?pendingEvents.filter(e=>parseInt(e.date.replace("Mar ",""))===cell.d):[];
          const all=[...conf.map(e=>({...e,pending:false})),...extra.map(e=>({...e,pending:false})),...pend.map(e=>({title:e.title,color:e.color,time:e.time,pending:true}))];
          const mx=3, ov=all.length-mx;
          const isFlash = flashCell === cell.d && cell.month==="mar";
          return (
            <div key={ci} style={{ minHeight:70, padding:"2px 2px 3px", borderRight:dayCol<6?"1px solid #1e293b":"none", borderBottom:ci<MARCH_GRID.length-7?"1px solid #1e293b":"none", background:isFlash?"#10b98118":isToday?"#1e1b4b20":isWknd&&isMar?"#0c1322":"transparent", opacity:cell.dim?0.3:1, transition:"background 0.4s" }}>
              <div style={{ display:"flex", justifyContent:"center", padding:"1px 0 2px" }}>
                {isToday?<div style={{ width:22, height:22, borderRadius:"50%", background:"#6366f1", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"white" }}>{cell.d}</div>
                :<span style={{ fontSize:11, fontWeight:cell.d===1?700:500, color:isMar?(isWknd?"#64748b":"#94a3b8"):"#334155" }}>{cell.d}</span>}
              </div>
              {all.slice(0,mx).map((ev,ei)=><Pill key={ei} title={ev.title} color={ev.color} pending={ev.pending} time={ev.time} onClick={()=>{setSelectedEvent({title:ev.title,date:`Mar ${cell.d}`,time:ev.time||"",location:"",color:ev.color,pending:ev.pending});setShowEventOverlay(true);}} />)}
              {ov>0&&<div style={{ fontSize:7, color:"#64748b", fontWeight:600, padding:"0 2px" }}>+{ov} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── YEAR VIEW ──
  const YearView = () => {
    const mos=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const marDays=[3,5,7,8,10,11,12,13,14,15,17,18,19,20,22,24,25,27,29];
    return (
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, padding:8 }}>
        {mos.map((m,mi)=>{
          const cur=mi===2, ct=cur?14:mi===1?8:mi===3?6:Math.floor(Math.random()*8)+2;
          return (
            <div key={m} onClick={()=>setCalView("month")} style={{ background:cur?"#1e1b4b18":"transparent", borderRadius:10, padding:"8px 6px", border:cur?"1.5px solid #6366f140":"1px solid #1e293b", cursor:"pointer" }}>
              <div style={{ fontSize:11, fontWeight:700, color:cur?"#818cf8":"#94a3b8", marginBottom:4, textAlign:"center" }}>{m}</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:0, justifyItems:"center" }}>
                {Array.from({length:35},(_,i)=>{
                  const day=i-(mi===2?5:mi%3)+1, valid=day>0&&day<=31;
                  const has=valid&&(cur?marDays.includes(day):Math.random()>0.75);
                  const td=cur&&day===12;
                  return <div key={i} style={{ width:8, height:8, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {valid?(td?<div style={{ width:8, height:8, borderRadius:"50%", background:"#6366f1" }} />:has?<div style={{ width:4, height:4, borderRadius:"50%", background:"#818cf8" }} />:<div style={{ width:2, height:2, borderRadius:"50%", background:"#1e293b" }} />):null}
                  </div>;
                })}
              </div>
              <div style={{ textAlign:"center", marginTop:3, fontSize:8, color:"#64748b" }}>{ct} events</div>
            </div>
          );
        })}
      </div>
    );
  };

  // PLG Fix #9: Context-aware sidebar label
  const sidebarTitle = calView==="day" ? "Tomorrow" : calView==="week" ? "This Week" : "Today";
  const sidebarEvents = calView==="day"
    ? [{t:"3:30",n:"Lily Soccer (Moved)",c:"#ec4899"},{t:"5:00",n:"Piano Lesson",c:"#8b5cf6"}]
    : calView==="week"
    ? [{t:"Mon",n:"Lily's Dance",c:"#ec4899"},{t:"Wed",n:"Team Standup",c:"#8b5cf6"},{t:"Thu",n:"Soccer",c:"#ec4899"},{t:"Fri",n:"Date Night",c:"#f43f5e"},{t:"Sat",n:"Spring Fair",c:"#f59e0b"}]
    : [{t:"9:00",n:"School Drop-off",c:"#6366f1"},{t:"10:00",n:"Team Standup",c:"#8b5cf6"},{t:"3:15",n:"Pickup — Lily",c:"#ec4899"},{t:"5:30",n:"Grocery Run",c:"#14b8a6"},{t:"7:00",n:"Family Dinner",c:"#f59e0b"}];

  // ── RENDER ──
  return (
    <div>
      <style>{STRIPE_CSS}</style>
      <Toast message={toast.msg} visible={toast.vis} />

      {/* PLG Fix #4: Empty state toggle (demo) */}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:6 }}>
        <button onClick={()=>setShowEmptyState(!showEmptyState)} style={{ fontSize:8, padding:"2px 8px", borderRadius:4, border:"1px solid #1e293b", background:showEmptyState?"#6366f120":"transparent", color:showEmptyState?"#818cf8":"#475569", cursor:"pointer" }}>
          {showEmptyState?"Exit First-Run Demo":"👁️ Show First-Run Experience"}
        </button>
      </div>

      {showEmptyState ? <EmptyState /> : <>

      {/* ═══ TOP: Compact Add Event Bar ═══ */}
      <div style={{ background:"#0f172a", borderRadius:8, border:"1px solid #1e293b", padding:"6px 12px", marginBottom:4 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div onClick={()=>setFabOpen(!fabOpen)} style={{ width:24, height:24, borderRadius:6, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:14, color:"white", fontWeight:700, transform:fabOpen?"rotate(45deg)":"none", transition:"transform 0.2s" }}>+</div>
            <span style={{ fontSize:11, fontWeight:600, color:"#e2e8f0" }}>Add Event</span>
            {!fabOpen && inputSources.slice(0,4).map((s,i)=>(
              <div key={i} onClick={()=>onNavigate("pipeline")} style={{ width:22, height:22, borderRadius:5, background:`${s.accent}10`, border:`1px solid ${s.accent}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, cursor:"pointer" }} title={s.hint}>{s.icon}</div>
            ))}
            {!fabOpen && <span style={{ fontSize:9, color:"#475569", cursor:"pointer" }} onClick={()=>setFabOpen(true)}>+2</span>}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {/* PLG Fix #13: Return notification badge */}
            {newBadge > 0 && <div style={{ display:"flex", alignItems:"center", gap:3, background:"#8b5cf615", padding:"2px 8px", borderRadius:10, border:"1px solid #8b5cf630" }}>
              <span style={{ fontSize:8, color:"#a78bfa", fontWeight:700 }}>🔔 {newBadge} new</span>
            </div>}
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:"#10b981", animation:"pulse 2s infinite" }} />
              <span style={{ fontSize:9, color:"#64748b" }}>Synced just now</span>
            </div>
          </div>
        </div>
        {/* PLG Fix #10: Input source micro-copy when expanded */}
        {fabOpen && <div style={{ display:"flex", gap:4, marginTop:6 }}>
          {inputSources.map((s,i)=>(
            <div key={i} onClick={()=>onNavigate("pipeline")} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2, padding:"6px 2px", background:`${s.accent}08`, borderRadius:6, border:`1px solid ${s.accent}18`, cursor:"pointer" }}>
              <span style={{ fontSize:14 }}>{s.icon}</span>
              <span style={{ fontSize:8, color:s.accent, fontWeight:600 }}>{s.label}</span>
              <span style={{ fontSize:7, color:"#475569" }}>{s.hint}</span>
            </div>
          ))}
        </div>}
      </div>

      {/* PLG Fix #1: Up Next strip */}
      <div style={{ background:"linear-gradient(90deg,#6366f112,#8b5cf608)", borderRadius:8, border:"1px solid #6366f125", padding:"6px 12px", marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:12 }}>⏰</span>
          <span style={{ fontSize:11, fontWeight:700, color:"#f1f5f9" }}>Up Next:</span>
          <span style={{ fontSize:11, color:"#818cf8", fontWeight:600 }}>Team Standup</span>
          <span style={{ fontSize:10, color:"#64748b" }}>· 10:00 AM</span>
          <span style={{ fontSize:9, padding:"1px 6px", borderRadius:6, background:"#6366f120", color:"#818cf8", fontWeight:700 }}>in 23 min</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          <span style={{ fontSize:9, color:"#475569" }}>📍 Zoom</span>
          <div style={{ width:3, height:3, borderRadius:"50%", background:"#334155" }} />
          <span style={{ fontSize:9, color:"#475569" }}>Then: Lunch · 12:00</span>
        </div>
      </div>

      {/* ═══ MAIN: 2/3 + 1/3 ═══ */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:10, alignItems:"start" }}>

        {/* ── LEFT: CALENDAR (2/3) ── */}
        <div style={{ background:"#0f172a", borderRadius:12, border:"1px solid #1e293b", overflow:"hidden", position:"relative" }}>
          {showEventOverlay && <EventOverlay />}
          {/* Header: nav + search + view switcher */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 12px", borderBottom:"1px solid #1e293b" }}>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <button style={{ width:22, height:22, borderRadius:4, border:"1px solid #334155", background:"transparent", color:"#94a3b8", cursor:"pointer", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
              <button style={{ width:22, height:22, borderRadius:4, border:"1px solid #334155", background:"transparent", color:"#94a3b8", cursor:"pointer", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
              <span style={{ fontSize:14, fontWeight:700, color:"#f1f5f9", marginLeft:2 }}>
                {calView==="day"?"Wed, March 12":calView==="week"?"Mar 10 – 16":calView==="year"?"2025":"March 2025"}
              </span>
              <button style={{ padding:"2px 8px", borderRadius:4, border:"1px solid #334155", background:"transparent", color:"#818cf8", cursor:"pointer", fontSize:9, fontWeight:600, marginLeft:3 }}>Today</button>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              {/* PLG Fix #11: Search */}
              {searchOpen ? (
                <div style={{ display:"flex", alignItems:"center", gap:3, background:"#0c1322", borderRadius:6, border:"1px solid #334155", padding:"2px 6px" }}>
                  <span style={{ fontSize:10 }}>🔍</span>
                  <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search events..." style={{ background:"transparent", border:"none", outline:"none", color:"#e2e8f0", fontSize:10, width:120, fontFamily:F }} />
                  <button onClick={()=>{setSearchOpen(false);setSearchQ("");}} style={{ background:"transparent", border:"none", color:"#475569", cursor:"pointer", fontSize:9 }}>✕</button>
                </div>
              ) : (
                <button onClick={()=>setSearchOpen(true)} style={{ width:22, height:22, borderRadius:4, border:"1px solid #334155", background:"transparent", color:"#94a3b8", cursor:"pointer", fontSize:10, display:"flex", alignItems:"center", justifyContent:"center" }}>🔍</button>
              )}
              <div style={{ display:"flex", background:"#0c1322", borderRadius:6, border:"1px solid #1e293b", overflow:"hidden" }}>
                {viewTabs.map(v=>(
                  <button key={v.id} onClick={()=>setCalView(v.id)} style={{ padding:"4px 8px", border:"none", cursor:"pointer", fontSize:9, fontWeight:600, background:calView===v.id?"#6366f1":"transparent", color:calView===v.id?"white":"#64748b", transition:"all 0.15s" }}>{v.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar Body */}
          <div style={{ minHeight:320 }}>
            {calView==="day" && <DayView />}
            {calView==="week" && <WeekView />}
            {calView==="month" && <MonthView />}
            {calView==="year" && <YearView />}
          </div>

          {/* Legend — PLG Fix #8: Stronger pending distinction */}
          <div style={{ display:"flex", gap:10, padding:"5px 12px", borderTop:"1px solid #1e293b" }}>
            <div style={{ display:"flex", alignItems:"center", gap:3 }}><div style={{ width:14, height:8, borderRadius:2, background:"#6366f1cc" }} /><span style={{ fontSize:8, color:"#64748b" }}>Confirmed</span></div>
            <div style={{ display:"flex", alignItems:"center", gap:3 }}><div style={{ width:14, height:8, borderRadius:3, border:"1px dashed #8b5cf660", opacity:0.6, display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:5 }}>⏳</span></div><span style={{ fontSize:8, color:"#64748b" }}>Pending AI Review</span></div>
            {[{l:"School",c:"#f59e0b"},{l:"Kids",c:"#ec4899"},{l:"Personal",c:"#f43f5e"},{l:"Errand",c:"#14b8a6"}].map(x=><div key={x.l} style={{ display:"flex", alignItems:"center", gap:2 }}><div style={{ width:5, height:5, borderRadius:"50%", background:x.c }} /><span style={{ fontSize:8, color:"#64748b" }}>{x.l}</span></div>)}
          </div>
        </div>

        {/* ── RIGHT: PENDING + TODAY (1/3) ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

          {/* PLG Fix #2: Auto-approved banner */}
          {autoApprovedPending.length > 0 && (
            <div style={{ background:"#10b98110", borderRadius:10, border:"1px solid #10b98130", padding:"8px 12px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ fontSize:11 }}>✨</span>
                  <span style={{ fontSize:10, fontWeight:700, color:"#34d399" }}>{autoApprovedPending.length} auto-approved</span>
                </div>
                <button onClick={dismissAutoApproved} style={{ fontSize:8, padding:"2px 6px", borderRadius:4, border:"1px solid #10b98130", background:"transparent", color:"#10b981", cursor:"pointer" }}>Dismiss</button>
              </div>
              <div style={{ fontSize:9, color:"#64748b", lineHeight:1.4 }}>Events with ≥90% confidence were auto-added to your calendar.</div>
              {autoApprovedPending.map(pe => (
                <div key={pe.id} style={{ display:"flex", alignItems:"center", gap:4, marginTop:4, fontSize:9, color:"#94a3b8" }}>
                  <span style={{ color:"#10b981" }}>✓</span> {pe.title} · <Badge score={pe.confidence} />
                </div>
              ))}
            </div>
          )}

          {/* Pending Queue */}
          <div style={{ background:"#0f172a", borderRadius:12, border:"1px solid #1e293b", overflow:"hidden" }}>
            <div style={{ padding:"8px 12px", borderBottom:"1px solid #1e293b", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ fontSize:12, fontWeight:700, color:"#f1f5f9" }}>Needs Review</span>
                <span style={{ fontSize:9, padding:"1px 7px", borderRadius:10, background:"#f59e0b20", color:"#f59e0b", fontWeight:700 }}>{activePending.length}</span>
              </div>
              {/* PLG Fix #2: Approve All button */}
              {activePending.length > 1 && (
                <button onClick={approveAll} style={{ fontSize:9, padding:"3px 10px", borderRadius:6, border:"none", cursor:"pointer", background:"#6366f1", color:"white", fontWeight:700 }}>✓ Approve All</button>
              )}
            </div>
            <div style={{ padding:"6px 8px", maxHeight:380, overflowY:"auto" }}>
              {activePending.length===0 ? (
                <div style={{ textAlign:"center", padding:"24px 0" }}>
                  <div style={{ fontSize:24, marginBottom:4 }}>✅</div>
                  <div style={{ fontSize:11, fontWeight:700, color:"#10b981" }}>All caught up!</div>
                  <div style={{ fontSize:9, color:"#64748b", marginTop:1 }}>No events need review</div>
                </div>
              ) : activePending.map(pe => {
                const ok = justApproved.includes(pe.id);
                const isEditing = editingId === pe.id;
                return (
                  <div key={pe.id} style={{ background:ok?"#10b98108":"#0c1322", borderRadius:8, padding:"8px", marginBottom:6, border:`1px solid ${ok?"#10b98130":pe.color+"20"}`, transition:"all 0.4s", opacity:ok?0.5:1, transform:ok?"scale(0.97)":"scale(1)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"#f1f5f9", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{pe.title}</div>
                        <div style={{ display:"flex", alignItems:"center", gap:3, marginTop:2 }}>
                          <span style={{ fontSize:8, color:"#64748b" }}>{pe.source}</span>
                          <span style={{ fontSize:7, color:"#334155" }}>·</span>
                          <span style={{ fontSize:8, color:"#475569" }}>{pe.updatedAgo}</span>
                        </div>
                      </div>
                      {/* PLG Fix #7: Confidence badge with tooltip */}
                      <div style={{ position:"relative" }}>
                        <div onClick={()=>setShowConfTooltip(showConfTooltip===pe.id?null:pe.id)} style={{ cursor:"pointer", display:"flex", alignItems:"center", gap:2 }}>
                          <Badge score={pe.confidence} />
                          <span style={{ fontSize:8, color:"#475569", cursor:"pointer" }}>ⓘ</span>
                        </div>
                        {showConfTooltip===pe.id && (
                          <div style={{ position:"absolute", right:0, top:"100%", marginTop:4, background:"#1e293b", border:"1px solid #334155", borderRadius:6, padding:"6px 8px", width:160, zIndex:10, boxShadow:"0 4px 16px rgba(0,0,0,0.3)" }}>
                            <div style={{ fontSize:8, fontWeight:700, color:"#e2e8f0", marginBottom:2 }}>AI Confidence Score</div>
                            <div style={{ fontSize:8, color:"#94a3b8", lineHeight:1.4 }}>{pe.reason}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PLG Fix #3: Inline edit mode */}
                    {isEditing ? (
                      <div style={{ display:"flex", flexDirection:"column", gap:3, marginBottom:6 }}>
                        {[{k:"date",i:"📅",v:editFields.date},{k:"time",i:"🕐",v:editFields.time},{k:"location",i:"📍",v:editFields.location}].map(f=>(
                          <div key={f.k} style={{ display:"flex", alignItems:"center", gap:3 }}>
                            <span style={{ fontSize:9, width:14, textAlign:"center" }}>{f.i}</span>
                            <input value={f.v} onChange={e=>setEditFields(p=>({...p,[f.k]:e.target.value}))} style={{ flex:1, fontSize:9, padding:"3px 6px", borderRadius:4, border:"1px solid #334155", background:"#0f172a", color:"#e2e8f0", outline:"none", fontFamily:F }} />
                          </div>
                        ))}
                        <div style={{ display:"flex", gap:3, marginTop:2 }}>
                          <button onClick={()=>saveEdit(pe.id)} style={{ flex:1, padding:"4px", borderRadius:5, border:"none", cursor:"pointer", background:"#10b981", color:"white", fontWeight:700, fontSize:9 }}>💾 Save</button>
                          <button onClick={()=>setEditingId(null)} style={{ padding:"4px 8px", borderRadius:5, border:"1px solid #334155", cursor:"pointer", background:"transparent", color:"#94a3b8", fontWeight:600, fontSize:9 }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display:"flex", gap:3, marginBottom:6, flexWrap:"wrap" }}>
                          {[{i:"📅",v:pe.date},{i:"🕐",v:pe.time},{i:"📍",v:pe.location}].map(f=>(
                            <span key={f.i} style={{ fontSize:8, color:"#94a3b8", background:"#0f172a", padding:"1px 4px", borderRadius:3, border:"1px solid #1e293b" }}>{f.i} {f.v}</span>
                          ))}
                        </div>
                        <div style={{ display:"flex", gap:3 }}>
                          <button onClick={()=>approve(pe.id)} style={{ flex:1, padding:"5px", borderRadius:5, border:"none", cursor:"pointer", background:ok?"#10b98120":pe.color, color:"white", fontWeight:700, fontSize:9 }}>{ok?"✓ Added":"✓ Approve"}</button>
                          <button onClick={()=>startEdit(pe)} style={{ padding:"5px 8px", borderRadius:5, border:"1px solid #334155", cursor:"pointer", background:"transparent", color:"#94a3b8", fontWeight:600, fontSize:9 }}>Edit</button>
                          <button style={{ padding:"5px 6px", borderRadius:5, border:"1px solid #334155", cursor:"pointer", background:"transparent", color:"#475569", fontWeight:600, fontSize:9 }}>✕</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {addedCalIds.length>0 && <div style={{ padding:"5px 12px", borderTop:"1px solid #1e293b", display:"flex", alignItems:"center", gap:4 }}><span style={{ fontSize:11 }}>🎉</span><span style={{ fontSize:9, color:"#34d399", fontWeight:600 }}>{addedCalIds.length} added via AI</span></div>}
          </div>

          {/* PLG Fix #9: Context-aware sidebar agenda */}
          <div style={{ background:"#0f172a", borderRadius:12, border:"1px solid #1e293b", overflow:"hidden" }}>
            <div style={{ padding:"7px 12px", borderBottom:"1px solid #1e293b", display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:20, height:20, borderRadius:"50%", background:"#6366f1", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:800, color:"white" }}>{calView==="day"?"13":calView==="week"?"W":12}</div>
              <span style={{ fontSize:10, fontWeight:700, color:"#f1f5f9" }}>{sidebarTitle}</span>
              <span style={{ fontSize:9, color:"#64748b" }}>· {sidebarEvents.length} events</span>
            </div>
            <div style={{ padding:"4px 8px" }}>
              {sidebarEvents.map((e,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 0", borderBottom:i<sidebarEvents.length-1?"1px solid #0c1322":"none" }}>
                  <span style={{ fontSize:9, color:"#475569", fontFamily:FM, width:28, flexShrink:0, textAlign:"right" }}>{e.t}</span>
                  <div style={{ width:3, height:12, borderRadius:2, background:e.c, flexShrink:0 }} />
                  <span style={{ fontSize:10, color:"#e2e8f0", fontWeight:600 }}>{e.n}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PLG Fix #12: Invite CTA */}
          <div style={{ background:"#1e1b4b15", borderRadius:10, border:"1px dashed #6366f130", padding:"10px 12px", textAlign:"center" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#818cf8", marginBottom:2 }}>👥 Invite a family to CatchUp</div>
            <div style={{ fontSize:9, color:"#64748b" }}>Share availability with your CatchUp Circle</div>
          </div>
        </div>
      </div>
      </>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  TAB 1: WIREFRAMES — Updated to reflect new PLG Home
// ══════════════════════════════════════════════════════════════

function PhoneMock({ title, children, accent="#6366f1" }) {
  return (
    <div style={{ width:210, background:"#1e293b", borderRadius:26, padding:"10px 8px", border:"2px solid #334155", boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
      <div style={{ background:"#0f172a", borderRadius:18, overflow:"hidden", minHeight:370 }}>
        <div style={{ background:`linear-gradient(135deg,${accent},${accent}bb)`, padding:"12px 14px 8px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ color:"white", fontWeight:700, fontSize:12 }}>{title}</span>
          <span style={{ fontSize:9, color:"rgba(255,255,255,0.6)" }}>9:41</span>
        </div>
        <div style={{ padding:10 }}>{children}</div>
      </div>
    </div>
  );
}

function TabWireframes() {
  const [step, setStep] = useState(0);
  const screens = [
    { title: "Home", accent: "#6366f1", content: (
      <div>
        {/* Up Next strip */}
        <div style={{ background:"#6366f115", borderRadius:6, padding:"5px 6px", marginBottom:6, display:"flex", alignItems:"center", gap:4, border:"1px solid #6366f125" }}>
          <span style={{ fontSize:9 }}>⏰</span>
          <span style={{ fontSize:8, fontWeight:700, color:"#818cf8" }}>Standup · 10 AM</span>
          <span style={{ fontSize:7, color:"#64748b" }}>in 23 min</span>
        </div>
        {/* Capture CTA */}
        <div style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius:12, padding:14, textAlign:"center", marginBottom:8 }}>
          <div style={{ fontSize:24, marginBottom:4 }}>📷</div>
          <div style={{ color:"white", fontWeight:800, fontSize:14 }}>Snap Event</div>
          <div style={{ color:"rgba(255,255,255,0.7)", fontSize:10, marginTop:1 }}>Tap to capture</div>
        </div>
        <div style={{ display:"flex", gap:6, marginBottom:8 }}>
          {[{i:"🎙️",l:"Voice"},{i:"💬",l:"Text"},{i:"✉️",l:"Email"}].map(b=>(
            <div key={b.l} style={{ flex:1, background:"#1e293b", borderRadius:8, padding:"8px 4px", textAlign:"center", border:"1px solid #334155" }}>
              <div style={{ fontSize:16 }}>{b.i}</div>
              <div style={{ fontSize:9, color:"#94a3b8", marginTop:1 }}>{b.l}</div>
            </div>
          ))}
        </div>
        {/* Auto-approved banner */}
        <div style={{ background:"#10b98110", border:"1px solid #10b98130", borderRadius:6, padding:5, marginBottom:6 }}>
          <div style={{ fontSize:8, fontWeight:700, color:"#34d399" }}>✨ 2 auto-approved (≥90%)</div>
          <div style={{ fontSize:7, color:"#64748b", marginTop:1 }}>Tap to review</div>
        </div>
        {/* Pending with Approve All */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <div style={{ fontSize:9, color:"#f59e0b", fontWeight:700 }}>⏳ 2 Need Review</div>
          <span style={{ fontSize:7, color:"#818cf8", fontWeight:700 }}>Approve All</span>
        </div>
        {[{t:"Playdate w/ Emma",s:"79%",c:"#ef4444"},{t:"Soccer (Moved)",s:"87%",c:"#f59e0b"}].map(e=>(
          <div key={e.t} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 6px", background:"#0c1322", borderRadius:6, marginBottom:3, border:`1px dashed ${e.c}30` }}>
            <div style={{ flex:1 }}><div style={{ fontSize:10, fontWeight:600, color:"#e2e8f0" }}>{e.t}</div></div>
            <span style={{ fontSize:8, color:e.c, fontWeight:700 }}>{e.s}</span>
          </div>
        ))}
      </div>
    )},
    { title: "AI Processing", accent: "#8b5cf6", content: (
      <div>
        <div style={{ textAlign:"center", marginBottom:14 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"#8b5cf620", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:24, marginBottom:6 }}>🧠</div>
          <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>Analyzing...</div>
          <div style={{ fontSize:10, color:"#64748b" }}>GPT-4 Vision processing</div>
        </div>
        {["OCR Scanning","Entity Extraction","Date Resolution","Confidence Score"].map((s,i)=>(
          <div key={s} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 8px", background:"#0c1322", borderRadius:6, marginBottom:5 }}>
            <div style={{ width:18, height:18, borderRadius:"50%", background:i<3?"#10b98120":"#f59e0b20", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, color:i<3?"#10b981":"#f59e0b" }}>{i<3?"✓":"⏳"}</div>
            <div style={{ fontSize:11, color:"#cbd5e1", fontWeight:500 }}>{s}</div>
            <div style={{ marginLeft:"auto", fontSize:9, color:"#64748b", fontFamily:FM }}>{["1.2s","0.8s","0.1s","..."][i]}</div>
          </div>
        ))}
        <div style={{ marginTop:10, padding:10, background:"linear-gradient(135deg,#8b5cf610,#6366f110)", borderRadius:8, border:"1px solid #8b5cf630" }}>
          <div style={{ fontSize:10, color:"#a78bfa", fontWeight:600, marginBottom:4 }}>PREVIEW</div>
          <div style={{ fontSize:11, color:"#e2e8f0", fontWeight:600 }}>Spring Fair</div>
          <div style={{ fontSize:10, color:"#94a3b8" }}>Mar 15 · 10 AM · Playground</div>
        </div>
      </div>
    )},
    { title: "Inline Review", accent: "#10b981", content: (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <span style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>Review in-place</span>
          <Badge score={0.94} />
        </div>
        <div style={{ fontSize:9, color:"#64748b", marginBottom:8, lineHeight:1.4 }}>Edit fields directly — no page navigation. Stay in your calendar flow.</div>
        {[{l:"Title",v:"Spring Fair"},{l:"Date",v:"Sat, Mar 15"},{l:"Time",v:"10 AM – 3 PM"},{l:"Location",v:"Main Playground"}].map(f=>(
          <div key={f.l} style={{ marginBottom:5 }}>
            <div style={{ fontSize:8, color:"#64748b", textTransform:"uppercase", letterSpacing:0.6, marginBottom:1 }}>{f.l}</div>
            <div style={{ background:"#1e293b", borderRadius:6, padding:"5px 8px", fontSize:11, color:"#e2e8f0", border:"1px solid #334155", display:"flex", justifyContent:"space-between" }}>
              {f.v}<span style={{ color:"#6366f1", fontSize:9 }}>✏️</span>
            </div>
          </div>
        ))}
        <div style={{ display:"flex", gap:6, marginTop:10 }}>
          <div style={{ flex:1, padding:"9px", borderRadius:8, background:"#10b981", color:"white", fontSize:11, fontWeight:700, textAlign:"center" }}>✓ Approve</div>
          <div style={{ padding:"9px 12px", borderRadius:8, border:"1px solid #334155", color:"#94a3b8", fontSize:11, fontWeight:600, textAlign:"center" }}>Skip</div>
        </div>
        <div style={{ textAlign:"center", marginTop:6, fontSize:8, color:"#64748b" }}>Your edits improve future extractions</div>
      </div>
    )},
    { title: "Success!", accent: "#10b981", content: (
      <div style={{ textAlign:"center" }}>
        <div style={{ width:56, height:56, borderRadius:"50%", background:"#10b98120", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"12px 0" }}>✓</div>
        <div style={{ fontSize:14, fontWeight:800, color:"#10b981", marginBottom:3 }}>Event Added!</div>
        <div style={{ fontSize:11, color:"#94a3b8", marginBottom:14 }}>Spring Fair on your calendar</div>
        <div style={{ background:"#1e293b", borderRadius:10, padding:10, textAlign:"left", marginBottom:10 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#f1f5f9" }}>🎪 Spring Fair</div>
          <div style={{ fontSize:10, color:"#94a3b8", marginTop:3 }}>Sat, Mar 15 · 10 AM – 3 PM</div>
          <div style={{ fontSize:10, color:"#94a3b8" }}>Main Playground</div>
          <div style={{ display:"flex", gap:3, marginTop:5 }}>
            <span style={{ fontSize:8, background:"#f59e0b20", color:"#fbbf24", padding:"2px 6px", borderRadius:8, fontWeight:600 }}>School</span>
            <span style={{ fontSize:8, background:"#10b98120", color:"#34d399", padding:"2px 6px", borderRadius:8, fontWeight:600 }}>Auto-Approved ✨</span>
          </div>
        </div>
        {/* PLG: toast animation preview */}
        <div style={{ background:"#10b981", borderRadius:8, padding:"6px 12px", color:"white", fontSize:10, fontWeight:700, marginBottom:8 }}>✓ Spring Fair added to Mar 15</div>
        <div style={{ padding:"9px", borderRadius:8, background:"#6366f1", color:"white", fontSize:11, fontWeight:700, marginBottom:6 }}>Share with Family</div>
        <div style={{ fontSize:10, color:"#6366f1", fontWeight:600 }}>View Calendar →</div>
      </div>
    )}
  ];

  return (
    <div>
      <SL>User Flow: Snap-to-Calendar — PLG-Optimized, 4 Screens, Under 5 Seconds</SL>
      <div style={{ display:"flex", gap:14, alignItems:"flex-start", overflowX:"auto", paddingBottom:16 }}>
        {screens.map((s,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            <div onClick={()=>setStep(i)} style={{ opacity:step===i?1:0.45, transform:step===i?"scale(1.03)":"scale(0.97)", transition:"all 0.3s", cursor:"pointer" }}>
              <div style={{ textAlign:"center", marginBottom:6 }}>
                <span style={{ fontSize:10, color:s.accent, fontWeight:700, background:`${s.accent}15`, padding:"2px 10px", borderRadius:16 }}>Step {i+1}</span>
              </div>
              <PhoneMock title={s.title} accent={s.accent}>{s.content}</PhoneMock>
            </div>
            {i < screens.length-1 && <div style={{ fontSize:22, color:"#334155", flexShrink:0 }}>→</div>}
          </div>
        ))}
      </div>
      <Card style={{ marginTop:14 }} accent="#6366f1">
        <div style={{ fontSize:13, fontWeight:700, color:"#f1f5f9", marginBottom:10 }}>PLG-Driven UX Design Decisions</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          {[
            { t:"Up Next + Glance Test", d:"'What's my next thing?' answered in 1 second. Up Next strip passes the 2-second glance test that makes CatchUp the daily-driver calendar." },
            { t:"Auto-Approve ≥90%", d:"High-confidence events skip the queue entirely. Reduces 12 decisions to ~4 on first load. Directly addresses 52% W1 retention gap." },
            { t:"Inline Edit (No Context Switch)", d:"Editing happens in-place on the pending card. Never leave the Home screen. Eliminates the #1 PLG friction point — losing calendar context." }
          ].map((c,i)=>(
            <div key={i} style={{ background:"#0c1322", borderRadius:10, padding:12 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#e2e8f0", marginBottom:4 }}>{c.t}</div>
              <div style={{ fontSize:11, color:"#94a3b8", lineHeight:1.5 }}>{c.d}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  TAB 2: AI PIPELINE — Updated with inline edit mention
// ══════════════════════════════════════════════════════════════

function TabPipeline({ approvedIds, handleApprove }) {
  const [active, setActive] = useState(1);
  const [anim, setAnim] = useState(true);
  const ext = SAMPLE_EXTRACTIONS.find(e => e.id === active);
  useEffect(() => { setAnim(true); const t=setTimeout(()=>setAnim(false),2500); return()=>clearTimeout(t) },[active]);
  const tc = { "School Event":"#f59e0b","Kids Activity":"#ec4899","Playdate":"#8b5cf6","Appointment":"#06b6d4" };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"330px 1fr", gap:18 }}>
      <div>
        <SL>Incoming Events ({SAMPLE_EXTRACTIONS.length})</SL>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {SAMPLE_EXTRACTIONS.map(e => {
            const ac = tc[e.extracted.type]||"#6366f1"; const isA = active===e.id;
            const isHigh = e.confidence >= 0.90;
            return (
              <div key={e.id} onClick={()=>setActive(e.id)} style={{ background:isA?"#1e293b":"#0f172a", borderRadius:14, padding:16, cursor:"pointer", border:isA?`2px solid ${ac}`:"2px solid #1e293b", transition:"all 0.25s", position:"relative" }}>
                {isA && <div style={{ position:"absolute", top:0, left:0, width:4, height:"100%", background:`linear-gradient(180deg,${ac},${ac}40)` }} />}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:24 }}>{e.thumbnail}</span>
                    <div>
                      <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:0.8, fontWeight:600 }}>{e.sourceLabel}</div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#f1f5f9", marginTop:1 }}>{e.extracted.title}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
                    <Badge score={e.confidence} />
                    {isHigh && <span style={{ fontSize:7, color:"#10b981", fontWeight:600 }}>AUTO-APPROVE ✨</span>}
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }}>
                  {[{l:"Date",v:e.extracted.date},{l:"Time",v:e.extracted.time},{l:"Location",v:e.extracted.location},{l:"Type",v:e.extracted.type}].map((f,i)=>(
                    <div key={i} style={{ padding:"5px 7px", background:"#0c1322", borderRadius:5 }}><div style={{ fontSize:9, color:"#64748b", textTransform:"uppercase" }}>{f.l}</div><div style={{ fontSize:11, color:"#cbd5e1", fontWeight:500 }}>{f.v}</div></div>
                  ))}
                </div>
                {isA && <div style={{ display:"flex", gap:6, marginTop:10 }}>
                  <button onClick={ev=>{ev.stopPropagation();handleApprove(e.id)}} style={{ flex:1, padding:"9px", borderRadius:8, border:"none", cursor:"pointer", background:approvedIds.includes(e.id)?`${ac}30`:`linear-gradient(135deg,${ac},${ac}cc)`, color:approvedIds.includes(e.id)?ac:"white", fontWeight:700, fontSize:12 }}>{approvedIds.includes(e.id)?"✓ Added":"✓ Add to Calendar"}</button>
                  <button style={{ padding:"9px 12px", borderRadius:8, border:"1.5px solid #334155", cursor:"pointer", background:"transparent", color:"#94a3b8", fontWeight:600, fontSize:12 }}>Inline Edit</button>
                </div>}
              </div>
            );
          })}
        </div>
      </div>
      <div>
        {ext && <Card>
          <SL>Raw Input — {ext.sourceLabel}</SL>
          <div style={{ fontFamily:FM, fontSize:12, color:"#cbd5e1", background:"#020617", padding:12, borderRadius:8, lineHeight:1.6, whiteSpace:"pre-wrap", border:"1px solid #1e293b", marginBottom:18 }}>{ext.rawInput}</div>
          <SL>AI Processing Pipeline</SL>
          {ext.processingSteps.map((s,i)=><PipeStep key={i} step={s} i={i} anim={anim} />)}
          <div style={{ marginTop:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}><SL>Structured Output</SL><Badge score={ext.confidence} /></div>
            <div style={{ fontFamily:FM, fontSize:11, background:"#020617", padding:12, borderRadius:8, border:"1px solid #1e293b", lineHeight:1.7 }}>
              <span style={{ color:"#64748b" }}>{"{"}</span>{"\n"}
              {Object.entries(ext.extracted).map(([k,v],i)=>(<span key={k}>{"  "}<span style={{ color:"#818cf8" }}>"{k}"</span><span style={{ color:"#64748b" }}>: </span><span style={{ color:"#fbbf24" }}>"{v}"</span>{i<Object.entries(ext.extracted).length-1?",":""}{"\n"}</span>))}
              <span style={{ color:"#64748b" }}>{"}"}</span>
            </div>
          </div>
          {/* Auto-approve routing note */}
          {ext.confidence >= 0.90 && (
            <div style={{ marginTop:12, background:"#10b98110", borderRadius:8, padding:"8px 12px", border:"1px solid #10b98130", display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:12 }}>✨</span>
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#34d399" }}>Auto-Approve Eligible</div>
                <div style={{ fontSize:9, color:"#64748b" }}>Confidence ≥90% — routed to auto-approve on Home screen</div>
              </div>
            </div>
          )}
        </Card>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  TAB 3: HITL ITERATIONS — Updated with auto-approve threshold
// ══════════════════════════════════════════════════════════════

function TabHITL() {
  const [ai, setAI] = useState(0);
  const iters = [
    { ver:"V1 — Baseline", wk:"Week 1", dA:68, lA:61, oA:72, dI:"Failed on relative dates: 'this Thursday', 'next Saturday', 'the 3rd'", lI:"Missed abbreviated locations: 'Main gym', 'Room 204', 'the park'",
      prompt:`Extract event details from this text.\nReturn JSON with: title, date, time, location`, edits:34, insight:"Users edited dates in 34% of extractions. Most edits were on relative dates and location abbreviations." },
    { ver:"V2 — Date Context", wk:"Week 2", dA:81, lA:71, oA:82, dI:"Improved relative dates but still fails on 'the first Monday' or school-year references", lI:"Started recognizing school names but misses 'at Sarah's' or 'the usual place'",
      prompt:`Today's date is {today} ({day_of_week}).\nResolve ALL relative dates to YYYY-MM-DD.\n"this Thursday" = {next_thursday}\n"next week" = week of {next_monday}`, edits:19, insight:"Adding today's date + day-of-week context reduced date errors by 42%. User edits dropped from 34% → 19%." },
    { ver:"V3 — Location Cache", wk:"Week 3", dA:89, lA:84, oA:88, dI:"Handles most relative dates. Edge case: multi-day events and recurring patterns", lI:"Recognizes 'Sarah's house' and school shortnames. Still misses park-specific areas",
      prompt:`LOCATION RULES:\n- Person's name + "house/place" → keep as-is\n- School name detected → append full name\n- Abbreviated → expand if context available\n- Ambiguous → return null (DO NOT guess)\n\nKNOWN LOCATIONS:\n{family_location_history}`, edits:11, insight:"Injecting family's historical locations into prompt was a breakthrough. Location accuracy jumped +13 pts. Built per-family location cache." },
    { ver:"V4 — Production", wk:"Week 4", dA:94, lA:91, oA:92, dI:"95th percentile on explicit dates. Relative dates handled with day-of-week anchoring", lI:"Family location history + fuzzy matching: 91%. Remaining 9% routed to human review",
      prompt:`CONFIDENCE RULES:\n- Relative date AND >7 days → confidence -= 0.15\n- Location matches history → confidence += 0.05\n- ANY field null → route to human review\n- Tentative language ("maybe","?") → -= 0.10\n\nTHRESHOLD: ≥0.90 auto-approve | <0.90 human`, edits:6, insight:"Auto-approve threshold at ≥90% eliminated 68% of manual reviews. Only events below 90% appear in the Pending Queue — cutting cognitive load by 70%." }
  ];
  const it = iters[ai];

  return (
    <div>
      <SL>Iteration Story: How Human Feedback Improved AI Accuracy 72% → 92%</SL>
      <div style={{ display:"flex", gap:5, marginBottom:20 }}>
        {iters.map((t,i)=>(
          <button key={i} onClick={()=>setAI(i)} style={{ flex:1, padding:"10px 12px", borderRadius:10, border:"none", cursor:"pointer", background:ai===i?"#6366f1":"#0f172a", color:ai===i?"white":"#94a3b8", fontSize:11, fontWeight:700, transition:"all 0.2s" }}>
            <div>{t.ver}</div><div style={{ fontSize:9, opacity:0.7, marginTop:1 }}>{t.wk} · {t.oA}%</div>
          </button>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Card accent="#6366f1">
          <div style={{ fontSize:13, fontWeight:700, color:"#f1f5f9", marginBottom:14 }}>Accuracy Progression</div>
          {[{l:"Date Parsing",v:it.dA,c:"#818cf8",b:iters[0].dA},{l:"Location Extraction",v:it.lA,c:"#ec4899",b:iters[0].lA},{l:"Overall Pipeline",v:it.oA,c:"#10b981",b:iters[0].oA}].map(m=>(
            <div key={m.l} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}><span style={{ fontSize:12, color:"#94a3b8", fontWeight:600 }}>{m.l}</span><span style={{ fontSize:13, color:m.c, fontWeight:800, fontFamily:FM }}>{m.v}%</span></div>
              <div style={{ height:8, background:"#0c1322", borderRadius:4, overflow:"hidden", position:"relative" }}>
                <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${m.b}%`, background:`${m.c}30`, borderRadius:4 }} />
                <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${m.v}%`, background:m.c, borderRadius:4, transition:"width 0.6s ease" }} />
              </div>
              <div style={{ fontSize:9, color:"#475569", marginTop:2 }}>{m.v>m.b?`+${m.v-m.b}pts from baseline`:"Baseline"}</div>
            </div>
          ))}
          <div style={{ marginTop:14, padding:12, background:"#0c1322", borderRadius:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:12, color:"#94a3b8", fontWeight:600 }}>User Edit Rate</span><span style={{ fontSize:16, fontWeight:800, color:it.edits>20?"#f59e0b":"#10b981", fontFamily:FM }}>{it.edits}%</span></div>
            <div style={{ height:6, background:"#1e293b", borderRadius:3, marginTop:5 }}><div style={{ height:"100%", width:`${it.edits}%`, background:it.edits>20?"#f59e0b":"#10b981", borderRadius:3, transition:"width 0.6s" }} /></div>
            <div style={{ fontSize:9, color:"#475569", marginTop:3 }}>{it.edits>20?"High → prompt needs work":it.edits>10?"Acceptable — monitoring":"✓ Below 10% target"}</div>
          </div>
          {/* Auto-approve rate at V4 */}
          {ai===3 && <div style={{ marginTop:10, padding:10, background:"#10b98110", borderRadius:8, border:"1px solid #10b98130" }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:11, fontWeight:600, color:"#34d399" }}>Auto-Approve Rate (≥90%)</span><span style={{ fontSize:14, fontWeight:800, color:"#10b981", fontFamily:FM }}>68%</span></div>
            <div style={{ fontSize:9, color:"#64748b", marginTop:2 }}>68% of events skip manual review entirely</div>
          </div>}
        </Card>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <Card><div style={{ fontSize:12, fontWeight:700, color:"#f1f5f9", marginBottom:6 }}>🗓️ Date Parsing</div><div style={{ fontSize:12, color:"#94a3b8", lineHeight:1.5 }}>{it.dI}</div></Card>
          <Card><div style={{ fontSize:12, fontWeight:700, color:"#f1f5f9", marginBottom:6 }}>📍 Location Extraction</div><div style={{ fontSize:12, color:"#94a3b8", lineHeight:1.5 }}>{it.lI}</div></Card>
          <Card accent="#f59e0b"><div style={{ fontSize:12, fontWeight:700, color:"#f1f5f9", marginBottom:6 }}>🔧 Prompt Change</div><div style={{ fontFamily:FM, fontSize:10, color:"#fbbf24", background:"#0c1322", padding:10, borderRadius:6, lineHeight:1.5, whiteSpace:"pre-wrap", border:"1px solid #f59e0b20" }}>{it.prompt}</div></Card>
          <Card accent="#10b981"><div style={{ fontSize:12, fontWeight:700, color:"#f1f5f9", marginBottom:6 }}>💡 Key Insight</div><div style={{ fontSize:12, color:"#34d399", lineHeight:1.5, fontWeight:500 }}>{it.insight}</div></Card>
        </div>
      </div>
      <Card style={{ marginTop:14 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#f1f5f9", marginBottom:12 }}>Human-in-the-Loop Feedback Flywheel</div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, flexWrap:"wrap" }}>
          {[{i:"📷",l:"Capture",c:"#6366f1"},{i:"🧠",l:"AI Extract",c:"#8b5cf6"},{i:"📊",l:"Score",c:"#f59e0b"},{i:"✨",l:"Auto/Review",c:"#10b981"},{i:"📝",l:"Log Edits",c:"#14b8a6"},{i:"🔧",l:"Tune Prompts",c:"#ec4899"}].map((n,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ background:`${n.c}10`, border:`1.5px solid ${n.c}30`, borderRadius:8, padding:"8px 12px", textAlign:"center", minWidth:80 }}>
                <div style={{ fontSize:16, marginBottom:2 }}>{n.i}</div>
                <div style={{ fontSize:9, color:n.c, fontWeight:700 }}>{n.l}</div>
              </div>
              {i<5 && <span style={{ fontSize:14, color:"#334155" }}>→</span>}
            </div>
          ))}
          <span style={{ fontSize:14, color:"#334155" }}>↩</span>
        </div>
        <div style={{ textAlign:"center", marginTop:10, fontSize:11, color:"#64748b" }}>≥90% confidence → auto-approve. Below → human review. Every edit becomes a training signal.</div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  TAB 4: AGENTIC EXPANSION
// ══════════════════════════════════════════════════════════════

function TabAgentic() {
  const [simStep, setSimStep] = useState(0);
  const steps = [
    { agent:"🧠 Planner", action:"Decomposes request", thought:"User: 'find a time for Lily's birthday party next weekend'. Tasks: 1) Check family calendar 2) Check invitee availability 3) Find venues 4) Propose options.", tools:["Calendar","Contacts"], dur:"0.8s" },
    { agent:"📅 Calendar", action:"Scans family schedule", thought:"Sat Mar 22: Soccer 10-12, free after. Sun Mar 23: Church 9-11, free after 12pm. Best windows: Sat 1-5 PM or Sun 12-5 PM.", tools:["Google Calendar API"], dur:"1.2s" },
    { agent:"👥 Social", action:"Checks invitee availability", thought:"Emma: free Sat PM. Noah: only Sunday. Ava: both days. Saturday edge (Emma = best friend). 2/3 match Saturday.", tools:["Shared Availability"], dur:"2.1s" },
    { agent:"📍 Venue", action:"Finds party venues nearby", thought:"Pump It Up: 2.3 mi, $299, Sat avail. LEGO Café: 3.1 mi, $199, Sun only. Discovery Park: free, both days. Ranking by availability × price × rating.", tools:["Places API","Yelp"], dur:"3.4s" },
    { agent:"🎯 Synthesizer", action:"Generates ranked proposals", thought:"3 options with trade-offs: venue, attendee match, cost, confirmation needed from user.", tools:["LLM Synthesis"], dur:"1.1s" },
  ];

  useEffect(() => {
    if (simStep > 0 && simStep <= steps.length) {
      const t = setTimeout(()=> setSimStep(s=>s<steps.length?s+1:s), 1800);
      return ()=> clearTimeout(t);
    }
  }, [simStep]);

  return (
    <div>
      <SL>V3 Expansion: Agentic Workflow — "CatchUp Copilot"</SL>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }}>
        <Card accent="#6366f1">
          <span style={{ fontSize:10, padding:"2px 8px", borderRadius:16, background:"#6366f120", color:"#818cf8", fontWeight:700 }}>CURRENT: MVP</span>
          <div style={{ fontSize:14, fontWeight:700, color:"#f1f5f9", margin:"8px 0 6px" }}>Deterministic Pipeline</div>
          <div style={{ fontSize:12, color:"#94a3b8", lineHeight:1.5, marginBottom:10 }}>Fixed sequence: Input → Extract → Score → Auto/Route. ≥90% auto-approved, below goes to inline review. Predictable, fast, debuggable.</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>{[{l:"Latency",v:"2-3s"},{l:"Auto-Approve",v:"68%"},{l:"Best For",v:"Event capture"},{l:"Trust",v:"High"}].map(m=>(<div key={m.l} style={{ background:"#0c1322", borderRadius:5, padding:"5px 8px" }}><div style={{ fontSize:8, color:"#64748b", textTransform:"uppercase" }}>{m.l}</div><div style={{ fontSize:11, color:"#818cf8", fontWeight:700 }}>{m.v}</div></div>))}</div>
        </Card>
        <Card accent="#ec4899">
          <span style={{ fontSize:10, padding:"2px 8px", borderRadius:16, background:"#ec489920", color:"#ec4899", fontWeight:700 }}>EXPANSION: V3</span>
          <div style={{ fontSize:14, fontWeight:700, color:"#f1f5f9", margin:"8px 0 6px" }}>Multi-Agent Orchestration</div>
          <div style={{ fontSize:12, color:"#94a3b8", lineHeight:1.5, marginBottom:10 }}>Autonomous agents that reason, plan, and use tools. Planner decomposes, specialists execute, synthesizer proposes.</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>{[{l:"Latency",v:"8-15s"},{l:"API Calls",v:"8-20+"},{l:"Best For",v:"Planning"},{l:"Trust",v:"Needs guardrails"}].map(m=>(<div key={m.l} style={{ background:"#0c1322", borderRadius:5, padding:"5px 8px" }}><div style={{ fontSize:8, color:"#64748b", textTransform:"uppercase" }}>{m.l}</div><div style={{ fontSize:11, color:"#ec4899", fontWeight:700 }}>{m.v}</div></div>))}</div>
        </Card>
      </div>

      <Card accent="#ec4899" style={{ marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div><div style={{ fontSize:13, fontWeight:700, color:"#f1f5f9" }}>Live Agent Trace: "Plan Lily's Birthday Party"</div><div style={{ fontSize:11, color:"#94a3b8", marginTop:1 }}>Multi-agent orchestration with tool use</div></div>
          <button onClick={()=>setSimStep(simStep===0?1:0)} style={{ padding:"7px 16px", borderRadius:8, border:"none", cursor:"pointer", background:simStep>0?"#334155":"#ec4899", color:"white", fontWeight:700, fontSize:11 }}>{simStep>0?"Reset":"▶ Run Simulation"}</button>
        </div>
        {steps.map((s,i)=>{
          const vis = simStep>i;
          return (
            <div key={i} style={{ opacity:vis?1:0.15, transform:vis?"translateY(0)":"translateY(6px)", transition:"all 0.5s ease", background:"#0c1322", borderRadius:10, padding:12, marginBottom:6, border:vis?"1px solid #334155":"1px solid #1e293b" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:vis?6:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:15 }}>{s.agent.split(" ")[0]}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>{s.agent.split(" ").slice(1).join(" ")}</span>
                  <span style={{ fontSize:10, color:"#64748b" }}>{s.action}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  {s.tools.map(t=><span key={t} style={{ fontSize:8, padding:"2px 6px", borderRadius:8, background:"#8b5cf620", color:"#a78bfa", fontWeight:600 }}>{t}</span>)}
                  <span style={{ fontSize:9, color:"#64748b", fontFamily:FM }}>{s.dur}</span>
                </div>
              </div>
              {vis && <div style={{ fontFamily:FM, fontSize:10, color:"#94a3b8", background:"#020617", padding:8, borderRadius:6, lineHeight:1.4, borderLeft:"3px solid #ec489940" }}><span style={{ color:"#ec4899", fontWeight:600 }}>thinking: </span>{s.thought}</div>}
            </div>
          );
        })}
        {simStep>steps.length-1 && (
          <div style={{ marginTop:10, background:"#10b98110", border:"1px solid #10b98130", borderRadius:8, padding:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#34d399", marginBottom:6 }}>🎯 3 Party Proposals Generated</div>
            {[{t:"Pump It Up (Sat 1-4 PM)",m:"2/3 friends",$:"$299",rec:true},{t:"Discovery Park (Sat 2-5 PM)",m:"2/3 friends",$:"Free",rec:false},{t:"LEGO Café (Sun 1-3 PM)",m:"2/3 friends",$:"$199",rec:false}].map((o,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 8px", background:"#0c1322", borderRadius:6, marginBottom:3, border:o.rec?"1.5px solid #10b98140":"1px solid #1e293b" }}>
                <div><span style={{ fontSize:11, fontWeight:600, color:"#e2e8f0" }}>{o.t}</span>{o.rec && <span style={{ fontSize:8, marginLeft:6, padding:"2px 6px", borderRadius:8, background:"#10b98120", color:"#34d399", fontWeight:700 }}>RECOMMENDED</span>}</div>
                <div style={{ fontSize:10, color:"#64748b" }}>{o.m} · {o.$}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div style={{ fontSize:13, fontWeight:700, color:"#f1f5f9", marginBottom:10 }}>When to Use Which Architecture</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {[
            { task:"Snap photo → event", arch:"Deterministic", why:"Speed + reliability. Fixed 3-step pipeline. ≥90% auto-approved. Predictable failures.", c:"#6366f1" },
            { task:"Plan a birthday party", arch:"Multi-Agent", why:"Requires reasoning, parallel tool calls, and trade-off synthesis.", c:"#ec4899" },
            { task:"'Schedule soccer like usual'", arch:"Hybrid: Agent + Memory", why:"Agent reasons over past patterns, then deterministic creation. Best of both.", c:"#f59e0b" },
          ].map((r,i)=>(
            <div key={i} style={{ background:"#0c1322", borderRadius:8, padding:12, borderLeft:`3px solid ${r.c}` }}>
              <div style={{ fontSize:9, color:r.c, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>{r.arch}</div>
              <div style={{ fontSize:11, fontWeight:700, color:"#e2e8f0", marginBottom:4 }}>"{r.task}"</div>
              <div style={{ fontSize:10, color:"#94a3b8", lineHeight:1.4 }}>{r.why}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  TAB 5: CALENDAR
// ══════════════════════════════════════════════════════════════

function TabCalendar({ calendarEvents, addedCalIds }) {
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}><SL>March 2025 — Week View</SL><span style={{ fontSize:11, color:"#818cf8", fontWeight:600 }}>{calendarEvents.length} events · {addedCalIds.length} AI-added</span></div>
      <Card>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:6 }}>{DAYS.map(d=><div key={d} style={{ textAlign:"center", fontSize:11, color:"#64748b", fontWeight:600, padding:4 }}>{d}</div>)}</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
          {DATES.map(date=>{
            const evts = calendarEvents.filter(e=>parseInt(e.date.split("-")[2])===date);
            const today = date===12;
            return (<div key={date} style={{ background:today?"#1e293b":"#0c1322", borderRadius:10, padding:"8px 4px", minHeight:80, border:today?"1.5px solid #6366f1":"1px solid #1e293b" }}>
              <div style={{ textAlign:"center", fontSize:13, fontWeight:700, marginBottom:6, color:today?"#818cf8":"#94a3b8" }}>{date}</div>
              {evts.map(ev=>(<div key={ev.id} style={{ fontSize:9, padding:"3px 5px", borderRadius:3, background:ev.color+"20", color:ev.color, marginBottom:2, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", borderLeft:`2px solid ${ev.color}` }}>{ev.title}</div>))}
            </div>);
          })}
        </div>
      </Card>
      {addedCalIds.length > 0 && <div style={{ marginTop:14, padding:"12px 16px", borderRadius:10, background:"#10b98110", border:"1px solid #10b98130", display:"flex", alignItems:"center", gap:8 }}><span style={{ fontSize:18 }}>🎉</span><span style={{ color:"#34d399", fontWeight:600, fontSize:12 }}>{addedCalIds.length} event{addedCalIds.length>1?"s":""} added via AI pipeline</span></div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  TAB 6: PRODUCT THINKING — Updated with PLG section
// ══════════════════════════════════════════════════════════════

function TabHiring() {
  return (
    <div>
      <div style={{ background:"linear-gradient(135deg,#1e1b4b,#0f172a)", borderRadius:18, padding:24, marginBottom:18, border:"1px solid #312e81" }}>
        <div style={{ fontSize:18, fontWeight:800, color:"#f1f5f9", marginBottom:4 }}>Lana Baturytski</div>
        <div style={{ fontSize:13, color:"#a78bfa", fontWeight:600, marginBottom:10 }}>AI Product Strategy · Data Architecture · 0→1 Builder</div>
        <div style={{ fontSize:12, color:"#94a3b8", lineHeight:1.6, maxWidth:680 }}>
          Built CatchUp from problem discovery through 68-family beta to strategic kill decision. This project demonstrates end-to-end AI product management: architecting multi-modal ML pipelines, designing human-in-the-loop systems, conducting PLG friction audits, and making metrics-driven decisions — including knowing when to stop.
        </div>
      </div>

      {/* Beta Pilot Summary */}
      <Card style={{ marginBottom:18 }} accent="#6366f1">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:"#f1f5f9", marginBottom:3 }}>Beta Pilot: 68 Families Over 4 Weeks</div>
            <div style={{ fontSize:12, color:"#94a3b8", lineHeight:1.6, maxWidth:560 }}>
              Recruited families through local PTA groups, Instagram parenting communities, and WhatsApp mom networks. Each family used CatchUp as their primary event capture tool for 4 weeks.
            </div>
          </div>
          <div style={{ background:"#6366f110", border:"1px solid #6366f130", borderRadius:10, padding:"10px 16px", textAlign:"center", flexShrink:0 }}>
            <div style={{ fontSize:24, fontWeight:800, color:"#818cf8", fontFamily:FM }}>68</div>
            <div style={{ fontSize:9, color:"#64748b", fontWeight:600 }}>FAMILIES</div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:14 }}>
          {[
            { l:"Weekly Active Usage", v:"40%", sub:"of enrolled families", c:"#6366f1" },
            { l:"AI Parsing Accuracy", v:"92%", sub:"across all input types", c:"#10b981" },
            { l:"Events/Family/Week", v:"3.2", sub:"avg (target was 3+)", c:"#8b5cf6" },
            { l:"Snap-to-Calendar", v:"<2s", sub:"processing time", c:"#06b6d4" },
            { l:"Auto-Approve Rate", v:"68%", sub:"≥90% confidence", c:"#f59e0b" },
          ].map(m=>(
            <div key={m.l} style={{ background:"#0c1322", borderRadius:8, padding:"10px 10px" }}>
              <div style={{ fontSize:8, color:"#64748b", textTransform:"uppercase", letterSpacing:0.6, fontWeight:600 }}>{m.l}</div>
              <div style={{ fontSize:18, fontWeight:800, color:m.c, fontFamily:FM, marginTop:3 }}>{m.v}</div>
              <div style={{ fontSize:9, color:"#475569", marginTop:1 }}>{m.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:14 }}>
          {[
            { label:"Power Users", share:"15%", events:"8+/wk", ret:"85%", c:"#10b981" },
            { label:"Core Users", share:"45%", events:"3-7/wk", ret:"55%", c:"#6366f1" },
            { label:"Casual Users", share:"25%", events:"1-2/wk", ret:"25%", c:"#f59e0b" },
            { label:"At-Risk", share:"15%", events:"0/wk", ret:"8%", c:"#ef4444" },
          ].map(c=>(
            <div key={c.label} style={{ background:"#0c1322", borderRadius:8, padding:"10px", borderLeft:`3px solid ${c.c}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:c.c }}>{c.label}</div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                <div><div style={{ fontSize:8, color:"#475569" }}>SHARE</div><div style={{ fontSize:12, fontWeight:700, color:"#e2e8f0", fontFamily:FM }}>{c.share}</div></div>
                <div><div style={{ fontSize:8, color:"#475569" }}>EVENTS</div><div style={{ fontSize:12, fontWeight:700, color:"#e2e8f0", fontFamily:FM }}>{c.events}</div></div>
                <div><div style={{ fontSize:8, color:"#475569" }}>RETAIN</div><div style={{ fontSize:12, fontWeight:700, color:c.c, fontFamily:FM }}>{c.ret}</div></div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background:"#0c1322", borderRadius:8, padding:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#f1f5f9", marginBottom:6 }}>What the Beta Revealed</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            {[
              { icon:"✅", t:"Validated", d:"Parents genuinely used snap-to-calendar daily. Problem is real, solution works. 92% accuracy exceeded the 85% trust threshold.", c:"#10b981" },
              { icon:"⚠️", t:"Concerning", d:"W1 retention 52% vs 60% target. Casual users (25%) needed stronger habit loops — without recurring use, the product felt like a novelty.", c:"#f59e0b" },
              { icon:"❌", t:"Disqualifying", d:"Willingness to pay: $5-7/mo vs needed $10-15/mo for unit economics. The value was real but not monetizable enough at this scale.", c:"#ef4444" },
            ].map(r=>(
              <div key={r.t} style={{ padding:10, background:"#080e1a", borderRadius:8, borderLeft:`3px solid ${r.c}` }}>
                <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:4 }}><span style={{ fontSize:12 }}>{r.icon}</span><span style={{ fontSize:11, fontWeight:700, color:r.c }}>{r.t}</span></div>
                <div style={{ fontSize:10, color:"#94a3b8", lineHeight:1.5 }}>{r.d}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* NEW: PLG Friction Audit Summary */}
      <Card style={{ marginBottom:18 }} accent="#ec4899">
        <div style={{ fontSize:14, fontWeight:800, color:"#f1f5f9", marginBottom:3 }}>PLG Self-Audit: 15 Friction Points Identified</div>
        <div style={{ fontSize:12, color:"#94a3b8", lineHeight:1.6, marginBottom:12 }}>
          Conducted a Product-Led Growth friction audit of the Home tab UX. Mapped the full activation loop (Land → Capture Value → Aha Moment → Habit → Expand) and identified 5 critical, 5 medium, and 5 polish issues. Then implemented the top 5 fixes in a 1-week sprint.
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr", gap:6, marginBottom:12 }}>
          {[
            { fix:"Up Next Strip", impact:"Glance test", effort:"S", c:"#6366f1" },
            { fix:"Auto-Approve ≥90%", impact:"–70% friction", effort:"M", c:"#10b981" },
            { fix:"Approve → Animation", impact:"Aha moment", effort:"S", c:"#f59e0b" },
            { fix:"Inline Edit", impact:"No ctx switch", effort:"M", c:"#ec4899" },
            { fix:"First-Run State", impact:"Onboarding", effort:"M", c:"#8b5cf6" },
          ].map(f=>(
            <div key={f.fix} style={{ background:"#0c1322", borderRadius:6, padding:"8px", borderTop:`2px solid ${f.c}` }}>
              <div style={{ fontSize:9, fontWeight:700, color:f.c }}>{f.fix}</div>
              <div style={{ fontSize:8, color:"#94a3b8", marginTop:2 }}>{f.impact}</div>
              <div style={{ fontSize:7, color:"#475569", marginTop:1 }}>Effort: {f.effort}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:10, color:"#64748b", lineHeight:1.5 }}>
          Key insight: The biggest retention killer was cognitive overload — 12 decisions on first load. Auto-approve + Approve All reduced this to ~4, directly targeting the W1 retention gap from 52% → projected 60%+.
        </div>
      </Card>

      <SL>Three Lenses on CatchUp</SL>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:18 }}>
        {[
          { title:"Product Manager", icon:"🎯", accent:"#6366f1", skills:[
            { s:"Problem Discovery", d:"Mom Test interviews — past behavior not future intent. 85% struggle with school flyers specifically." },
            { s:"Prioritization", d:"MoSCoW: Photo-to-calendar MVP (highest pain × lowest complexity). Voice, playdates sequenced V2/V3." },
            { s:"PLG Audit", d:"15-point friction audit on own product. Implemented top 5 fixes: Up Next, auto-approve, inline edit, empty state, visual feedback." },
            { s:"Kill Decision", d:"W1 retention 52% (target 60%), WTP $5-7 vs needed $10-15. Pivoted to IP licensing vs burning runway." },
          ]},
          { title:"AI Product Manager", icon:"🧠", accent:"#ec4899", skills:[
            { s:"Pipeline Architecture", d:"Deterministic over agentic for MVP: 2-3s latency, testable stages. Agent expansion designed for V3." },
            { s:"Prompt Engineering", d:"4 iterations: 72% → 92%. Breakthroughs: date context injection, family location cache." },
            { s:"Human-in-the-Loop", d:"≥90% auto-approve. <90% inline review. User edits → training labels. Accuracy flywheel without fine-tuning." },
            { s:"Eval Framework", d:"200+ labeled test cases, 4 modalities. Weekly eval runs measuring field-level accuracy." },
          ]},
          { title:"Data Architect", icon:"📊", accent:"#10b981", skills:[
            { s:"Analytics Stack", d:"Segment → BigQuery → dbt → Looker. Event-level tracking. 4-tier dashboard hierarchy." },
            { s:"Data Modeling", d:"Extraction → structured JSON → Firestore real-time sync. Edit logs → prompt evaluation pipeline." },
            { s:"Scoring Model", d:"Weighted: field completeness (0.30) + date certainty (0.25) + source reliability (0.20) + clarity (0.15) + history (0.10)." },
            { s:"Experimentation", d:"A/B: 7-day min, 95% confidence. Visible vs hidden scores → 23% trust improvement." },
          ]}
        ].map((lens,li)=>(
          <div key={li} style={{ background:"#0f172a", borderRadius:14, border:`1.5px solid ${lens.accent}30`, overflow:"hidden" }}>
            <div style={{ background:`${lens.accent}10`, padding:"12px 16px", display:"flex", alignItems:"center", gap:6, borderBottom:`1px solid ${lens.accent}20` }}>
              <span style={{ fontSize:20 }}>{lens.icon}</span><span style={{ fontSize:13, fontWeight:800, color:lens.accent }}>{lens.title}</span>
            </div>
            <div style={{ padding:14 }}>
              {lens.skills.map((sk,si)=>(<div key={si} style={{ marginBottom:si<lens.skills.length-1?12:0 }}><div style={{ fontSize:11, fontWeight:700, color:"#e2e8f0", marginBottom:2 }}>{sk.s}</div><div style={{ fontSize:10, color:"#94a3b8", lineHeight:1.5 }}>{sk.d}</div></div>))}
            </div>
          </div>
        ))}
      </div>

      <Card accent="#f59e0b" style={{ marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#f1f5f9", marginBottom:12 }}>Strategic Decision Framework: Go / No-Go</div>
        <div style={{ display:"flex", gap:4, alignItems:"center", flexWrap:"wrap", marginBottom:14 }}>
          {[
            { s:"Problem\nValidation", r:"✅", c:"#10b981", d:"85% flyer overload" },
            { s:"Technical\nFeasibility", r:"✅", c:"#10b981", d:"92% accuracy" },
            { s:"User\nRetention", r:"⚠️", c:"#f59e0b", d:"52% vs 60% target" },
            { s:"Revenue\nModel", r:"❌", c:"#ef4444", d:"WTP gap: $5 vs $10+" },
            { s:"Market\nOpportunity", r:"✅", c:"#10b981", d:"120M SAM" },
            { s:"Personal\nRisk", r:"❌", c:"#ef4444", d:"Solo founder runway" },
          ].map((st,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
              <div style={{ background:`${st.c}10`, border:`1.5px solid ${st.c}30`, borderRadius:8, padding:"8px 12px", textAlign:"center", minWidth:100 }}>
                <div style={{ fontSize:16, marginBottom:1 }}>{st.r}</div>
                <div style={{ fontSize:9, color:st.c, fontWeight:700, whiteSpace:"pre-line", lineHeight:1.2 }}>{st.s}</div>
                <div style={{ fontSize:8, color:"#64748b", marginTop:3 }}>{st.d}</div>
              </div>
              {i<5 && <span style={{ color:"#334155", fontSize:14 }}>→</span>}
            </div>
          ))}
        </div>
        <div style={{ background:"#0c1322", borderRadius:8, padding:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#fbbf24", marginBottom:4 }}>Decision: Strategic Pivot to IP Licensing</div>
          <div style={{ fontSize:11, color:"#94a3b8", lineHeight:1.5 }}>Licensed AI extraction research to an EdTech company. Preserved technical IP, generated revenue, avoided personal risk. The framework revealed that while problem and technology were strong, the business model gap was the critical blocker.</div>
        </div>
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Card accent="#8b5cf6">
          <div style={{ fontSize:13, fontWeight:700, color:"#f1f5f9", marginBottom:8 }}>What Worked</div>
          {["Mom Test methodology surfaced real behaviors, not hypothetical willingness","Deterministic pipeline shipped reliable MVP in 6 weeks","Confidence scoring + auto-approve built measurable trust (+23%)","Prompt engineering 72% → 92% with zero training costs","PLG friction audit identified and fixed 5 critical retention blockers","Honest metrics framework made kill decision data-driven"].map((w,i)=>(
            <div key={i} style={{ display:"flex", gap:6, marginBottom:6, fontSize:11, color:"#94a3b8", lineHeight:1.4 }}><span style={{ color:"#10b981", flexShrink:0 }}>✓</span>{w}</div>
          ))}
        </Card>
        <Card accent="#f43f5e">
          <div style={{ fontSize:13, fontWeight:700, color:"#f1f5f9", marginBottom:8 }}>What I'd Do Differently</div>
          {["Test WTP earlier — pricing experiments before building full pipeline","Build retention mechanics first (habit loops, Up Next) before optimizing accuracy","Partner with 2-3 schools for distribution before going D2C","Explore B2B2C (school licensing) as primary revenue earlier","Run concierge MVP (manual extraction) before investing in AI","Conduct PLG audit at design stage, not post-beta"].map((w,i)=>(
            <div key={i} style={{ display:"flex", gap:6, marginBottom:6, fontSize:11, color:"#94a3b8", lineHeight:1.4 }}><span style={{ color:"#f59e0b", flexShrink:0 }}>→</span>{w}</div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  TAB 7: PRODUCT EXPANSION — AGENTIC ECOSYSTEM (unchanged)
// ══════════════════════════════════════════════════════════════

const EXPANSION_SCENARIOS = [
  {
    id: "play", module: "CatchUp Play", icon: "🧒", accent: "#ec4899",
    tagline: "Find the best time to let kids catch up, too.",
    problem: "Coordinating playdates involves awkward text chains, mismatched schedules, and unclear preferences. Parents report spending 15+ minutes per playdate negotiation.",
    userPrompt: '"Set up a playdate for Lily with her friend Emma this week"',
    metrics: { dau: "+1-3x/week per child", viral: "Each invite brings a new parent", revenue: "PlayPass $4.99/mo + venue affiliates" },
    orchestration: [
      { agent: "🧠 Orchestrator", role: "Intent Classifier + Router", action: "Classifies 'playdate request' intent → spawns 4 parallel agents", tools: ["Intent Model"], state: "PLANNING", dur: "0.3s",
        thought: "Intent: PLAYDATE_REQUEST. Entities: child=Lily, friend=Emma, timeframe=this_week. Spawning Calendar, Social, Preference, and Venue agents in parallel." },
      { agent: "📅 Calendar Agent", role: "Availability Scanner", action: "Scans Lily's family calendar for open slots", tools: ["Google Calendar API", "School Schedule DB"], state: "EXECUTING", dur: "1.1s",
        thought: "Lily's schedule this week: Mon — dance 4-5pm. Tue — free after 3pm. Wed — soccer 4:30. Thu — free after 3pm. Fri — free after 2:30pm. Best windows: Tue 3-6pm, Thu 3-6pm, Fri 2:30-6pm." },
      { agent: "👥 Social Agent", role: "Friend Matcher", action: "Checks Emma's availability through CatchUp Circle", tools: ["CatchUp Circle API", "Shared Availability"], state: "EXECUTING", dur: "1.8s",
        thought: "Emma's availability (shared by her parent): Tue — dance 3-4:30. Thu — free after 3pm. Fri — doctor 3pm. Match: Thu 3-6pm is the only overlap. Emma's parent prefers outdoor activities." },
      { agent: "📍 Venue Agent", role: "Activity Finder", action: "Suggests age-appropriate activities near both families", tools: ["Google Places API", "Weather API"], state: "EXECUTING", dur: "2.2s",
        thought: "Both families within 3mi of Discovery Park. Thu forecast: 68°F sunny. Park has playground (ages 5-10), picnic area. Alternative: Pump It Up (indoor, $15/kid). Recommending park — free, outdoor, preference match." },
      { agent: "🎯 Proposal Agent", role: "Playdate Packager", action: "Generates 2 options with one-tap scheduling", tools: ["LLM Synthesis", "Calendar Write API"], state: "SYNTHESIZING", dur: "0.8s",
        thought: "Option A: Thu 3:30-5:30pm at Discovery Park (free, outdoor, both kids available). Option B: Thu 3:30-5:30pm at Pump It Up ($30 total, indoor backup). Generating message template for Emma's parent." }
    ],
    proposals: [
      { title: "Discovery Park — Thu 3:30-5:30 PM", match: "Perfect match", tags: ["Free", "Outdoor", "Both available", "2.1 mi"], rec: true },
      { title: "Pump It Up — Thu 3:30-5:30 PM", match: "Indoor backup", tags: ["$15/kid", "Indoor", "Rain plan", "3.4 mi"], rec: false }
    ],
    output: "📅 Playdate: Thu 3:30 PM, Discovery Park\n💬 Message to Emma's parent: 'Hi! Want to do Discovery Park Thursday at 3:30? Kids are both free and weather looks great! 🌞'\n⏰ Reminder set for Thu 3:00 PM\n📍 Discovery Park directions saved"
  },
  {
    id: "gifts", module: "CatchUp Gifts", icon: "🎁", accent: "#f59e0b",
    tagline: "Never miss a birthday — plan the perfect party with AI.",
    problem: "Birthday party planning takes 5-8 hours across venues, guest lists, invitations, and logistics. 62% of parents report party planning as their most stressful annual task.",
    userPrompt: '"Help me plan Lily\'s 7th birthday party — she loves butterflies and painting"',
    metrics: { dau: "2-4 weeks of daily engagement per party", viral: "E-vites bring 8-15 new parents", revenue: "Venue booking affiliates + premium templates" },
    orchestration: [
      { agent: "🧠 Orchestrator", role: "Party Planning Coordinator", action: "Decomposes birthday planning into parallel workstreams", tools: ["Intent Model","Task Decomposer"], state: "PLANNING", dur: "0.4s",
        thought: "Intent: BIRTHDAY_PARTY_PLAN. Child: Lily, age: turning 7, date: Mar 22 (Sat). Spawning 5 agents: Calendar, Guest, Venue, Theme, Budget." },
      { agent: "📅 Calendar Agent", role: "Date Optimizer", action: "Checks family schedule + school calendar around Mar 22", tools: ["Google Calendar API","School Calendar"], state: "EXECUTING", dur: "0.8s",
        thought: "Mar 22 (Sat): Family free 10am-6pm. No school conflicts. Spring break starts Mar 24. Recommend morning party (11am-1pm) to maximize attendance." },
      { agent: "👥 Guest Agent", role: "Contact List Builder", action: "Pulls Lily's friend network from playdate history", tools: ["CatchUp Circle","Play History DB","Contacts"], state: "EXECUTING", dur: "1.4s",
        thought: "Lily's close friends: Emma (6 playdates), Ava (4), Noah (3), Mia (3), Oliver (2). Recommendation: invite close 8-10 friends." },
      { agent: "📍 Venue Agent", role: "Party Venue Finder", action: "Searches kid birthday party venues", tools: ["Google Places API","Yelp API","Booking Availability"], state: "EXECUTING", dur: "2.8s",
        thought: "Lily's interests: art, animals, outdoor play. Top venues: 1) Paint & Create Studio ($249, 12 kids max). 2) Zoo party ($325, 15 kids). 3) Backyard DIY ($180, unlimited)." },
      { agent: "🎨 Theme Agent", role: "Personalization Engine", action: "Matches party themes to Lily's interests", tools: ["Preference Store","LLM Creative"], state: "EXECUTING", dur: "1.2s",
        thought: "Lily loves painting, favorite color purple, obsessed with butterflies. Themes: 1) Butterfly Art Garden 🦋, 2) Rainbow Paint Splash 🎨, 3) Enchanted Forest 🌿." },
      { agent: "🎯 Proposal Agent", role: "Party Plan Synthesizer", action: "Combines all outputs into complete packages", tools: ["LLM Synthesis","Cost Calculator"], state: "SYNTHESIZING", dur: "1.0s",
        thought: "Package A: 'Butterfly Art Party' at Paint & Create, 11am-1pm, 10 friends, ~$389. Package B: 'Backyard Butterfly Garden', $290. Package C: Zoo party, ~$365." }
    ],
    proposals: [
      { title: "Butterfly Art Party — Paint & Create Studio", match: "Best for Lily", tags: ["Art + butterflies", "10 friends", "$389 est.", "11am-1pm"], rec: true },
      { title: "Backyard Butterfly Garden — Home", match: "Budget-friendly", tags: ["DIY + bounce house", "Unlimited kids", "$290 est.", "Flexible"], rec: false },
      { title: "Wild Butterfly Tour — Woodland Park Zoo", match: "Adventure pick", tags: ["Animal encounters", "15 kids max", "$365 est.", "10am-12pm"], rec: false }
    ],
    output: "📋 Full Party Plan generated:\n• Guest list: 10 friends with parent contacts\n• E-vite template (butterfly theme) ready to send\n• Venue hold placed (24hr)\n• Shopping list: decorations, supplies, cake order\n• Day-of timeline: setup, activities, cake, goodie bags"
  },
  {
    id: "me", module: "CatchUp Me", icon: "🧘", accent: "#14b8a6",
    tagline: "Your personal time advisor for self-care and errands.",
    problem: "Parents consistently deprioritize their own needs. 68% report skipping self-care appointments due to scheduling friction.",
    userPrompt: '"I haven\'t had a haircut in 3 months and I keep forgetting to schedule it"',
    metrics: { dau: "Weekly nudges + errand reminders", viral: "Shared self-care wins in mom groups", revenue: "CatchUp Me Pro $4.99/mo + booking affiliates" },
    orchestration: [
      { agent: "🧠 Orchestrator", role: "Self-Care Coordinator", action: "Detects self-care intent + scans for available windows", tools: ["Intent Model","Priority Scorer"], state: "PLANNING", dur: "0.3s",
        thought: "Intent: SELF_CARE_SCHEDULING. Type: haircut (recurring, ~8 weeks). Last: Dec 12. Overdue by 4 weeks. Priority: MEDIUM-HIGH." },
      { agent: "📅 Calendar Agent", role: "Free Time Finder", action: "Scans next 2 weeks for 90-minute windows", tools: ["Google Calendar API","Commute Estimator"], state: "EXECUTING", dur: "1.0s",
        thought: "Best slots: Wed 10-11:30am (kids in school). Thu 1-2:30pm (Lily at dance). Sat 9-10:30am (partner home). Prioritizing Wed." },
      { agent: "💈 Booking Agent", role: "Appointment Finder", action: "Checks availability at preferred salons", tools: ["Google Places API","Booking API"], state: "EXECUTING", dur: "2.0s",
        thought: "Preferred: 'Style & Grace' (visited 3x, 4.8★, 1.2mi). Wed 10am — AVAILABLE with Sarah (usual stylist). Recommendation: Wed 10am." },
      { agent: "🔔 Nudge Agent", role: "Habit Loop Creator", action: "Sets up recurring reminder", tools: ["Notification Engine","Habit Tracker"], state: "EXECUTING", dur: "0.4s",
        thought: "Creating 8-week recurring haircut reminder. Gentle nudge at 7 weeks. Auto-scan at 8 weeks. 'Self-care win' celebration on completion." },
      { agent: "🎯 Proposal Agent", role: "Action Packager", action: "Presents bookable option with one-tap confirm", tools: ["LLM Synthesis","Calendar Write API"], state: "SYNTHESIZING", dur: "0.5s",
        thought: "Best: Wed 10am at Style & Grace with Sarah. One tap: book, block calendar, set reminder, enable 8-week recurring nudge." }
    ],
    proposals: [
      { title: "Wed 10:00 AM — Style & Grace (Sarah)", match: "Perfect match", tags: ["Usual stylist", "School hours", "1.2 mi", "1 tap"], rec: true },
      { title: "Thu 1:30 PM — Style & Grace (Jordan)", match: "Backup option", tags: ["Different stylist", "Lily at dance", "1.2 mi"], rec: false },
      { title: "Sat 9:30 AM — Style & Grace (Waitlist)", match: "Weekend option", tags: ["Partner watches kids", "Waitlisted"], rec: false }
    ],
    output: "✅ Booked: Haircut Wed 10am, Style & Grace\n📅 Calendar blocked + 'leave by 9:45' reminder set\n🔁 Recurring 8-week nudge activated\n💆 CatchUp Me self-care streak: 3 weeks 🔥"
  }
];

function TabExpansion() {
  const [activeModule, setActiveModule] = useState("play");
  const [simStep, setSimStep] = useState(0);
  const scenario = EXPANSION_SCENARIOS.find(s => s.id === activeModule);

  useEffect(() => { setSimStep(0); }, [activeModule]);
  useEffect(() => {
    if (simStep > 0 && simStep <= scenario.orchestration.length) {
      const t = setTimeout(() => setSimStep(s => s < scenario.orchestration.length ? s + 1 : s), 1600);
      return () => clearTimeout(t);
    }
  }, [simStep, scenario]);

  const modules = [
    { id: "play", label: "CatchUp Play", icon: "🧒", sub: "Playdate Planner", accent: "#ec4899" },
    { id: "gifts", label: "CatchUp Gifts", icon: "🎁", sub: "Birthday Planner", accent: "#f59e0b" },
    { id: "me", label: "CatchUp Me", icon: "🧘", sub: "Self-Care Advisor", accent: "#14b8a6" },
  ];

  const stateColors = { PLANNING:"#a78bfa", EXECUTING:"#38bdf8", SYNTHESIZING:"#34d399" };

  return (
    <div>
      <div style={{ background:"linear-gradient(135deg,#1e1b4b,#0f172a,#0f172a)", borderRadius:16, padding:22, marginBottom:18, border:"1px solid #312e81" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:"#f1f5f9", marginBottom:4 }}>CatchUp Ecosystem: From Calendar Tool → Family OS</div>
            <div style={{ fontSize:12, color:"#94a3b8", lineHeight:1.6, maxWidth:600 }}>
              Each expansion module is powered by a multi-agent orchestration layer. The Orchestrator classifies intent, decomposes tasks, and delegates to specialist agents — then synthesizes results into one-tap actions.
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {[{l:"Core",v:"Calendar",c:"#6366f1"},{l:"V2",v:"Play",c:"#ec4899"},{l:"V3",v:"Me + Gifts",c:"#14b8a6"}].map(p=>(
              <div key={p.l} style={{ background:`${p.c}10`, border:`1px solid ${p.c}30`, borderRadius:8, padding:"6px 12px", textAlign:"center" }}>
                <div style={{ fontSize:8, color:p.c, fontWeight:700, textTransform:"uppercase", letterSpacing:1 }}>{p.l}</div>
                <div style={{ fontSize:11, color:"#e2e8f0", fontWeight:700 }}>{p.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:18 }}>
        {modules.map(m => (
          <div key={m.id} onClick={() => setActiveModule(m.id)} style={{
            background: activeModule === m.id ? `${m.accent}12` : "#0f172a",
            border: activeModule === m.id ? `2px solid ${m.accent}60` : "2px solid #1e293b",
            borderRadius: 14, padding: "14px 16px", cursor: "pointer", transition: "all 0.25s"
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <span style={{ fontSize:22 }}>{m.icon}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color: activeModule === m.id ? m.accent : "#e2e8f0" }}>{m.label}</div>
                <div style={{ fontSize:10, color:"#64748b" }}>{m.sub}</div>
              </div>
            </div>
            <div style={{ fontSize:11, color:"#94a3b8", lineHeight:1.4 }}>{EXPANSION_SCENARIOS.find(s=>s.id===m.id).tagline}</div>
          </div>
        ))}
      </div>

      {scenario && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            <Card>
              <div style={{ fontSize:12, fontWeight:700, color:"#f1f5f9", marginBottom:6 }}>Problem This Solves</div>
              <div style={{ fontSize:12, color:"#94a3b8", lineHeight:1.6 }}>{scenario.problem}</div>
            </Card>
            <Card accent={scenario.accent}>
              <div style={{ fontSize:12, fontWeight:700, color:"#f1f5f9", marginBottom:6 }}>User Says:</div>
              <div style={{ fontFamily:FM, fontSize:12, color:scenario.accent, lineHeight:1.5, fontWeight:600 }}>{scenario.userPrompt}</div>
              <div style={{ display:"flex", gap:8, marginTop:10 }}>
                {Object.entries(scenario.metrics).map(([k,v])=>(
                  <div key={k} style={{ background:"#0c1322", borderRadius:6, padding:"5px 8px", flex:1 }}>
                    <div style={{ fontSize:8, color:"#64748b", textTransform:"uppercase", letterSpacing:0.6 }}>{k==="dau"?"DAU Impact":k==="viral"?"Viral Loop":"Revenue"}</div>
                    <div style={{ fontSize:10, color:"#e2e8f0", fontWeight:600, marginTop:1 }}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card accent={scenario.accent} style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#f1f5f9" }}>Agent Orchestration: {scenario.module}</div>
                <div style={{ fontSize:11, color:"#94a3b8", marginTop:1 }}>{scenario.orchestration.length} agents · parallel execution · tool use</div>
              </div>
              <button onClick={() => setSimStep(simStep === 0 ? 1 : 0)} style={{
                padding:"7px 18px", borderRadius:8, border:"none", cursor:"pointer",
                background: simStep > 0 ? "#334155" : scenario.accent, color:"white", fontWeight:700, fontSize:11
              }}>{simStep > 0 ? "Reset" : "▶ Run Agents"}</button>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {scenario.orchestration.map((agent, i) => {
                const vis = simStep > i;
                const isOrch = agent.role.includes("Orchestrator") || agent.role.includes("Coordinator") || agent.role.includes("Planning");
                const sc = stateColors[agent.state] || "#94a3b8";
                return (
                  <div key={i} style={{
                    opacity: vis ? 1 : 0.15, transform: vis ? "translateY(0)" : "translateY(6px)",
                    transition: "all 0.5s ease", background: isOrch ? "#0c1322" : "#080e1a",
                    borderRadius: 10, padding: 12, border: vis ? `1px solid ${scenario.accent}25` : "1px solid #1e293b",
                    borderLeft: vis ? `3px solid ${sc}` : "3px solid transparent"
                  }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: vis ? 6 : 0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, flex:1 }}>
                        <span style={{ fontSize:15 }}>{agent.agent.split(" ")[0]}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <span style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>{agent.agent.split(" ").slice(1).join(" ")}</span>
                            <span style={{ fontSize:8, padding:"1px 6px", borderRadius:8, background:`${sc}20`, color:sc, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>{agent.state}</span>
                          </div>
                          <div style={{ fontSize:10, color:"#64748b", marginTop:1 }}>{agent.role} — {agent.action}</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
                        {agent.tools.map(t => <span key={t} style={{ fontSize:8, padding:"2px 6px", borderRadius:6, background:"#8b5cf620", color:"#a78bfa", fontWeight:600 }}>{t}</span>)}
                        <span style={{ fontSize:9, color:"#475569", fontFamily:FM, marginLeft:4 }}>{agent.dur}</span>
                      </div>
                    </div>
                    {vis && (
                      <div style={{ fontFamily:FM, fontSize:10, color:"#94a3b8", background:"#020617", padding:8, borderRadius:6, lineHeight:1.5, borderLeft:`3px solid ${scenario.accent}30`, marginTop:4 }}>
                        <span style={{ color:scenario.accent, fontWeight:600 }}>reasoning: </span>{agent.thought}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {simStep >= scenario.orchestration.length && (
              <div style={{ marginTop:12 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#34d399", marginBottom:8 }}>🎯 Agent Output: {scenario.proposals.length} Proposals</div>
                {scenario.proposals.map((p, i) => (
                  <div key={i} style={{
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                    padding:"8px 10px", background:"#0c1322", borderRadius:8, marginBottom:4,
                    border: p.rec ? `1.5px solid ${scenario.accent}40` : "1px solid #1e293b"
                  }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:"#e2e8f0" }}>{p.title}</span>
                        {p.rec && <span style={{ fontSize:7, padding:"2px 6px", borderRadius:8, background:`${scenario.accent}20`, color:scenario.accent, fontWeight:700 }}>RECOMMENDED</span>}
                      </div>
                      <div style={{ display:"flex", gap:4, marginTop:4 }}>
                        {p.tags.map(t => <span key={t} style={{ fontSize:8, padding:"1px 5px", borderRadius:4, background:"#1e293b", color:"#94a3b8" }}>{t}</span>)}
                      </div>
                    </div>
                    <span style={{ fontSize:9, color:"#475569" }}>{p.match}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#f1f5f9", marginBottom:8 }}>Complete Output Preview</div>
            <div style={{ fontFamily:FM, fontSize:10, color:"#94a3b8", background:"#020617", padding:12, borderRadius:8, lineHeight:1.7, whiteSpace:"pre-wrap", border:`1px solid ${scenario.accent}20` }}>{scenario.output}</div>
            <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:6, padding:"8px 12px", background:"#10b98108", borderRadius:8, border:"1px solid #10b98120" }}>
              <div style={{ fontSize:14 }}>✅</div>
              <div style={{ fontSize:10, color:"#10b981", fontWeight:700 }}>User Confirms (1 tap) → Calendar Updated</div>
            </div>
          </Card>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Card accent="#8b5cf6">
              <div style={{ fontSize:12, fontWeight:700, color:"#f1f5f9", marginBottom:8 }}>Agent Guardrails</div>
              {[
                "Orchestrator validates intent before spawning agents — prevents hallucinated tasks",
                "All agents have 5-second timeout + fallback to human prompt if tool call fails",
                "Proposals ALWAYS require user confirmation — agents suggest, humans decide",
                "Personal data (contacts, calendars) never leaves the secure agent sandbox",
                "Confidence threshold: <70% match → agent asks clarifying question instead of guessing"
              ].map((g,i) => (
                <div key={i} style={{ display:"flex", gap:6, marginBottom:5, fontSize:10, color:"#94a3b8", lineHeight:1.4 }}>
                  <span style={{ color:"#a78bfa", flexShrink:0 }}>◆</span>{g}
                </div>
              ))}
            </Card>
            <Card accent="#06b6d4">
              <div style={{ fontSize:12, fontWeight:700, color:"#f1f5f9", marginBottom:8 }}>Why Multi-Agent vs Single LLM Call</div>
              {[
                { q:"Why not one big prompt?", a:"Single prompt can't call 4 APIs in parallel. Agents reduce latency from ~12s serial to ~4s parallel." },
                { q:"Why separate Orchestrator?", a:"Decouples intent classification from execution. Easier to add new modules without touching routing logic." },
                { q:"Why not full autonomy?", a:"Parents need control. 'Suggest + confirm' pattern builds trust while keeping agents useful." },
                { q:"How does this scale?", a:"New modules (Carpool, Homework) just register with the Orchestrator — specialist agents are plug-and-play." }
              ].map((qa,i) => (
                <div key={i} style={{ marginBottom: i < 3 ? 8 : 0 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#22d3ee" }}>{qa.q}</div>
                  <div style={{ fontSize:10, color:"#94a3b8", lineHeight:1.4, marginTop:1 }}>{qa.a}</div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  TAB: PLG FRICTION AUDIT
// ══════════════════════════════════════════════════════════════

const PLG_ITEMS = [
  { id:1, sev:"🔴", label:"Critical", title:"No 'Up Next' strip", why:"Most common calendar action is a 2-second glance: 'What's my next thing?' — buried below 4 pending cards. Fails the glance test.", fix:"Added ⏰ Up Next strip below Add Event bar. Always visible, shows next event + countdown.", impact:"Activation", impactRet:"Retention", effort:"S", effortHrs:"~4 hrs", done:true, metric:"Passes 2-second glance test — #1 reason users open a calendar" },
  { id:2, sev:"🔴", label:"Critical", title:"No auto-approve for high-confidence", why:"4 pending × 3 buttons = 12 decisions on first load. Cognitive overload kills daily return (52% W1 retention).", fix:"Auto-approve ≥90% confidence + 'Approve All' button. Decision count drops from 12 → ~4.", impact:"Activation", impactRet:"Retention", effort:"M", effortHrs:"~6 hrs", done:true, metric:"68% of events skip manual review — cognitive load cut by 70%" },
  { id:3, sev:"🔴", label:"Critical", title:"'Edit' navigates away from Home", why:"Clicking Edit triggers tab switch to AI Pipeline. User loses calendar context, pending queue position — classic context-switch anti-pattern.", fix:"Inline editing — expand pending card in-place with editable fields. Save collapses back. Never leave Home.", impact:"Activation", impactRet:"Retention", effort:"M", effortHrs:"~8 hrs", done:true, metric:"Zero context switches during review flow" },
  { id:4, sev:"🔴", label:"Critical", title:"No empty state / first-run experience", why:"Day 1 = empty calendar, but prototype shows pre-populated data. No onboarding, no 'snap your first event' CTA, no progressive disclosure.", fix:"Dedicated first-run state: big CTA '📷 Snap a school flyer', 3-step visual, social proof '68 families'.", impact:"Activation", impactRet:"Retention", effort:"M", effortHrs:"~6 hrs", done:true, metric:"First-run → first event capture in <15 seconds" },
  { id:5, sev:"🔴", label:"Critical", title:"No visible cause → effect on approve", why:"Approve fades out pending card but nothing happens on calendar. Breaks feedback loop — aha moment never lands.", fix:"On approve: (1) flash calendar cell green, (2) show toast '✓ Spring Fair added to Mar 15', (3) event appears as solid pill.", impact:"Aha Moment", impactRet:"Retention", effort:"S", effortHrs:"~4 hrs", done:true, metric:"Aha moment is now unmissable — visual + toast confirmation" },
  { id:6, sev:"🟡", label:"Medium", title:"'Event' in view switcher breaks mental model", why:"Event | Day | Week | Month | Year — 'Event' is a detail view, not a temporal granularity. Violates Google/Apple Calendar pattern.", fix:"Removed 'Event' from switcher. Now opens as overlay/modal when clicking an event pill.", impact:"Activation", impactRet:"Low", effort:"S", effortHrs:"~1 hr", done:true, metric:"View switcher now matches user mental model" },
  { id:7, sev:"🟡", label:"Medium", title:"Confidence badge unexplained", why:"Badges show '94%', '79%' with no context. Users don't know what drives the score or why they should care.", fix:"Added ⓘ tooltip: 'AI confidence that details are correct' + reason ('Relative date lowers score').", impact:"Activation", impactRet:"Low", effort:"S", effortHrs:"~2 hrs", done:true, metric:"Users can now understand and act on confidence scores" },
  { id:8, sev:"🟡", label:"Medium", title:"Striped vs solid too subtle", why:"Pending/confirmed distinction relies on 15% opacity CSS stripes. Nearly invisible on small screens or at a glance.", fix:"Pending events now use dashed border + ⏳ icon prefix + 65% opacity. Universally understood as 'draft/incomplete'.", impact:"Activation", impactRet:"Retention", effort:"S", effortHrs:"~2 hrs", done:true, metric:"Pending state visible at any screen size" },
  { id:9, sev:"🟡", label:"Medium", title:"Today agenda doesn't sync with calendar view", why:"Mini 'Today' panel and Day view show identical content — redundant information wastes sidebar space.", fix:"Context-aware sidebar: Day view → shows 'Tomorrow', Week view → 'This Week', Month/Year → 'Today'.", impact:"Low", impactRet:"Retention", effort:"M", effortHrs:"~3 hrs", done:true, metric:"Maximized information density, zero redundancy" },
  { id:10, sev:"🟡", label:"Medium", title:"Add Event bar doesn't explain what happens next", why:"6 input sources are equal-weight buttons with no indication of next step. 'Does Photo open camera? Does Email ask for forwarding address?'", fix:"Added micro-copy hints: 📷 'Opens camera', 🎙️ 'Record a memo', ✉️ 'Forward to catchup@...'", impact:"Activation", impactRet:"Low", effort:"S", effortHrs:"~1 hr", done:true, metric:"Every input source has clear affordance" },
  { id:11, sev:"🟢", label:"Polish", title:"No search", why:"Calendar users expect Ctrl+F / 🔍. Missing basic table-stakes feature.", fix:"Added search icon in calendar header — expands to filter input.", impact:"Low", impactRet:"Retention", effort:"M", effortHrs:"~3 hrs", done:true, metric:"Table-stakes feature parity with Google Calendar" },
  { id:12, sev:"🟢", label:"Polish", title:"No 'shared with' indicator", why:"CatchUp Circles viral loop is invisible — no event shows sharing status, no invite CTA.", fix:"Added '👥 Shared with 2 families' in event overlay + 'Invite a family' CTA in sidebar.", impact:"Low", impactRet:"Retention", effort:"M", effortHrs:"~3 hrs", done:true, metric:"Viral loop now visible — drives CatchUp Circle adoption" },
  { id:13, sev:"🟢", label:"Polish", title:"No notification badge / return trigger", why:"No 'new since your last visit' indicator. Pending count is static — no urgency signal.", fix:"Added 🔔 badge: '3 new events captured' on return.", impact:"Low", impactRet:"Retention", effort:"S", effortHrs:"~1 hr", done:true, metric:"Return triggers create urgency + habit loop" },
  { id:14, sev:"🟢", label:"Polish", title:"Calendar click-to-create", why:"Empty time slots in Day/Week view are dead clicks. Google Calendar prompts 'Add event at 2 PM?'", fix:"Empty slots now clickable with '+' indicator and toast prompt.", impact:"Low", impactRet:"Retention", effort:"M", effortHrs:"~2 hrs", done:true, metric:"Matches Google Calendar interaction model" },
  { id:15, sev:"🟢", label:"Polish", title:"No dark/light mode toggle", why:"Dark-only design limits accessibility for early-morning use.", fix:"Noted as low priority — would add in future sprint.", impact:"Low", impactRet:"Low", effort:"L", effortHrs:"~5 hrs", done:false, metric:"Deferred — lowest impact in audit" }
];

const LOOP_STAGES = [
  { label:"Land", icon:"🛬", color:"#6366f1", desc:"User opens CatchUp for the first time", fixes:[4] },
  { label:"Capture Value", icon:"⚡", color:"#8b5cf6", desc:"User sees AI-extracted events from their inputs", fixes:[1,2,10] },
  { label:"Aha Moment", icon:"✨", color:"#f59e0b", desc:"User approves event → sees it appear on calendar", fixes:[5,7,8] },
  { label:"Habit", icon:"🔁", color:"#10b981", desc:"User returns daily to check schedule + review new captures", fixes:[3,6,9,13,14] },
  { label:"Expand", icon:"🚀", color:"#ec4899", desc:"User invites family, shares calendar, explores modules", fixes:[11,12,15] }
];

function TabPLG() {
  const [selectedStage, setSelectedStage] = useState(null);
  const [sortBy, setSortBy] = useState("id");

  const sorted = [...PLG_ITEMS].sort((a,b) => {
    if (sortBy === "sev") { const order = {"🔴":0,"🟡":1,"🟢":2}; return order[a.sev] - order[b.sev]; }
    if (sortBy === "effort") { const order = {"S":0,"M":1,"L":2}; return order[a.effort] - order[b.effort]; }
    if (sortBy === "done") return (b.done?1:0) - (a.done?1:0);
    return a.id - b.id;
  });

  const doneCount = PLG_ITEMS.filter(i => i.done).length;
  const critCount = PLG_ITEMS.filter(i => i.sev === "🔴").length;
  const critDone = PLG_ITEMS.filter(i => i.sev === "🔴" && i.done).length;
  const filteredItems = selectedStage !== null ? sorted.filter(i => LOOP_STAGES[selectedStage].fixes.includes(i.id)) : sorted;

  return (
    <div>
      <SL>PLG Friction Audit — 15 Points Identified, {doneCount} Implemented</SL>

      {/* Framework intro */}
      <Card accent="#6366f1" style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>Audit Framework: PLG Activation Loop</div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, marginBottom: 14 }}>
          Every extra click, every unexplained element, every moment of "wait, what do I do?" is a drop-off risk. In PLG, the product IS the sales team — if the home screen doesn't convert a visitor to an activated user in under 60 seconds, you've lost them.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          {LOOP_STAGES.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => setSelectedStage(selectedStage === i ? null : i)} style={{
                background: selectedStage === i ? `${s.color}25` : `${s.color}10`,
                border: `1.5px solid ${selectedStage === i ? s.color : s.color + "30"}`,
                borderRadius: 10, padding: "10px 14px", textAlign: "center", minWidth: 90, cursor: "pointer",
                transition: "all 0.2s", transform: selectedStage === i ? "scale(1.05)" : "scale(1)"
              }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{s.icon}</div>
                <div style={{ fontSize: 10, color: s.color, fontWeight: 700 }}>{s.label}</div>
                <div style={{ fontSize: 8, color: "#64748b", marginTop: 2 }}>{s.fixes.length} fixes</div>
              </button>
              {i < 4 && <span style={{ fontSize: 14, color: "#334155" }}>→</span>}
            </div>
          ))}
        </div>
        {selectedStage !== null && (
          <div style={{ marginTop: 12, padding: 10, background: `${LOOP_STAGES[selectedStage].color}08`, borderRadius: 8, border: `1px solid ${LOOP_STAGES[selectedStage].color}20`, textAlign: "center" }}>
            <span style={{ fontSize: 11, color: LOOP_STAGES[selectedStage].color, fontWeight: 600 }}>{LOOP_STAGES[selectedStage].label}:</span>
            <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6 }}>{LOOP_STAGES[selectedStage].desc}</span>
            <span style={{ fontSize: 10, color: "#64748b", marginLeft: 8 }}>— click again to clear filter</span>
          </div>
        )}
      </Card>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
        {[
          { label: "Total Issues", value: "15", sub: "Identified in self-audit", color: "#6366f1" },
          { label: "Implemented", value: `${doneCount}/15`, sub: `${Math.round(doneCount/15*100)}% complete`, color: "#10b981" },
          { label: "Critical Fixed", value: `${critDone}/${critCount}`, sub: "All critical issues resolved", color: "#f43f5e" },
          { label: "Decision Reduction", value: "70%", sub: "12 → ~4 decisions on load", color: "#f59e0b" }
        ].map((s, i) => (
          <Card key={i} accent={s.color}>
            <div style={{ fontSize: 9, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: FM, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{s.sub}</div>
          </Card>
        ))}
      </div>

      {/* Sort controls */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>SORT BY:</span>
        {[{k:"id",l:"Priority Order"},{k:"sev",l:"Severity"},{k:"effort",l:"Effort"},{k:"done",l:"Status"}].map(s => (
          <button key={s.k} onClick={() => setSortBy(s.k)} style={{
            padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 600,
            background: sortBy === s.k ? "#6366f1" : "#0f172a", color: sortBy === s.k ? "white" : "#94a3b8", transition: "all 0.2s"
          }}>{s.l}</button>
        ))}
      </div>

      {/* Friction table */}
      <div style={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1e293b", overflow: "hidden", marginBottom: 18 }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "32px 38px 1fr 1fr 50px 50px 54px", gap: 8, padding: "10px 14px", background: "#0c1322", borderBottom: "1px solid #1e293b", alignItems: "center" }}>
          {["#","","Friction Point","What We Built","Effort","Act.","Ret."].map((h, i) => (
            <div key={i} style={{ fontSize: 9, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</div>
          ))}
        </div>
        {/* Rows */}
        {filteredItems.map((item) => (
          <PLGRow key={item.id} item={item} />
        ))}
      </div>

      {/* Before / After */}
      <SL>Before vs After: Key Improvements</SL>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
        <Card accent="#f43f5e">
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f43f5e", marginBottom: 12 }}>❌ Before Audit</div>
          {[
            "12 decisions on first load (4 events × 3 buttons)",
            "Edit navigated to different tab — lost context",
            "No Up Next — failed 2-second glance test",
            "No empty state — new users see fake data",
            "Approve → event disappears into void",
            "'Event' mixed with temporal views in switcher",
            "Confidence badges with no explanation",
            "Pending vs confirmed nearly indistinguishable",
            "Sidebar shows redundant info in Day view",
            "No search, no sharing indicator, no return badge"
          ].map((t, i) => (
            <div key={i} style={{ fontSize: 11, color: "#94a3b8", padding: "6px 0", borderBottom: i < 9 ? "1px solid #1e293b" : "none", display: "flex", gap: 6, alignItems: "flex-start" }}>
              <span style={{ color: "#f43f5e", fontSize: 10, marginTop: 1 }}>✗</span>{t}
            </div>
          ))}
        </Card>
        <Card accent="#10b981">
          <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981", marginBottom: 12 }}>✅ After Audit (Implemented)</div>
          {[
            "~4 decisions — auto-approve ≥90% + Approve All",
            "Inline edit — expand card in-place, never leave Home",
            "Up Next strip always visible — passes glance test",
            "Dedicated first-run: 'Snap your first event' CTA",
            "Approve → cell flashes green + toast confirmation",
            "Event opens as overlay — switcher is Day|Week|Month|Year",
            "ⓘ tooltips explain score + what drove it down",
            "Dashed border + ⏳ icon + 65% opacity = clear draft state",
            "Context-aware: Day→Tomorrow, Week→This Week, Month→Today",
            "Search, shared badges, invite CTA, return notification"
          ].map((t, i) => (
            <div key={i} style={{ fontSize: 11, color: "#94a3b8", padding: "6px 0", borderBottom: i < 9 ? "1px solid #1e293b" : "none", display: "flex", gap: 6, alignItems: "flex-start" }}>
              <span style={{ color: "#10b981", fontSize: 10, marginTop: 1 }}>✓</span>{t}
            </div>
          ))}
        </Card>
      </div>

      {/* Sprint summary */}
      <Card accent="#8b5cf6" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 10 }}>📋 Sprint Plan: 1 Week, Maximum Activation + Retention Impact</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { t: "Up Next Strip", hrs: "4 hrs", day: "Day 1", color: "#6366f1" },
            { t: "Auto-Approve ≥90%", hrs: "6 hrs", day: "Day 1–2", color: "#8b5cf6" },
            { t: "Approve → Animation", hrs: "4 hrs", day: "Day 2", color: "#f59e0b" },
            { t: "Inline Edit", hrs: "8 hrs", day: "Day 3–4", color: "#ec4899" },
            { t: "Remove Event from Switcher", hrs: "1 hr", day: "Day 4", color: "#14b8a6" }
          ].map((s, i) => (
            <div key={i} style={{ flex: "1 1 160px", background: `${s.color}08`, border: `1px solid ${s.color}25`, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{i + 1}. {s.t}</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>{s.day} · {s.hrs}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: 10, background: "#0c1322", borderRadius: 8, textAlign: "center" }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#8b5cf6", fontFamily: FM }}>~23 hrs</span>
          <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>→ measurably better activation funnel. Remaining 10 items completed in Sprint 2.</span>
        </div>
      </Card>

      {/* Key takeaway */}
      <Card accent="#f59e0b">
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>💡 Key Insight</div>
        <div style={{ fontSize: 12, color: "#fbbf24", lineHeight: 1.6, fontWeight: 500 }}>
          The biggest retention killer was cognitive overload — 12 decisions on first load. Auto-approve + Approve All reduced this to ~4, directly targeting the W1 retention gap from 52% → projected 60%+. Combined with inline edit (zero context switches) and approve → animation (unmissable aha moment), the core activation loop now closes in under 10 seconds.
        </div>
      </Card>
    </div>
  );
}

function PLGRow({ item }) {
  const [expanded, setExpanded] = useState(false);
  const impactColor = { "Activation": "#6366f1", "Aha Moment": "#f59e0b", "Low": "#334155" };
  const retColor = { "Retention": "#10b981", "Low": "#334155" };
  return (
    <div style={{ borderBottom: "1px solid #1e293b10" }}>
      <div onClick={() => setExpanded(!expanded)} style={{
        display: "grid", gridTemplateColumns: "32px 38px 1fr 1fr 50px 50px 54px", gap: 8, padding: "10px 14px",
        cursor: "pointer", transition: "background 0.15s", alignItems: "center",
        background: expanded ? "#1e293b20" : "transparent"
      }}>
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, fontFamily: FM }}>{item.id}</div>
        <div style={{ fontSize: 14 }}>{item.sev}</div>
        <div style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 600 }}>
          {item.title}
          {item.done && <span style={{ marginLeft: 6, fontSize: 9, background: "#10b98120", color: "#34d399", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>DONE</span>}
          {!item.done && <span style={{ marginLeft: 6, fontSize: 9, background: "#f59e0b15", color: "#fbbf24", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>DEFERRED</span>}
        </div>
        <div style={{ fontSize: 10, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.fix}</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: item.effort === "S" ? "#10b981" : item.effort === "M" ? "#f59e0b" : "#f43f5e", fontFamily: FM }}>{item.effort} <span style={{ fontWeight: 400, fontSize: 8 }}>{item.effortHrs}</span></div>
        <div style={{ fontSize: 9 }}><span style={{ background: (impactColor[item.impact] || "#334155") + "20", color: impactColor[item.impact] || "#64748b", padding: "2px 5px", borderRadius: 3, fontWeight: 600 }}>{item.impact === "Activation" ? "🔴" : item.impact === "Aha Moment" ? "🟡" : "🟢"}</span></div>
        <div style={{ fontSize: 9 }}><span style={{ background: (retColor[item.impactRet] || "#334155") + "20", color: retColor[item.impactRet] || "#64748b", padding: "2px 5px", borderRadius: 3, fontWeight: 600 }}>{item.impactRet === "Retention" ? "🔴" : "🟢"}</span></div>
      </div>
      {expanded && (
        <div style={{ padding: "0 14px 14px 80px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, animation: "fadeUp 0.2s ease" }}>
          <div>
            <div style={{ fontSize: 9, color: "#f43f5e", fontWeight: 700, marginBottom: 4, textTransform: "uppercase" }}>Why It Matters</div>
            <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>{item.why}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "#10b981", fontWeight: 700, marginBottom: 4, textTransform: "uppercase" }}>What We Built</div>
            <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>{item.fix}</div>
            <div style={{ marginTop: 6, fontSize: 10, color: "#8b5cf6", fontWeight: 600, background: "#8b5cf610", padding: "4px 8px", borderRadius: 4, display: "inline-block" }}>📊 {item.metric}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════════════

export default function CatchUpPrototype() {
  const [tab, setTab] = useState("home");
  const [approvedIds, setApprovedIds] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState(CALENDAR_EVENTS);
  const [addedCalIds, setAddedCalIds] = useState([]);

  const handleApprove = (id) => {
    if(approvedIds.includes(id)) return;
    setApprovedIds(p=>[...p,id]);
    const ext = SAMPLE_EXTRACTIONS.find(e=>e.id===id);
    if(ext){ const nid=`a-${id}`; setCalendarEvents(p=>[...p,{id:nid,title:ext.extracted.title,date:ext.extracted.date,time:ext.extracted.time,type:ext.extracted.type,color:{"School Event":"#f59e0b","Kids Activity":"#ec4899","Playdate":"#8b5cf6","Appointment":"#06b6d4"}[ext.extracted.type]||"#6366f1"}]); setAddedCalIds(p=>[...p,nid]); }
  };

  const tabs = [
    { id:"home", label:"Home", icon:"🏠" },
    { id:"wireframes", label:"Wireframes", icon:"📱" },
    { id:"pipeline", label:"AI Pipeline", icon:"⚡" },
    { id:"hitl", label:"HITL Iterations", icon:"🔄" },
    { id:"agentic", label:"Agentic MVP", icon:"🤖" },
    { id:"expansion", label:"Product Expansion", icon:"🚀" },
    { id:"plg", label:"PLG Audit", icon:"📊" },
    { id:"hiring", label:"Product Thinking", icon:"💡" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#020617", color:"#e2e8f0", fontFamily:F }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}*{box-sizing:border-box}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0f172a}::-webkit-scrollbar-thumb{background:#334155;border-radius:4px}`}</style>

      <div style={{ background:"linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)", borderBottom:"1px solid #1e293b", padding:"18px 28px" }}>
        <div style={{ maxWidth:1180, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:"linear-gradient(135deg,#6366f1,#ec4899)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:"white" }}>C</div>
              <span style={{ fontSize:20, fontWeight:800, color:"#f1f5f9", letterSpacing:-0.5 }}>CatchUp</span>
              <span style={{ fontSize:9, padding:"2px 8px", borderRadius:16, background:"#6366f120", color:"#818cf8", fontWeight:700, border:"1px solid #6366f140" }}>PORTFOLIO PROTOTYPE</span>
            </div>
            <div style={{ fontSize:10, color:"#64748b" }}>React Native · Node.js · Firebase · GPT-4 Vision · Whisper</div>
          </div>
          <div style={{ display:"flex", gap:3, marginTop:14, overflowX:"auto" }}>
            {tabs.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"8px 14px", borderRadius:8, border:"none", cursor:"pointer", background:tab===t.id?"#6366f1":"transparent", color:tab===t.id?"white":"#94a3b8", fontSize:11, fontWeight:600, display:"flex", alignItems:"center", gap:4, transition:"all 0.2s", whiteSpace:"nowrap" }}>
                <span style={{ fontSize:13 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab !== "home" && <div style={{ maxWidth:1180, margin:"0 auto", padding:"16px 28px 0" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:16 }}>
          {[{l:"AI Accuracy",v:"92%",s:"+4.2%",c:"#10b981"},{l:"Avg Latency",v:"2.3s",s:"-0.8s",c:"#06b6d4"},{l:"Auto-Approve",v:"68%",s:"+12%",c:"#8b5cf6"},{l:"User Edits",v:"8%",s:"-3%",c:"#f59e0b"}].map(m=>(
            <div key={m.l} style={{ background:"#0f172a", borderRadius:10, padding:"12px 14px", border:"1px solid #1e293b" }}>
              <div style={{ fontSize:9, color:"#64748b", textTransform:"uppercase", letterSpacing:1, fontWeight:600 }}>{m.l}</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:5, marginTop:3 }}><span style={{ fontSize:20, fontWeight:800, color:"#f1f5f9", fontFamily:FM }}>{m.v}</span><span style={{ fontSize:10, color:m.c, fontWeight:700 }}>{m.s}</span></div>
            </div>
          ))}
        </div>
      </div>}

      <div style={{ maxWidth:1180, margin:"0 auto", padding:"0 28px 28px", animation:"fadeUp 0.4s ease" }} key={tab}>
        {tab==="home" && <TabHome calendarEvents={calendarEvents} addedCalIds={addedCalIds} onNavigate={setTab} />}
        {tab==="wireframes" && <TabWireframes />}
        {tab==="pipeline" && <TabPipeline approvedIds={approvedIds} handleApprove={handleApprove} />}
        {tab==="hitl" && <TabHITL />}
        {tab==="agentic" && <TabAgentic />}
        {tab==="expansion" && <TabExpansion />}
        {tab==="plg" && <TabPLG />}
        {tab==="hiring" && <TabHiring />}
      </div>

      <div style={{ maxWidth:1180, margin:"0 auto", padding:"0 28px 20px", borderTop:"1px solid #1e293b", paddingTop:16, textAlign:"center", fontSize:11, color:"#475569" }}>
        CatchUp AI Prototype — Built by Lana Baturytski · Multi-modal AI · Human-in-the-Loop · PLG-Optimized · Agentic Architecture
      </div>
    </div>
  );
}
