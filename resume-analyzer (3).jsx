import { useState, useRef, useEffect } from "react";

/* ── API ─────────────────────────────────────────────────────────────────── */
const callClaude = async (system, userMsg) => {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system, messages: [{ role: "user", content: userMsg }] })
  });
  const d = await r.json();
  return d.content?.map(b => b.text || "").join("") || "";
};
const parseJSON = raw => JSON.parse(raw.replace(/```json|```/g, "").trim());

/* ── PROMPTS ─────────────────────────────────────────────────────────────── */
const MAIN_PROMPT = (region, level) => `You are an expert resume analyst. Analyze this resume for a ${level} candidate targeting the ${region} job market. Return ONLY valid JSON, no markdown, no preamble:
{"overallScore":<0-100>,"name":"<name or Unknown>","title":"<detected role>","experienceLevel":"<Fresher|Mid-level|Senior>","region":"<detected region>","categoryScores":{"formatting":<0-100>,"content":<0-100>,"impact":<0-100>,"keywords":<0-100>,"completeness":<0-100>},"atsScore":<0-100>,"atsIssues":["<issue>"],"atsKeywordsMissing":["<kw>"],"benchmarkPercentile":<0-100>,"benchmarkField":"<field>","strengths":["<s>"],"improvements":[{"priority":"high|medium|low","area":"<area>","suggestion":"<detail>"}],"corrections":[{"type":"grammar|formatting|content|structure","issue":"<issue>","fix":"<fix>"}],"bulletRewrites":[{"original":"<orig>","rewritten":"<STAR rewrite>","verb":"<verb>"}],"skillsGap":[{"skill":"<skill>","importance":"high|medium","course":"<resource>"}],"jobSuggestions":[{"title":"<title>","match":<0-100>,"reason":"<reason>","companies":["<c1>","<c2>","<c3>"]}],"linkedinTips":["<tip>"],"summary":"<2-3 sentence assessment>"}`;
const SUMMARY_PROMPT = `Write a compelling professional summary (3-4 sentences) for a resume. Return ONLY the summary text, no labels, no JSON.`;
const COVER_PROMPT = job => `Write a professional tailored cover letter for: "${job}". Specific, enthusiastic, results-focused, under 300 words. Return ONLY the letter text.`;
const JD_MATCH_PROMPT = `Compare resume vs job description. Return ONLY valid JSON: {"matchScore":<0-100>,"missingKeywords":["<kw>"],"matchedKeywords":["<kw>"],"gaps":["<gap>"],"tailoringTips":["<tip>"]}`;

/* ── DESIGN TOKENS ───────────────────────────────────────────────────────── */
const C = {
  bg: "#050810",
  navy: "#080d1a",
  panel: "rgba(255,255,255,0.035)",
  panelHov: "rgba(255,255,255,0.065)",
  glass: "rgba(255,255,255,0.055)",
  border: "rgba(255,255,255,0.07)",
  borderHov: "rgba(99,211,178,0.35)",
  teal: "#4eecc8",
  tealDim: "rgba(78,236,200,0.12)",
  blue: "#60a5fa",
  violet: "#a78bfa",
  amber: "#fbbf24",
  rose: "#fb7185",
  orange: "#fb923c",
  text: "#f0f4ff",
  textSec: "#8898aa",
  textMut: "#3d4f63",
};

const sc = s => s >= 80 ? C.teal : s >= 60 ? C.amber : s >= 40 ? C.orange : C.rose;
const sl = s => s >= 80 ? "Excellent" : s >= 60 ? "Good" : s >= 40 ? "Fair" : "Needs Work";
const priC = { high: C.rose, medium: C.amber, low: C.teal };
const cIcon = { grammar: "✏️", formatting: "📐", content: "📝", structure: "🏗️" };

/* ── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{--teal:#4eecc8;--blue:#60a5fa;--violet:#a78bfa;}
html{scroll-behavior:smooth;}
body{background:#050810;}
::-webkit-scrollbar{width:4px;}
::-webkit-scrollbar-track{background:#050810;}
::-webkit-scrollbar-thumb{background:rgba(78,236,200,0.25);border-radius:99px;}

@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{opacity:.45}50%{opacity:1}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes shimmerBg{0%{background-position:200% center}100%{background-position:-200% center}}
@keyframes ringPop{0%{transform:scale(0.85);opacity:0}70%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
@keyframes orb1{0%,100%{transform:translate(0,0)}50%{transform:translate(60px,-40px)}}
@keyframes orb2{0%,100%{transform:translate(0,0)}50%{transform:translate(-50px,30px)}}
@keyframes orb3{0%,100%{transform:translate(0,0)}50%{transform:translate(30px,50px)}}
@keyframes gradShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes scanLine{0%{top:-100%}100%{top:200%}}
@keyframes tabPop{0%{transform:scale(0.94)}100%{transform:scale(1)}}

.glass-card{
  background:rgba(255,255,255,0.04);
  backdrop-filter:blur(24px) saturate(180%);
  -webkit-backdrop-filter:blur(24px) saturate(180%);
  border:1px solid rgba(255,255,255,0.08);
  border-radius:20px;
}
.glass-card:hover{border-color:rgba(255,255,255,0.13);background:rgba(255,255,255,0.06);}

.glow-teal{box-shadow:0 0 30px rgba(78,236,200,0.12),0 0 80px rgba(78,236,200,0.05);}
.glow-blue{box-shadow:0 0 30px rgba(96,165,250,0.12),0 0 80px rgba(96,165,250,0.05);}
.glow-violet{box-shadow:0 0 30px rgba(167,139,250,0.15);}

.score-ring{animation:ringPop 0.7s cubic-bezier(.34,1.56,.64,1) forwards;}
.tab-btn{transition:all 0.22s cubic-bezier(.34,1.2,.64,1);}
.tab-btn:hover{transform:translateY(-1px);}
.tab-btn.active{animation:tabPop 0.22s ease;}
.hover-lift{transition:all 0.25s ease;}
.hover-lift:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,0,0,0.35);}

.shimmer-text{
  background:linear-gradient(90deg,#f0f4ff 0%,#4eecc8 40%,#60a5fa 60%,#f0f4ff 100%);
  background-size:200% auto;
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  animation:shimmerBg 4s linear infinite;
}
.grad-border{
  position:relative;border-radius:20px;
}
.grad-border::before{
  content:'';position:absolute;inset:-1px;border-radius:21px;
  background:linear-gradient(135deg,rgba(78,236,200,0.4),rgba(96,165,250,0.2),rgba(167,139,250,0.4),rgba(78,236,200,0.1));
  z-index:-1;opacity:0;transition:opacity 0.3s;
}
.grad-border:hover::before{opacity:1;}

input:focus,textarea:focus{
  outline:none;
  border-color:rgba(78,236,200,0.5)!important;
  box-shadow:0 0 0 3px rgba(78,236,200,0.08),inset 0 0 0 1px rgba(78,236,200,0.3);
}
.pill-btn{transition:all 0.2s cubic-bezier(.34,1.3,.64,1);}
.pill-btn:hover{transform:scale(1.04);}
.pill-btn:active{transform:scale(0.97);}
.copy-btn{transition:all 0.2s ease;}
.copy-btn:hover{background:rgba(78,236,200,0.15)!important;color:#4eecc8!important;border-color:rgba(78,236,200,0.3)!important;}
`;

/* ── AMBIENT BG ──────────────────────────────────────────────────────────── */
function AmbientBg() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      {/* deep base */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(14,26,56,0.9) 0%, #050810 70%)" }} />
      {/* animated orbs */}
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(78,236,200,0.07) 0%, transparent 70%)", top: "5%", left: "15%", animation: "orb1 18s ease-in-out infinite" }} />
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(96,165,250,0.07) 0%, transparent 70%)", top: "20%", right: "10%", animation: "orb2 22s ease-in-out infinite" }} />
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)", bottom: "20%", left: "30%", animation: "orb3 16s ease-in-out infinite" }} />
      {/* noise grain overlay */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.025, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "200px" }} />
      {/* subtle grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
    </div>
  );
}

/* ── CIRCLE SCORE ────────────────────────────────────────────────────────── */
function CircleScore({ score, size = 140, stroke = 12 }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r, offset = circ - (score / 100) * circ;
  const color = sc(score);
  return (
    <div className="score-ring" style={{ position: "relative", width: size, height: size, filter: `drop-shadow(0 0 18px ${color}55)` }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        {/* track glow */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}22`} strokeWidth={stroke + 6} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 800, color, fontFamily: "'Outfit',sans-serif", lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.09, color: C.textMut, fontFamily: "'Outfit',sans-serif", marginTop: 2 }}>/ 100</span>
      </div>
    </div>
  );
}

/* ── PROGRESS BAR ────────────────────────────────────────────────────────── */
function Bar({ label, score }) {
  const color = sc(score);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: C.textSec, fontFamily: "'Outfit',sans-serif", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "'Outfit',sans-serif" }}>{score}%</span>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", position: "relative" }}>
        <div style={{ height: "100%", width: `${score}%`, borderRadius: 99, transition: "width 1.4s cubic-bezier(.4,0,.2,1)",
          background: `linear-gradient(90deg, ${color}55, ${color})`,
          boxShadow: `0 0 10px ${color}66` }} />
      </div>
    </div>
  );
}

/* ── TAG ─────────────────────────────────────────────────────────────────── */
function Tag({ children, bg = "rgba(255,255,255,0.07)", color = C.textSec, glow }) {
  return (
    <span style={{
      padding: "4px 12px", background: bg, borderRadius: 99, fontSize: 11.5, color,
      fontFamily: "'Outfit',sans-serif", fontWeight: 600, whiteSpace: "nowrap", letterSpacing: "0.02em",
      border: `1px solid ${glow ? `${glow}30` : "rgba(255,255,255,0.08)"}`,
      boxShadow: glow ? `0 0 10px ${glow}20` : "none"
    }}>{children}</span>
  );
}

/* ── GLASS CARD ──────────────────────────────────────────────────────────── */
function GCard({ children, style = {}, className = "" }) {
  return (
    <div className={`glass-card hover-lift grad-border ${className}`}
      style={{ padding: "26px 28px", marginBottom: 16, position: "relative", overflow: "hidden", ...style }}>
      {/* inner highlight */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)", pointerEvents: "none" }} />
      {children}
    </div>
  );
}

/* ── SECTION TITLE ───────────────────────────────────────────────────────── */
function STitle({ icon, title, color = C.teal }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{icon}</div>
      <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 19, color, letterSpacing: "0.01em" }}>{title}</span>
    </div>
  );
}

/* ── BUTTON ──────────────────────────────────────────────────────────────── */
function Btn({ onClick, children, variant = "primary", disabled = false, full = false, size = "md" }) {
  const pad = size === "sm" ? "8px 16px" : "12px 24px";
  const fs = size === "sm" ? 13 : 14;
  const base = { padding: pad, borderRadius: 12, border: "none", fontFamily: "'Outfit',sans-serif", fontSize: fs, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1, width: full ? "100%" : "auto", transition: "all 0.22s cubic-bezier(.34,1.3,.64,1)", position: "relative", overflow: "hidden" };
  if (variant === "primary") return (
    <button onClick={onClick} disabled={disabled} className="pill-btn"
      style={{ ...base, background: "linear-gradient(135deg,#4eecc8,#60a5fa)", color: "#050810", fontWeight: 700, boxShadow: "0 4px 24px rgba(78,236,200,0.25),0 1px 0 rgba(255,255,255,0.3) inset" }}>
      {children}
    </button>
  );
  if (variant === "ghost") return (
    <button onClick={onClick} disabled={disabled} className="pill-btn"
      style={{ ...base, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: C.textSec, backdropFilter: "blur(10px)" }}>
      {children}
    </button>
  );
  return <button onClick={onClick} disabled={disabled} className="pill-btn" style={{ ...base, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: C.text }}>{children}</button>;
}

/* ── UPLOAD ZONE ─────────────────────────────────────────────────────────── */
function UploadZone({ onText }) {
  const fRef = useRef();
  const [drag, setDrag] = useState(false);
  const [paste, setPaste] = useState(false);
  const [txt, setTxt] = useState("");

  const handle = async f => { if (f) onText(await f.text()); };

  if (paste) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <textarea value={txt} onChange={e => setTxt(e.target.value)} placeholder="Paste your full resume text here…"
        style={{ width: "100%", minHeight: 200, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 14, padding: "16px 18px", resize: "vertical", lineHeight: 1.75, backdropFilter: "blur(10px)" }} />
      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={() => { if (txt.trim()) onText(txt); }} full>Analyze Resume →</Btn>
        <Btn variant="ghost" onClick={() => setPaste(false)}>Back</Btn>
      </div>
    </div>
  );

  return (
    <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      onClick={() => fRef.current.click()}
      style={{
        border: `2px dashed ${drag ? C.teal : "rgba(255,255,255,0.1)"}`, borderRadius: 18, padding: "48px 28px",
        textAlign: "center", cursor: "pointer", transition: "all 0.3s",
        background: drag ? "rgba(78,236,200,0.05)" : "rgba(255,255,255,0.02)",
        boxShadow: drag ? "0 0 40px rgba(78,236,200,0.1) inset" : "none"
      }}>
      <input ref={fRef} type="file" accept=".txt,.pdf,.doc,.docx" style={{ display: "none" }} onChange={e => handle(e.target.files[0])} />
      {/* upload icon */}
      <div style={{ width: 64, height: 64, borderRadius: 18, background: drag ? "rgba(78,236,200,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${drag ? "rgba(78,236,200,0.4)" : "rgba(255,255,255,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", fontSize: 28, transition: "all 0.3s", animation: drag ? "none" : "float 3s ease-in-out infinite" }}>📄</div>
      <p style={{ color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 500, margin: "0 0 6px" }}>
        Drop your resume or <span style={{ color: C.teal, borderBottom: `1px solid ${C.teal}44` }}>browse files</span>
      </p>
      <p style={{ color: C.textMut, fontSize: 13, fontFamily: "'Outfit',sans-serif", margin: "0 0 22px" }}>TXT · PDF · DOC · DOCX</p>
      <Btn variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setPaste(true); }}>✍️ Paste text instead</Btn>
    </div>
  );
}

/* ── SETUP SCREEN ────────────────────────────────────────────────────────── */
function SetupScreen({ onDone }) {
  const [region, setRegion] = useState("Auto-detect");
  const [level, setLevel] = useState("Auto-detect");
  const rows = [
    ["🌍 Target Region", ["Auto-detect", "India", "USA / Canada", "UK / Europe"], region, setRegion],
    ["🎯 Experience Level", ["Auto-detect", "Fresher (0-2 yrs)", "Mid-level (3-6 yrs)", "Senior (7+ yrs)"], level, setLevel],
  ];
  return (
    <div>
      {rows.map(([lbl, opts, val, set]) => (
        <div key={lbl} style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, color: C.textSec, marginBottom: 10, fontWeight: 600, letterSpacing: "0.08em" }}>{lbl}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {opts.map(opt => (
              <button key={opt} onClick={() => set(opt)} className="pill-btn"
                style={{
                  padding: "9px 18px", borderRadius: 10, border: "1px solid", fontFamily: "'Outfit',sans-serif", fontSize: 13, cursor: "pointer", fontWeight: 500, transition: "all 0.22s cubic-bezier(.34,1.3,.64,1)",
                  borderColor: val === opt ? C.teal : "rgba(255,255,255,0.1)",
                  background: val === opt ? `${C.teal}15` : "rgba(255,255,255,0.04)",
                  color: val === opt ? C.teal : C.textSec,
                  boxShadow: val === opt ? `0 0 16px ${C.teal}22` : "none"
                }}>{opt}</button>
            ))}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 8 }}>
        <Btn onClick={() => onDone(region, level)} full>Start Deep Analysis ⚡</Btn>
      </div>
    </div>
  );
}

/* ── JD MATCHER ──────────────────────────────────────────────────────────── */
function JDMatcher({ resumeText }) {
  const [jd, setJD] = useState(""); const [res, setRes] = useState(null); const [loading, setLoading] = useState(false);
  const run = async () => { setLoading(true); try { setRes(parseJSON(await callClaude(JD_MATCH_PROMPT, `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jd}`))); } catch (e) { console.error(e); } setLoading(false); };
  return (
    <div>
      <p style={{ color: C.textSec, fontSize: 14, fontFamily: "'Outfit',sans-serif", lineHeight: 1.7, marginBottom: 16 }}>Paste any job description to instantly see your match score and what to improve.</p>
      <textarea value={jd} onChange={e => setJD(e.target.value)} placeholder="Paste job description here…"
        style={{ width: "100%", minHeight: 120, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 14, padding: "14px 16px", resize: "vertical", lineHeight: 1.7, marginBottom: 12 }} />
      <Btn onClick={run} disabled={loading || !jd.trim()}>{loading ? "Matching…" : "🎯 Match Against JD"}</Btn>
      {res && (
        <div style={{ marginTop: 22, animation: "fadeUp 0.4s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 22, flexWrap: "wrap" }}>
            <CircleScore score={res.matchScore} size={100} stroke={10} />
            <div>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 24, color: C.text, marginBottom: 4 }}>JD Match Score</div>
              <Tag bg={`${sc(res.matchScore)}18`} color={sc(res.matchScore)} glow={sc(res.matchScore)}>{sl(res.matchScore)}</Tag>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ background: "rgba(78,236,200,0.05)", border: "1px solid rgba(78,236,200,0.15)", borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 10, color: C.textMut, letterSpacing: "0.1em", fontFamily: "'Outfit',sans-serif", marginBottom: 8 }}>✅ MATCHED</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{res.matchedKeywords.map(k => <Tag key={k} bg="rgba(78,236,200,0.1)" color={C.teal} glow={C.teal}>{k}</Tag>)}</div>
            </div>
            <div style={{ background: "rgba(251,113,133,0.05)", border: "1px solid rgba(251,113,133,0.15)", borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 10, color: C.textMut, letterSpacing: "0.1em", fontFamily: "'Outfit',sans-serif", marginBottom: 8 }}>❌ MISSING</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{res.missingKeywords.map(k => <Tag key={k} bg="rgba(251,113,133,0.1)" color={C.rose} glow={C.rose}>{k}</Tag>)}</div>
            </div>
          </div>
          {res.tailoringTips?.length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: 10, color: C.textMut, letterSpacing: "0.1em", marginBottom: 12, fontFamily: "'Outfit',sans-serif" }}>💡 TAILORING TIPS</div>
              {res.tailoringTips.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                  <span style={{ color: C.blue, marginTop: 3, fontSize: 12 }}>▹</span>
                  <span style={{ color: C.textSec, fontSize: 14, lineHeight: 1.65, fontFamily: "'Outfit',sans-serif" }}>{t}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── COVER LETTER ────────────────────────────────────────────────────────── */
function CoverLetterGen({ resumeText }) {
  const [job, setJob] = useState(""); const [letter, setLetter] = useState(""); const [loading, setLoading] = useState(false); const [copied, setCopied] = useState(false);
  const run = async () => { setLoading(true); try { setLetter((await callClaude(COVER_PROMPT(job), `Resume:\n${resumeText}`)).trim()); } catch (e) { } setLoading(false); };
  const copy = () => { navigator.clipboard.writeText(letter); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div>
      <p style={{ color: C.textSec, fontSize: 14, fontFamily: "'Outfit',sans-serif", lineHeight: 1.7, marginBottom: 16 }}>Generate a tailored cover letter for any specific job you're applying to.</p>
      <input value={job} onChange={e => setJob(e.target.value)} placeholder="Target role (e.g. Senior Product Manager at Google)"
        style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: C.text, fontFamily: "'Outfit',sans-serif", fontSize: 14, padding: "13px 16px", marginBottom: 12 }} />
      <Btn onClick={run} disabled={loading || !job.trim()}>{loading ? "Writing…" : "📝 Generate Cover Letter"}</Btn>
      {letter && (
        <div style={{ marginTop: 18, animation: "fadeUp 0.4s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: C.textSec, fontFamily: "'Outfit',sans-serif", fontWeight: 600 }}>YOUR COVER LETTER</span>
            <button onClick={copy} className="copy-btn" style={{ padding: "6px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: copied ? C.teal : C.textSec, fontSize: 12, cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontWeight: 600 }}>{copied ? "✓ Copied!" : "📋 Copy"}</button>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "22px 24px", color: C.textSec, fontSize: 14, lineHeight: 1.85, fontFamily: "'Outfit',sans-serif", whiteSpace: "pre-wrap" }}>{letter}</div>
        </div>
      )}
    </div>
  );
}

/* ── SUMMARY GEN ─────────────────────────────────────────────────────────── */
function SummaryGen({ resumeText }) {
  const [summ, setSumm] = useState(""); const [loading, setLoading] = useState(false); const [copied, setCopied] = useState(false);
  const run = async () => { setLoading(true); try { setSumm(await callClaude(SUMMARY_PROMPT, `Resume:\n${resumeText}`)); } catch (e) { } setLoading(false); };
  const copy = () => { navigator.clipboard.writeText(summ); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div>
      <p style={{ color: C.textSec, fontSize: 14, fontFamily: "'Outfit',sans-serif", lineHeight: 1.7, marginBottom: 16 }}>Auto-generate a compelling 3–4 sentence professional summary tailored to your resume content.</p>
      <Btn onClick={run} disabled={loading}>{loading ? "Generating…" : "✨ Generate Summary"}</Btn>
      {summ && (
        <div style={{ marginTop: 18, animation: "fadeUp 0.4s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: C.textSec, fontFamily: "'Outfit',sans-serif", fontWeight: 600 }}>PROFESSIONAL SUMMARY</span>
            <button onClick={copy} className="copy-btn" style={{ padding: "6px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: copied ? C.teal : C.textSec, fontSize: 12, cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontWeight: 600 }}>{copied ? "✓ Copied!" : "📋 Copy"}</button>
          </div>
          <div style={{ background: "linear-gradient(135deg,rgba(78,236,200,0.05),rgba(96,165,250,0.05))", border: "1px solid rgba(78,236,200,0.15)", borderRadius: 14, padding: "22px 24px", color: C.text, fontSize: 15, lineHeight: 1.85, fontFamily: "'Instrument Serif',serif", fontStyle: "italic" }}>{summ}</div>
        </div>
      )}
    </div>
  );
}

/* ── TABS CONFIG ─────────────────────────────────────────────────────────── */
const TABS = [
  { id: "overview", label: "Overview", icon: "◈" },
  { id: "ats", label: "ATS Check", icon: "⬡" },
  { id: "bullets", label: "Rewrites", icon: "✦" },
  { id: "skills", label: "Skills Gap", icon: "◎" },
  { id: "improvements", label: "Improve", icon: "↑" },
  { id: "corrections", label: "Corrections", icon: "⌥" },
  { id: "jobs", label: "Job Matches", icon: "◉" },
  { id: "linkedin", label: "LinkedIn", icon: "ℓ" },
  { id: "jd", label: "JD Matcher", icon: "⊕" },
  { id: "cover", label: "Cover Letter", icon: "✉" },
  { id: "summary", label: "Summary", icon: "§" },
];

/* ── MAIN APP ────────────────────────────────────────────────────────────── */
export default function App() {
  const [stage, setStage] = useState("upload");
  const [result, setResult] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [region, setRegion] = useState("Auto-detect");
  const [level, setLevel] = useState("Auto-detect");
  const [activeTab, setActiveTab] = useState("overview");
  const [err, setErr] = useState(null);
  const [analyzeStep, setAnalyzeStep] = useState(0);

  const steps = ["Parsing structure", "ATS scanning", "Scoring impact", "Finding keywords", "Matching jobs"];

  useEffect(() => {
    if (stage !== "analyzing") return;
    const iv = setInterval(() => setAnalyzeStep(s => (s + 1) % steps.length), 1200);
    return () => clearInterval(iv);
  }, [stage]);

  const onUpload = text => { setResumeText(text); setStage("setup"); };
  const onSetup = (r, l) => { setRegion(r); setLevel(l); doAnalyze(resumeText, r, l); };
  const doAnalyze = async (text, r, l) => {
    setStage("analyzing"); setErr(null);
    try { const raw = await callClaude(MAIN_PROMPT(r, l), `Analyze this resume:\n\n${text.slice(0, 8000)}`); setResult(parseJSON(raw)); setStage("result"); }
    catch (e) { setErr("Analysis failed — please try again."); setStage("upload"); }
  };
  const reset = () => { setStage("upload"); setResult(null); setErr(null); setActiveTab("overview"); setResumeText(""); };

  return (
    <div style={{ minHeight: "100vh", color: C.text, position: "relative" }}>
      <style>{CSS}</style>
      <AmbientBg />

      {/* ── NAV ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 500, padding: "0 28px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(5,8,16,0.75)", backdropFilter: "blur(28px) saturate(200%)",
        display: "flex", alignItems: "center", justifyContent: "space-between", height: 60
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Logo mark */}
          <div style={{ position: "relative", width: 36, height: 36 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 10, background: "linear-gradient(135deg,#4eecc8,#60a5fa)", opacity: 0.9 }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "#050810", fontFamily: "'Outfit',sans-serif" }}>R</div>
          </div>
          <div>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 21, color: C.text, lineHeight: 1, letterSpacing: "0.01em" }}>ResumeIQ</div>
            <div style={{ fontSize: 9.5, color: C.textMut, letterSpacing: "0.18em", fontFamily: "'Outfit',sans-serif", fontWeight: 600 }}>AI POWERED</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {stage === "result" && result && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 99, backdropFilter: "blur(10px)" }}>
              <span style={{ fontSize: 12, color: C.textSec, fontFamily: "'Outfit',sans-serif" }}>{result.name}</span>
              <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.12)" }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: sc(result.overallScore), fontFamily: "'Outfit',sans-serif" }}>{result.overallScore}/100</span>
            </div>
          )}
          {stage === "result" && <Btn variant="ghost" size="sm" onClick={reset}>+ New</Btn>}
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 22px", position: "relative", zIndex: 1 }}>

        {/* ── UPLOAD ── */}
        {stage === "upload" && (
          <div style={{ animation: "fadeUp 0.6s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px", background: "rgba(78,236,200,0.08)", border: "1px solid rgba(78,236,200,0.2)", borderRadius: 99, marginBottom: 24 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.teal, boxShadow: `0 0 8px ${C.teal}` }} />
                <span style={{ fontSize: 11.5, color: C.teal, fontFamily: "'Outfit',sans-serif", fontWeight: 600, letterSpacing: "0.1em" }}>BY SAYAN DAS</span>
              </div>
              <h1 style={{ fontFamily: "'Instrument Serif',serif", fontSize: "clamp(40px,6vw,72px)", lineHeight: 1.05, marginBottom: 18 }}>
                <span className="shimmer-text">Land Your</span><br />
                <span style={{ color: C.text }}>Dream Job</span>
              </h1>
              <p style={{ color: C.textSec, fontSize: 17, fontFamily: "'Outfit',sans-serif", fontWeight: 400, maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
                Upload your resume for an AI-powered deep analysis — scores, ATS checks, rewrites, job matches & more.
              </p>
            </div>

            {/* Upload card */}
            <div className="glass-card glow-teal" style={{ maxWidth: 600, margin: "0 auto 44px", padding: 32, position: "relative" }}>
              {/* corner glow */}
              <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(78,236,200,0.08) 0%,transparent 70%)", pointerEvents: "none" }} />
              {err && <div style={{ background: "rgba(251,113,133,0.08)", border: "1px solid rgba(251,113,133,0.25)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: C.rose, fontSize: 14, fontFamily: "'Outfit',sans-serif" }}>{err}</div>}
              <UploadZone onText={onUpload} />
            </div>

            {/* Feature grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 12, maxWidth: 820, margin: "0 auto" }}>
              {[
                ["◈", "Smart Score", "5-dimension analysis", C.teal],
                ["⬡", "ATS Check", "Beat job filters", C.blue],
                ["✦", "Rewrites", "STAR-method bullets", C.amber],
                ["⊕", "JD Matcher", "Per-job tailoring", C.violet],
                ["◉", "Job Matches", "Curated roles", C.rose],
                ["✉", "Cover Letter", "Auto-generated", C.orange],
              ].map(([ic, t, d, col]) => (
                <div key={t} className="glass-card hover-lift" style={{ padding: "20px 16px", textAlign: "center", cursor: "default" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${col}15`, border: `1px solid ${col}30`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 18, color: col }}>{ic}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 4, fontFamily: "'Outfit',sans-serif" }}>{t}</div>
                  <div style={{ fontSize: 12, color: C.textMut, fontFamily: "'Outfit',sans-serif" }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SETUP ── */}
        {stage === "setup" && (
          <div style={{ animation: "fadeUp 0.4s ease", maxWidth: 580, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 38, color: C.text, marginBottom: 10 }}>Quick Setup</h2>
              <p style={{ color: C.textSec, fontSize: 15, fontFamily: "'Outfit',sans-serif" }}>Personalize the analysis to your profile for better results</p>
            </div>
            <div className="glass-card glow-teal" style={{ padding: 36 }}>
              <SetupScreen onDone={onSetup} />
            </div>
          </div>
        )}

        {/* ── ANALYZING ── */}
        {stage === "analyzing" && (
          <div style={{ textAlign: "center", padding: "100px 0", animation: "fadeUp 0.4s ease" }}>
            {/* Animated spinner with glow */}
            <div style={{ position: "relative", width: 90, height: 90, margin: "0 auto 32px" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle,rgba(78,236,200,0.15) 0%,transparent 70%)", animation: "pulse 2s ease infinite" }} />
              <div style={{ width: 90, height: 90, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.06)", borderTopColor: C.teal, animation: "spin 0.9s linear infinite" }} />
              <div style={{ position: "absolute", inset: 10, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.04)", borderBottomColor: C.blue, animation: "spin 1.4s linear infinite reverse" }} />
            </div>
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 36, color: C.text, marginBottom: 12 }}>Analyzing Resume…</h2>
            <div style={{ height: 28, overflow: "hidden", marginBottom: 32 }}>
              <p style={{ color: C.teal, fontSize: 15, fontFamily: "'Outfit',sans-serif", fontWeight: 500, animation: "fadeIn 0.4s ease" }} key={analyzeStep}>{steps[analyzeStep]}</p>
            </div>
            {/* progress dots */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              {steps.map((s, i) => (
                <div key={s} style={{ width: i === analyzeStep ? 24 : 8, height: 8, borderRadius: 99, background: i === analyzeStep ? C.teal : "rgba(255,255,255,0.1)", transition: "all 0.4s ease", boxShadow: i === analyzeStep ? `0 0 12px ${C.teal}` : "none" }} />
              ))}
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {stage === "result" && result && (
          <div style={{ animation: "fadeUp 0.5s ease" }}>

            {/* TAB BAR */}
            <div style={{ marginBottom: 24, padding: "10px 14px", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, display: "flex", gap: 4, flexWrap: "wrap" }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
                  style={{
                    padding: "8px 15px", borderRadius: 10, border: "1px solid", cursor: "pointer",
                    fontFamily: "'Outfit',sans-serif", fontSize: 12.5, fontWeight: 600,
                    borderColor: activeTab === t.id ? `${C.teal}50` : "transparent",
                    background: activeTab === t.id ? `${C.teal}12` : "transparent",
                    color: activeTab === t.id ? C.teal : C.textMut,
                    boxShadow: activeTab === t.id ? `0 0 16px ${C.teal}18` : "none"
                  }}>
                  <span style={{ marginRight: 5, opacity: 0.8 }}>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW ── */}
            {activeTab === "overview" && (
              <div style={{ animation: "fadeUp 0.35s ease" }}>
                {/* Hero card */}
                <div className="glass-card" style={{ padding: "32px 36px", marginBottom: 16, background: "rgba(255,255,255,0.04)", position: "relative", overflow: "hidden" }}>
                  {/* BG gradient accent */}
                  <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${sc(result.overallScore)}12 0%, transparent 70%)`, pointerEvents: "none" }} />
                  <div style={{ display: "flex", gap: 36, flexWrap: "wrap", alignItems: "center" }}>
                    <CircleScore score={result.overallScore} size={148} stroke={13} />
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 10, color: C.textMut, letterSpacing: "0.16em", fontFamily: "'Outfit',sans-serif", fontWeight: 700, marginBottom: 8 }}>RESUME REPORT</div>
                      <h2 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 38, color: C.text, marginBottom: 6, lineHeight: 1.1 }}>{result.name}</h2>
                      <div style={{ color: C.blue, fontWeight: 600, fontSize: 15, fontFamily: "'Outfit',sans-serif", marginBottom: 14 }}>{result.title}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                        <Tag bg={`${sc(result.overallScore)}18`} color={sc(result.overallScore)} glow={sc(result.overallScore)}>{sl(result.overallScore)}</Tag>
                        <Tag>{result.experienceLevel || level}</Tag>
                        <Tag>{result.region || region}</Tag>
                      </div>
                      <p style={{ color: C.textSec, fontSize: 14, lineHeight: 1.8, fontFamily: "'Outfit',sans-serif" }}>{result.summary}</p>
                    </div>
                    <div style={{ minWidth: 240, flex: 1 }}>
                      {Object.entries(result.categoryScores).map(([k, v]) => <Bar key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} score={v} />)}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
                  {/* Benchmark */}
                  <GCard>
                    <STitle icon="◎" title="Benchmark" color={C.blue} />
                    <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 54, color: C.text, lineHeight: 1, marginBottom: 8 }}>{result.benchmarkPercentile}<span style={{ fontSize: 24, color: C.textSec }}>%</span></div>
                    <div style={{ fontSize: 13, color: C.textSec, fontFamily: "'Outfit',sans-serif", marginBottom: 18, lineHeight: 1.6 }}>better than peers in <span style={{ color: C.text, fontWeight: 500 }}>{result.benchmarkField}</span></div>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${result.benchmarkPercentile}%`, background: `linear-gradient(90deg,${C.blue},${C.teal})`, borderRadius: 99, transition: "width 1.4s ease", boxShadow: `0 0 10px ${C.blue}66` }} />
                    </div>
                  </GCard>

                  {/* Strengths */}
                  <GCard>
                    <STitle icon="✦" title="Strengths" color={C.teal} />
                    {result.strengths.map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start", background: "rgba(78,236,200,0.04)", border: "1px solid rgba(78,236,200,0.1)", borderRadius: 12, padding: "11px 14px" }}>
                        <span style={{ color: C.teal, marginTop: 3, fontSize: 10 }}>◆</span>
                        <span style={{ color: C.textSec, fontSize: 14, lineHeight: 1.65, fontFamily: "'Outfit',sans-serif" }}>{s}</span>
                      </div>
                    ))}
                  </GCard>
                </div>
              </div>
            )}

            {/* ── ATS ── */}
            {activeTab === "ats" && (
              <div style={{ animation: "fadeUp 0.35s ease" }}>
                <GCard>
                  <STitle icon="⬡" title="ATS Compatibility Check" color={C.blue} />
                  <div style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 28, flexWrap: "wrap" }}>
                    <CircleScore score={result.atsScore} size={115} stroke={11} />
                    <div>
                      <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 28, color: C.text, marginBottom: 6 }}>ATS Score</div>
                      <Tag bg={`${sc(result.atsScore)}18`} color={sc(result.atsScore)} glow={sc(result.atsScore)}>{sl(result.atsScore)}</Tag>
                      <p style={{ color: C.textSec, fontSize: 13.5, fontFamily: "'Outfit',sans-serif", marginTop: 12, maxWidth: 380, lineHeight: 1.7 }}>Most companies filter resumes via ATS before a human ever reads them. Optimize to pass these automated gates.</p>
                    </div>
                  </div>
                  {result.atsIssues?.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 10, color: C.textMut, letterSpacing: "0.12em", fontFamily: "'Outfit',sans-serif", marginBottom: 10, fontWeight: 700 }}>ISSUES DETECTED</div>
                      {result.atsIssues.map((iss, i) => (
                        <div key={i} style={{ display: "flex", gap: 12, marginBottom: 8, padding: "11px 14px", background: "rgba(251,113,133,0.05)", border: "1px solid rgba(251,113,133,0.15)", borderRadius: 12 }}>
                          <span style={{ color: C.rose, fontSize: 14 }}>✗</span>
                          <span style={{ color: C.textSec, fontSize: 14, fontFamily: "'Outfit',sans-serif" }}>{iss}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {result.atsKeywordsMissing?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, color: C.textMut, letterSpacing: "0.12em", fontFamily: "'Outfit',sans-serif", marginBottom: 10, fontWeight: 700 }}>KEYWORDS TO ADD</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{result.atsKeywordsMissing.map(k => <Tag key={k} bg="rgba(251,146,60,0.1)" color={C.orange} glow={C.orange}>{k}</Tag>)}</div>
                    </div>
                  )}
                </GCard>
              </div>
            )}

            {/* ── BULLETS ── */}
            {activeTab === "bullets" && (
              <div style={{ animation: "fadeUp 0.35s ease" }}>
                <GCard>
                  <STitle icon="✦" title="STAR-Method Bullet Rewrites" color={C.amber} />
                  <p style={{ color: C.textSec, fontSize: 14, fontFamily: "'Outfit',sans-serif", lineHeight: 1.7, marginBottom: 22 }}>Weak bullet points rewritten with strong action verbs using the Situation–Task–Action–Result framework.</p>
                  {(!result.bulletRewrites || result.bulletRewrites.length === 0) && (
                    <div style={{ textAlign: "center", padding: 44, color: C.textMut, fontFamily: "'Outfit',sans-serif" }}>Your bullet points already look strong — great job! 🎉</div>
                  )}
                  {result.bulletRewrites?.map((b, i) => (
                    <div key={i} className="hover-lift" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 22px", marginBottom: 14, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg,${C.rose},${C.amber})`, borderRadius: "3px 0 0 3px" }} />
                      <div style={{ marginBottom: 14, paddingLeft: 8 }}>
                        <div style={{ fontSize: 10, color: C.textMut, letterSpacing: "0.12em", fontFamily: "'Outfit',sans-serif", fontWeight: 700, marginBottom: 6 }}>ORIGINAL</div>
                        <div style={{ color: C.rose, fontSize: 14, lineHeight: 1.65, fontFamily: "'Outfit',sans-serif", textDecoration: "line-through", opacity: 0.7 }}>{b.original}</div>
                      </div>
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14, paddingLeft: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ fontSize: 10, color: C.textMut, letterSpacing: "0.12em", fontFamily: "'Outfit',sans-serif", fontWeight: 700 }}>REWRITTEN</div>
                          <Tag bg="rgba(251,191,36,0.12)" color={C.amber} glow={C.amber}>⚡ {b.verb}</Tag>
                        </div>
                        <div style={{ color: C.teal, fontSize: 14, lineHeight: 1.65, fontFamily: "'Outfit',sans-serif" }}>{b.rewritten}</div>
                      </div>
                    </div>
                  ))}
                </GCard>
              </div>
            )}

            {/* ── SKILLS ── */}
            {activeTab === "skills" && (
              <div style={{ animation: "fadeUp 0.35s ease" }}>
                <GCard>
                  <STitle icon="◎" title="Skills Gap Analysis" color={C.violet} />
                  <p style={{ color: C.textSec, fontSize: 14, fontFamily: "'Outfit',sans-serif", lineHeight: 1.7, marginBottom: 22 }}>Skills and certifications missing from your profile that could significantly boost your candidacy.</p>
                  {result.skillsGap?.map((s, i) => (
                    <div key={i} className="hover-lift" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 18px", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Tag bg={s.importance === "high" ? "rgba(251,113,133,0.12)" : "rgba(251,191,36,0.12)"} color={s.importance === "high" ? C.rose : C.amber} glow={s.importance === "high" ? C.rose : C.amber}>{s.importance}</Tag>
                        <span style={{ color: C.text, fontWeight: 600, fontSize: 15, fontFamily: "'Outfit',sans-serif" }}>{s.skill}</span>
                      </div>
                      <div style={{ fontSize: 13, color: C.textMut, fontFamily: "'Outfit',sans-serif" }}>📚 <span style={{ color: C.textSec }}>{s.course}</span></div>
                    </div>
                  ))}
                </GCard>
              </div>
            )}

            {/* ── IMPROVEMENTS ── */}
            {activeTab === "improvements" && (
              <div style={{ animation: "fadeUp 0.35s ease" }}>
                <GCard>
                  <STitle icon="↑" title="Improvement Suggestions" color={C.teal} />
                  {result.improvements.map((imp, i) => (
                    <div key={i} className="hover-lift" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px", marginBottom: 12, borderLeft: `3px solid ${priC[imp.priority]}`, position: "relative" }}>
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "100%", background: `linear-gradient(90deg,${priC[imp.priority]}06,transparent)`, borderRadius: "0 14px 14px 0", pointerEvents: "none" }} />
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                        <Tag bg={`${priC[imp.priority]}15`} color={priC[imp.priority]} glow={priC[imp.priority]}>{imp.priority.toUpperCase()}</Tag>
                        <span style={{ fontWeight: 700, color: C.text, fontSize: 14.5, fontFamily: "'Outfit',sans-serif" }}>{imp.area}</span>
                      </div>
                      <p style={{ color: C.textSec, fontSize: 14, lineHeight: 1.7, fontFamily: "'Outfit',sans-serif" }}>{imp.suggestion}</p>
                    </div>
                  ))}
                </GCard>
              </div>
            )}

            {/* ── CORRECTIONS ── */}
            {activeTab === "corrections" && (
              <div style={{ animation: "fadeUp 0.35s ease" }}>
                <GCard>
                  <STitle icon="⌥" title="Corrections" color={C.orange} />
                  {(!result.corrections || result.corrections.length === 0) && (
                    <div style={{ textAlign: "center", padding: 44, color: C.textMut, fontFamily: "'Outfit',sans-serif" }}>No corrections found — your resume looks clean! ✨</div>
                  )}
                  {result.corrections?.map((c, i) => (
                    <div key={i} className="hover-lift" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 22px", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                        <span style={{ fontSize: 20 }}>{cIcon[c.type] || "📌"}</span>
                        <Tag>{c.type}</Tag>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, color: C.textMut, letterSpacing: "0.12em", fontFamily: "'Outfit',sans-serif", fontWeight: 700, marginBottom: 6 }}>ISSUE</div>
                        <div style={{ background: "rgba(251,113,133,0.06)", border: "1px solid rgba(251,113,133,0.15)", borderRadius: 10, padding: "11px 14px", color: "#fda4af", fontSize: 14, fontFamily: "'Outfit',sans-serif" }}>{c.issue}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: C.textMut, letterSpacing: "0.12em", fontFamily: "'Outfit',sans-serif", fontWeight: 700, marginBottom: 6 }}>FIX</div>
                        <div style={{ background: "rgba(78,236,200,0.05)", border: "1px solid rgba(78,236,200,0.15)", borderRadius: 10, padding: "11px 14px", color: C.teal, fontSize: 14, fontFamily: "'Outfit',sans-serif" }}>{c.fix}</div>
                      </div>
                    </div>
                  ))}
                </GCard>
              </div>
            )}

            {/* ── JOBS ── */}
            {activeTab === "jobs" && (
              <div style={{ animation: "fadeUp 0.35s ease" }}>
                <GCard>
                  <STitle icon="◉" title="Job Matches" color={C.blue} />
                  {result.jobSuggestions.map((job, i) => (
                    <div key={i} className="hover-lift" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "22px 24px", marginBottom: 14, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: `radial-gradient(circle,${sc(job.match)}10 0%,transparent 70%)`, pointerEvents: "none" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                        <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 24, color: C.text }}>{job.title}</div>
                        <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, color: sc(job.match) }}>{job.match}%</div>
                      </div>
                      <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, marginBottom: 14, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${job.match}%`, background: `linear-gradient(90deg,${sc(job.match)}55,${sc(job.match)})`, borderRadius: 99, boxShadow: `0 0 8px ${sc(job.match)}55` }} />
                      </div>
                      <p style={{ color: C.textSec, fontSize: 14, lineHeight: 1.65, fontFamily: "'Outfit',sans-serif", marginBottom: 14 }}>{job.reason}</p>
                      <div style={{ fontSize: 10, color: C.textMut, letterSpacing: "0.12em", fontFamily: "'Outfit',sans-serif", fontWeight: 700, marginBottom: 8 }}>TOP COMPANIES</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{job.companies.map(c => <Tag key={c}>{c}</Tag>)}</div>
                    </div>
                  ))}
                </GCard>
              </div>
            )}

            {/* ── LINKEDIN ── */}
            {activeTab === "linkedin" && (
              <div style={{ animation: "fadeUp 0.35s ease" }}>
                <GCard>
                  <STitle icon="ℓ" title="LinkedIn Profile Optimizer" color="#0ea5e9" />
                  <p style={{ color: C.textSec, fontSize: 14, fontFamily: "'Outfit',sans-serif", lineHeight: 1.7, marginBottom: 20 }}>Translate your resume into a high-performing LinkedIn profile with these targeted tips.</p>
                  {result.linkedinTips?.map((tip, i) => (
                    <div key={i} className="hover-lift" style={{ display: "flex", gap: 14, marginBottom: 12, padding: "16px 18px", background: "rgba(14,165,233,0.05)", border: "1px solid rgba(14,165,233,0.15)", borderRadius: 14 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: "#0077b5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", fontFamily: "'Outfit',sans-serif", flexShrink: 0 }}>in</div>
                      <span style={{ color: C.textSec, fontSize: 14, lineHeight: 1.7, fontFamily: "'Outfit',sans-serif" }}>{tip}</span>
                    </div>
                  ))}
                </GCard>
              </div>
            )}

            {/* ── JD MATCHER ── */}
            {activeTab === "jd" && (
              <div style={{ animation: "fadeUp 0.35s ease" }}>
                <GCard><STitle icon="⊕" title="Job Description Matcher" color={C.amber} /><JDMatcher resumeText={resumeText} /></GCard>
              </div>
            )}

            {/* ── COVER LETTER ── */}
            {activeTab === "cover" && (
              <div style={{ animation: "fadeUp 0.35s ease" }}>
                <GCard><STitle icon="✉" title="Cover Letter Generator" color={C.violet} /><CoverLetterGen resumeText={resumeText} /></GCard>
              </div>
            )}

            {/* ── SUMMARY ── */}
            {activeTab === "summary" && (
              <div style={{ animation: "fadeUp 0.35s ease" }}>
                <GCard><STitle icon="§" title="Professional Summary Generator" color={C.teal} /><SummaryGen resumeText={resumeText} /></GCard>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "20px 28px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <span style={{ fontSize: 12, color: C.textMut, fontFamily: "'Outfit',sans-serif" }}>ResumeIQ — Powered by Claude AI · Built by Sayan Das</span>
      </div>
    </div>
  );
}
