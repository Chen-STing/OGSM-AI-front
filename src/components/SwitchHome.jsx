import React, { useState } from 'react';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────
const ACCENT_BLUE   = "#0000FF";
const ACCENT_PINK   = "#FF00FF";
const ACCENT_YELLOW = "#FFFF00";
const ACCENT_GREEN  = "#00FF00";

// ─── PROJECT CARD ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onSelect, dark, index }) {
  const [hovered, setHovered] = useState(false);
  const pct = project.progress || 0;
  const isOverdue = project.deadline && new Date(project.deadline) < new Date() && pct < 100;
  const isDone = pct >= 100;

  return (
    <div
      onClick={() => onSelect(project)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="project-card-hover"
      style={{
        width: "260px", height: "260px", flexShrink: 0,
        background: hovered ? ACCENT_YELLOW : (dark ? "#3b3b3b" : "#fff"),
        color: dark ? "#fff" : "#000",
        border: `4px solid ${dark ? "rgba(255,255,255,0.3)" : "#000"}`,
        boxShadow: hovered
          ? `20px 20px 0 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`
          : `8px 8px 0 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`,
        transform: hovered ? "translate(-6px, -6px)" : "translate(0,0)",
        transition: "all 0.15s ease",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "20px", position: "relative", overflow: "hidden",
        cursor: "pointer",
        animation: `waterfall 0.3s ${index * 0.04}s both`,
      }}
    >
      {/* Header badges */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{
          background: hovered ? "#000" : (dark ? "#fff" : "#000"),
          color: hovered ? ACCENT_YELLOW : (dark ? "#000" : "#fff"),
          fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 900, letterSpacing: "0.1em", padding: "4px 8px",
          textTransform: "uppercase",
        }}>OGSM</div>
        {(isDone || isOverdue) && (
          <div style={{
            fontSize: "9px", fontWeight: 900, padding: "4px 8px",
            background: isDone ? ACCENT_GREEN : ACCENT_PINK, color: "#000",
            textTransform: "uppercase", letterSpacing: "0.08em",
            border: "2px solid #000",
          }}>
            {isDone ? "完成" : "逾期"}
          </div>
        )}
      </div>

      {/* Progress number */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
          fontSize: "72px", lineHeight: 1, fontStyle: "italic",
          color: hovered ? "#000" : (dark ? "#fff" : "#000"),
          letterSpacing: "-0.04em",
        }}>
          {pct}<span style={{ fontSize: "24px", fontStyle: "normal" }}>%</span>
        </div>
        <div style={{
          width: "100%", height: "4px",
          background: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          marginTop: "8px",
        }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: hovered ? "#000" : ACCENT_BLUE,
            transition: "width 0.4s, background 0.15s",
          }} />
        </div>
      </div>

      {/* Title & deadline */}
      <div>
        <h3 style={{
          fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
          fontSize: "15px", lineHeight: 1.2, textTransform: "uppercase",
          letterSpacing: "-0.02em", marginBottom: "4px",
          color: hovered ? "#000" : (dark ? "#fff" : "#000"),
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{project.objective || project.title || "無標題"}</h3>
        <p style={{
          fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 700, letterSpacing: "0.1em", opacity: 0.5,
          textTransform: "uppercase", color: hovered ? "#000" : undefined,
        }}>
          {project.deadline || "無截止日期"}
        </p>
      </div>
    </div>
  );
}

// ─── NEW PROJECT CARD ─────────────────────────────────────────────────────────
function NewProjectCard({ onNewProject, dark, index }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onNewProject}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "260px", height: "260px", flexShrink: 0,
        border: `4px dashed ${dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}`,
        boxShadow: hovered ? `8px 8px 0 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}` : "none",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px",
        color: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
        background: hovered ? ACCENT_BLUE : (dark ? "#333" : "#f5f5f5"),
        cursor: "pointer",
        transform: hovered ? "translate(-4px,-4px)" : "none",
        transition: "all 0.15s ease",
        animation: `waterfall 0.3s ${index * 0.04}s both`,
      }}
    >
      <div style={{
        width: "64px", height: "64px",
        background: hovered ? "#000" : (dark ? "#222" : "#fff"),
        border: `4px solid ${dark ? "rgba(255,255,255,0.3)" : "#000"}`,
        boxShadow: `4px 4px 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "32px", fontWeight: 900,
        color: hovered ? "#fff" : (dark ? "#fff" : "#000"),
        transition: "all 0.15s",
      }}>+</div>
      <span style={{
        fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
        fontSize: "16px", textTransform: "uppercase", letterSpacing: "0.04em",
        color: hovered ? "#fff" : undefined,
      }}>建立新專案</span>
    </div>
  );
}

// ─── PROJECTS GRID PAGE ──────────────────────────────────────────────────────
export default function ProjectsPage({ projects, onSelect, onNewProject, onBack, dark, onToggleDark }) {
  const [query, setQuery] = useState("");
  const filtered = projects.filter(p =>
    !query || (p.objective || p.title || "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      position: "relative", zIndex: 10, overflow: "hidden",
    }}>
      {/* Top bar */}
      <div style={{
        padding: "32px 48px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexShrink: 0, position: "relative", zIndex: 10,
      }}>
        {/* Logo / back button */}
        <h1
          onClick={onBack}
          className="cursor-pointer"
          style={{
            fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
            fontSize: "clamp(24px, 3vw, 36px)", lineHeight: 0.85,
            letterSpacing: "-0.04em", textTransform: "uppercase",
            color: dark ? "#fff" : "#000",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.6"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          STRATEGIC<br /><span style={{ color: ACCENT_BLUE }}>OGSM</span><br />PLANNER.
        </h1>

        {/* Right controls */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* Search */}
          <div style={{
            position: "relative", display: "flex", alignItems: "center",
            border: `4px solid ${dark ? "rgba(255,255,255,0.3)" : "#000"}`,
            boxShadow: `3px 3px 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`,
            background: dark ? "rgba(59,59,59,0.8)" : "#fff",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
              style={{ position: "absolute", left: "12px", opacity: 0.4, color: dark ? "#fff" : "#000" }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜尋專案..."
              style={{
                background: "transparent", border: "none",
                fontSize: "13px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
                paddingLeft: "40px", paddingRight: "16px", paddingTop: "10px", paddingBottom: "10px",
                width: "200px", color: dark ? "#fff" : "#000", outline: "none",
              }}
            />
          </div>

          {/* Filter */}
          <button
            className="b-border cursor-pointer"
            style={{
              width: "44px", height: "44px",
              background: dark ? "#3b3b3b" : "#fff",
              border: `4px solid ${dark ? "rgba(255,255,255,0.3)" : "#000"}`,
              boxShadow: `3px 3px 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: dark ? "#fff" : "#000",
              transition: "background 0.15s",
            }}
            title="篩選"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
          </button>

          {/* Sort */}
          <button
            className="b-border cursor-pointer"
            style={{
              width: "44px", height: "44px",
              background: dark ? "#3b3b3b" : "#fff",
              border: `4px solid ${dark ? "rgba(255,255,255,0.3)" : "#000"}`,
              boxShadow: `3px 3px 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: dark ? "#fff" : "#000",
              transition: "background 0.15s",
            }}
            title="排序"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M12 5v14m-7-7l7-7 7 7"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Horizontal scroll cards */}
      <div className="hide-scrollbar" style={{
        flex: 1, overflowX: "auto", overflowY: "hidden",
        padding: "5px 48px 48px", display: "flex", alignItems: "center",
      }}>
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          {filtered.map((p, i) => (
            <ProjectCard key={p.id} project={p} onSelect={onSelect} dark={dark} index={i} />
          ))}

          {/* New project card */}
          <NewProjectCard onNewProject={onNewProject} dark={dark} index={filtered.length} />
        </div>
      </div>

      {/* Bottom left: dark mode toggle */}
      <div style={{ position: "absolute", bottom: "32px", left: "48px", zIndex: 10 }}>
        <button
          onClick={onToggleDark}
          className="b-border cursor-pointer"
          style={{
            width: "64px", height: "64px", borderRadius: "50%",
            background: dark ? "#fff" : "#000", color: dark ? "#000" : "#fff",
            border: `4px solid ${dark ? "rgba(255,255,255,0.4)" : "#000"}`,
            boxShadow: `4px 4px 0 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "24px", transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
          title="切換主題"
        >
          {dark ? "☀" : "☽"}
        </button>
      </div>
    </div>
  );
}