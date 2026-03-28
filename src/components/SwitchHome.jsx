import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { calcProgress } from './ProjectList.jsx';

const ACCENT_BLUE   = "#0000FF";
const ACCENT_PINK   = "#ff0000";
const ACCENT_YELLOW = "#f1f111";
const ACCENT_GREEN  = "#00FF00";

const CURSOR_HAND = "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"0 0 32 32\"><path d=\"M14 6 v10 h8 v12 h-16 v-16 h4 v-6 z\" fill=\"%23000000\" /><path d=\"M10 2 v10 h8 v12 h-16 v-16 h4 v-6 z\" fill=\"%23FF00FF\" stroke=\"%23FFFFFF\" stroke-width=\"2.5\" stroke-linejoin=\"miter\" /></svg>') 10 2, pointer";

const LOCAL_CSS = `
  @keyframes waterfall { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
  .sh-range::-webkit-slider-thumb {
    -webkit-appearance: none; width: 14px; height: 14px; border-radius: 0;
    background: #0000FF; border: 2px solid #fff; box-shadow: 2px 2px 0 #000;
    cursor: ${CURSOR_HAND};
  }
  .sh-range::-moz-range-thumb {
    width: 14px; height: 14px; border-radius: 0;
    background: #0000FF; border: 2px solid #fff; box-shadow: 2px 2px 0 #000;
    cursor: ${CURSOR_HAND};
  }
  .sh-date::-webkit-calendar-picker-indicator {
    cursor: ${CURSOR_HAND};
  }
`;

// ─── PROJECT CARD — 保留原始風格，size 動態縮放 ──────────────────────────────
function ProjectCard({ project, onSelect, dark, index, size = 260 }) {
  const [hovered, setHovered] = useState(false);
  const pct = calcProgress(project);
  const today = (() => { const _n = new Date(); return `${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}-${String(_n.getDate()).padStart(2,'0')}` })();
  const isOverdue = project.deadline && project.deadline < today && pct < 100;
  const isDone = pct >= 100;

  // 依 size 等比縮放字體與 padding（基準 260px）
  const scale        = size / 260;
  const pctFontSize  = Math.round(72  * scale);
  const pctUnit      = Math.round(24  * scale);
  const titleSize    = Math.round(15  * scale);
  const pad          = Math.round(20  * scale);
  const shadowOffset = Math.round(20  * scale);
  const borderW      = Math.max(3, Math.round(4 * scale));

  return (
    <div
      onClick={() => onSelect(project)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: `${size}px`, height: `${size}px`,
        flexShrink: 0, boxSizing: "border-box",
        background: hovered ? ACCENT_YELLOW : "transparent",
        color: dark ? "#fff" : "#000",
        border: `${borderW}px solid ${dark ? "rgba(255,255,255,0.3)" : "#000"}`,
        boxShadow: hovered
          ? `${shadowOffset}px ${shadowOffset}px 0 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`
          : `8px 8px 0 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`,
        transform: hovered ? "translate(-6px,-6px)" : "translate(0,0)",
        transition: "all 0.15s ease",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: `${pad}px`, position: "relative", overflow: "hidden",
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
          fontWeight: 900, letterSpacing: "0.1em", padding: "4px 8px", textTransform: "uppercase",
        }}>OGSM</div>
        {(isDone || isOverdue) && (
          <div style={{
            fontSize: "9px", fontWeight: 900, padding: "4px 8px",
            background: isDone ? ACCENT_GREEN : ACCENT_PINK, color: "#000",
            textTransform: "uppercase", letterSpacing: "0.08em", border: "2px solid #000",
          }}>
            {isDone ? "完成" : "逾期"}
          </div>
        )}
      </div>

      {/* Progress number */}
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
          fontSize: `${pctFontSize}px`, lineHeight: 1, fontStyle: "italic",
          color: hovered ? "#000" : (dark ? "#fff" : "#000"), letterSpacing: "-0.04em",
        }}>
          {pct}<span style={{ fontSize: `${pctUnit}px`, fontStyle: "normal", marginLeft: "5px" }}>%</span>
        </div>
        <div style={{ width: "100%", height: "4px", background: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", marginTop: "8px" }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: hovered ? "#000" : (pct >= 100 ? ACCENT_GREEN : pct >= 60 ? ACCENT_BLUE : pct >= 30 ? '#f97e27' : ACCENT_PINK),
            transition: "width 0.4s, background 0.15s",
          }} />
        </div>
      </div>

      {/* Title & deadline */}
      <div>
        <h3 style={{
          fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
          fontSize: `${titleSize}px`, lineHeight: 1.2, textTransform: "uppercase",
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
function NewProjectCard({ onNewProject, dark, index, size = 260 }) {
  const [hovered, setHovered] = useState(false);
  const scale   = size / 260;
  const iconW   = Math.round(64 * scale);
  const iconFs  = Math.round(32 * scale);
  const labelFs = Math.max(12, Math.round(16 * scale));
  const borderW = Math.max(3, Math.round(4 * scale));

  return (
    <div onClick={onNewProject} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        width: `${size}px`, height: `${size}px`, flexShrink: 0, boxSizing: "border-box",
        border: `${borderW}px dashed ${dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}`,
        boxShadow: hovered ? `8px 8px 0 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}` : "none",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: `${Math.round(16*scale)}px`,
        color: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
        background: hovered ? ACCENT_BLUE : (dark ? "#333" : "#f5f5f5"),
        cursor: "pointer",
        transform: hovered ? "translate(-4px,-4px)" : "none",
        transition: "all 0.15s ease",
        animation: `waterfall 0.3s ${index * 0.04}s both`,
      }}
    >
      <div style={{
        width: `${iconW}px`, height: `${iconW}px`,
        background: hovered ? "#000" : (dark ? "#222" : "#fff"),
        border: `${borderW}px solid ${dark ? "rgba(255,255,255,0.3)" : "#000"}`,
        boxShadow: `4px 4px 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: `${iconFs}px`, fontWeight: 900,
        color: hovered ? "#fff" : (dark ? "#fff" : "#000"),
        transition: "all 0.15s",
      }}>+</div>
      <span style={{
        fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
        fontSize: `${labelFs}px`, textTransform: "uppercase", letterSpacing: "0.04em",
        color: hovered ? "#fff" : undefined,
      }}>建立新專案</span>
    </div>
  );
}

// ─── PROJECTS GRID PAGE ──────────────────────────────────────────────────────
export default function ProjectsPage({ projects, onSelect, onNewProject, onBack, dark, onToggleDark }) {
  const [query, setQuery]       = useState("");
  const [progMin, setProgMin]   = useState(0);
  const [progMax, setProgMax]   = useState(100);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [sortBy, setSortBy]     = useState("time");
  const [sortDir, setSortDir]   = useState("desc");
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort]     = useState(false);
  const [filterPos, setFilterPos]   = useState({ top: 0, left: 0 });
  const [sortPos, setSortPos]       = useState({ top: 0, left: 0 });
  const [cardSize, setCardSize]     = useState(260);

  const gridRef      = useRef(null);
  const filterBtnRef = useRef(null);
  const filterPopRef = useRef(null);
  const sortBtnRef   = useRef(null);
  const sortPopRef   = useRef(null);
  // 依容器寬度動態算卡片尺寸：最多 6 欄，最小 160px，gap=20px
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const GAP = 32;
    const MIN = 160;
    const MAX_COLS = 6;
    const calc = (w) => {
      const cols = Math.min(MAX_COLS, Math.max(1, Math.floor((w + GAP) / (MIN + GAP))));
      const size = Math.floor((w - (cols - 1) * GAP) / cols);
      setCardSize(size);
    };
    const ro = new ResizeObserver(entries => { for (const e of entries) calc(e.contentRect.width); });
    ro.observe(el);
    calc(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!showFilter || !filterBtnRef.current) return;
    const r = filterBtnRef.current.getBoundingClientRect();
    setFilterPos({ top: r.bottom + 8, left: r.right - 240 });
  }, [showFilter]);

  useLayoutEffect(() => {
    if (!showSort || !sortBtnRef.current) return;
    const r = sortBtnRef.current.getBoundingClientRect();
    setSortPos({ top: r.bottom + 8, left: r.right - 152 });
  }, [showSort]);

  useEffect(() => {
    if (!showFilter) return;
    const h = (e) => {
      if (!filterBtnRef.current?.contains(e.target) && !filterPopRef.current?.contains(e.target)) setShowFilter(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showFilter]);

  useEffect(() => {
    if (!showSort) return;
    const h = (e) => {
      if (!sortBtnRef.current?.contains(e.target) && !sortPopRef.current?.contains(e.target)) setShowSort(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showSort]);

  const isFiltering = progMin > 0 || progMax < 100 || dateFrom !== "" || dateTo !== "";
  const isSorted    = sortBy !== "time" || sortDir !== "desc";

  const filtered = projects.filter(p => {
    if (query.trim()) {
      const q = query.toLowerCase();
      if (!(p.title || "").toLowerCase().includes(q) && !(p.objective || "").toLowerCase().includes(q)) return false;
    }
    if (progMin > 0 || progMax < 100) {
      const pct = calcProgress(p);
      if (pct < progMin || pct > progMax) return false;
    }
    if (dateFrom || dateTo) {
      const created = new Date(p.createdAt).setHours(0, 0, 0, 0);
      if (dateFrom && created < new Date(dateFrom + "T00:00:00").getTime()) return false;
      if (dateTo   && created > new Date(dateTo   + "T00:00:00").getTime()) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const diff = sortBy === "time"
      ? new Date(a.createdAt) - new Date(b.createdAt)
      : calcProgress(a) - calcProgress(b);
    return sortDir === "asc" ? diff : -diff;
  });

  const btnStyle = (active) => ({
    width: "44px", height: "44px",
    background: active ? ACCENT_BLUE : (dark ? "#3b3b3b" : "#fff"),
    border: `4px solid ${dark ? "rgba(255,255,255,0.3)" : "#000"}`,
    boxShadow: `3px 3px 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: active ? "#fff" : (dark ? "#fff" : "#000"),
    cursor: "pointer", transition: "all 0.15s",
  });

  const labelStyle = {
    fontSize: "10px", fontWeight: 900, letterSpacing: "0.1em",
    textTransform: "uppercase", background: "#000", color: ACCENT_YELLOW,
    padding: "2px 6px", alignSelf: "flex-start",
  };

  const popBase = {
    position: "fixed", zIndex: 99999, padding: "16px",
    display: "flex", flexDirection: "column", gap: "14px",
    border: `3px solid ${dark ? "#fff" : "#000"}`,
    background: dark ? "#1a1a1a" : "#fff",
    boxShadow: `5px 5px 0 0 ${dark ? "rgba(255,255,255,0.3)" : "#000"}`,
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative", zIndex: 10, overflow: "hidden" }}>
      <style>{LOCAL_CSS}</style>

      {/* ── Top bar ── */}
      <div style={{ padding: "32px 48px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, position: "relative", zIndex: 10 }}>
        <h1 onClick={onBack} className="cursor-pointer"
          style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: "clamp(24px, 3vw, 36px)", lineHeight: 0.85, letterSpacing: "-0.04em", textTransform: "uppercase", color: dark ? "#fff" : "#000", transition: "opacity 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.6"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          STRATEGIC<br /><span style={{ color: ACCENT_BLUE }}>OGSM</span><br />PLANNER.
        </h1>

        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {(query || isFiltering) && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ fontSize: "40px", fontWeight: 900, fontStyle: "italic", fontFamily: '"Space Grotesk", sans-serif', lineHeight: 1, letterSpacing: "-0.04em", color: dark ? "#fff" : "#000" }}>
                {sorted.length}<span style={{ fontSize: "18px", fontStyle: "normal", marginLeft: "3px", opacity: 0.4 }}>/{projects.length}</span>
              </span>
              <span style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.45, color: dark ? "#fff" : "#000" }}>個專案</span>
            </div>
          )}

          <div
            style={{ position: "relative", display: "flex", alignItems: "center", border: `4px solid ${dark ? "rgba(255,255,255,0.3)" : "#000"}`, boxShadow: `3px 3px 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`, background: dark ? "rgba(59,59,59,0.8)" : "#fff", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = `6px 6px 0 ${dark ? "rgba(255,255,255,0.2)" : "#000"}`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `3px 3px 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ position: "absolute", left: "12px", opacity: 0.4, color: dark ? "#fff" : "#000", pointerEvents: "none" }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="搜尋專案..."
              style={{ background: "transparent", border: "none", fontSize: "13px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, paddingLeft: "40px", paddingRight: query ? "4px" : "16px", paddingTop: "10px", paddingBottom: "10px", width: "200px", color: dark ? "#fff" : "#000", outline: "none" }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                title="清除搜尋"
                style={{
                  flexShrink: 0,
                  marginRight: "8px",
                  width: "22px",
                  height: "22px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
                  border: "none",
                  cursor: "pointer",
                  color: dark ? "#fff" : "#000",
                  fontSize: "14px",
                  fontWeight: 900,
                  lineHeight: 1,
                  padding: 0,
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#FF00FF"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"; e.currentTarget.style.color = dark ? "#fff" : "#000"; }}
              >✕</button>
            )}
          </div>

          <button
            ref={filterBtnRef}
            onClick={() => setShowFilter(v => !v)}
            style={btnStyle(isFiltering)}
            title="篩選"
            onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? "rgba(255,255,255,0.2)" : "#000"}`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `3px 3px 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`; }}
            onMouseDown={e => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = `2px 2px 0 0 ${dark ? "rgba(255,255,255,0.2)" : "#000"}`; }}
            onMouseUp={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? "rgba(255,255,255,0.2)" : "#000"}`; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
          </button>

          <button
            ref={sortBtnRef}
            onClick={() => setShowSort(v => !v)}
            style={btnStyle(isSorted)}
            title="排序"
            onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? "rgba(255,255,255,0.2)" : "#000"}`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `3px 3px 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`; }}
            onMouseDown={e => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = `2px 2px 0 0 ${dark ? "rgba(255,255,255,0.2)" : "#000"}`; }}
            onMouseUp={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? "rgba(255,255,255,0.2)" : "#000"}`; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ transition: "transform 0.2s", transform: sortDir === "asc" ? "rotate(180deg)" : "rotate(0deg)" }}>
              <path d="M12 5v14m-7-7l7-7 7 7"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Cards ── */}
      {sorted.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" }}>
          <div style={{ fontSize: "120px", fontWeight: 900, fontStyle: "italic", fontFamily: '"Space Grotesk", sans-serif', lineHeight: 1, letterSpacing: "-0.04em", color: dark ? "rgba(255,255,255,0.5)" : "rgba(0, 0, 0, 0.6)" }}>0</div>
          <span style={{ fontSize: "28px", fontWeight: 900, fontFamily: '"Space Grotesk", sans-serif', textTransform: "uppercase", letterSpacing: "0.06em", color: dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)" }}>找不到符合的專案</span>
          <span style={{ fontSize: "18px", fontWeight: 700, color: dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)" }}>請嘗試調整搜尋條件或篩選範圍</span>
        </div>
      ) : (
        <div ref={gridRef} className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "20px 24px 48px" }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, ${cardSize}px)`, justifyContent: "center", columnGap: "32px", rowGap: "40px" }}>
            {sorted.map((p, i) => <ProjectCard key={p.id} project={p} onSelect={onSelect} dark={dark} index={i} size={cardSize} />)}
            {!query && !isFiltering && <NewProjectCard onNewProject={onNewProject} dark={dark} index={sorted.length} size={cardSize} />}
          </div>
        </div>
      )}

      {/* ── Dark mode toggle ── */}
      <div style={{ position: "absolute", bottom: "24px", right: "40px", zIndex: 10 }}>
        <button onClick={onToggleDark}
          style={{
            width: "96px",
            height: "40px",
            borderRadius: "999px",
            background: dark ? "#4a4a4a" : "#b0b0b0",
            border: `2px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.15)"}`,
            boxShadow: `4px 4px 0 0 ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.25)"}`,
            display: "flex",
            alignItems: "center",
            position: "relative",
            cursor: "pointer",
            padding: "0",
            transition: "all 0.3s ease",
            overflow: "hidden"
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.4)"}`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `4px 4px 0 0 ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.25)"}`; }}
          onMouseDown={e => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = `2px 2px 0 0 ${dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.4)"}`; }}
          onMouseUp={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.4)"}`; }}
          title="切換主題"
        >
          {/* 背景文字區塊 (LIGHT 靠左，DARK 靠右) */}
          <div style={{
            width: "100%",
            display: "flex",
            justifyContent: dark ? "flex-end" : "flex-start",
            padding: dark ? "0 12px 0 0" : "0 0 0 12px",
            boxSizing: "border-box"
          }}>
            <span style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 900,
              fontSize: "12px",
              letterSpacing: "0.05em",
              color: dark ? "#fff" : "#787878",
              transition: "all 0.3s ease",
            }}>
              {dark ? "DARK" : "LIGHT"}
            </span>
          </div>
          {/* 圓形圖標滑塊 */}
          <div style={{
            position: "absolute",
            top: "2px",
            left: dark ? "3px" : "calc(100% - 30px)",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: dark ? "#fff" : "#e8e8e8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          }}>
            {dark ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a4a4a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#909090" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            )}
          </div>
        </button>
      </div>

      {/* ── Filter Portal ── */}
      {showFilter && createPortal(
        <div ref={filterPopRef} style={{ ...popBase, top: filterPos.top, left: filterPos.left, width: "240px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={labelStyle}>完成進度</div>
              <span style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: 700, color: dark ? "#fff" : "#000" }}>{progMin}% – {progMax}%</span>
            </div>
            <div style={{ position: "relative", height: "20px", marginTop: "4px", display: "flex", alignItems: "center" }}>
              <div style={{ position: "absolute", width: "100%", height: "4px", background: dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)" }} />
              <div style={{ position: "absolute", height: "4px", background: ACCENT_BLUE, pointerEvents: "none", left: `${progMin}%`, width: `${progMax - progMin}%` }} />
              <input type="range" min={0} max={100} step={1} value={progMin} onChange={e => setProgMin(Math.min(Number(e.target.value), progMax))} className="sh-range" style={{ position: "absolute", width: "100%", height: "4px", appearance: "none", WebkitAppearance: "none", background: "transparent", outline: "none", margin: 0 }} />
              <input type="range" min={0} max={100} step={1} value={progMax} onChange={e => setProgMax(Math.max(Number(e.target.value), progMin))} className="sh-range" style={{ position: "absolute", width: "100%", height: "4px", appearance: "none", WebkitAppearance: "none", background: "transparent", outline: "none", margin: 0 }} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={labelStyle}>建立日期</div>
            <input type="date" className="sh-date" value={dateFrom} max={dateTo || undefined} onChange={e => { const v = e.target.value; if (dateTo && v > dateTo) return; setDateFrom(v); }} style={{ width: "100%", fontSize: "12px", padding: "8px", border: `2px solid ${dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`, outline: "none", fontFamily: "monospace", background: dark ? "#2b2b2b" : "#f9fafb", color: dark ? "#fff" : "#000", colorScheme: dark ? "dark" : "light" }} />
            <input type="date" className="sh-date" value={dateTo} min={dateFrom || undefined} onChange={e => { const v = e.target.value; if (dateFrom && v < dateFrom) return; setDateTo(v); }} style={{ width: "100%", fontSize: "12px", padding: "8px", border: `2px solid ${dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`, outline: "none", fontFamily: "monospace", background: dark ? "#2b2b2b" : "#f9fafb", color: dark ? "#fff" : "#000", colorScheme: dark ? "dark" : "light" }} />
          </div>
          {isFiltering && (
            <button onClick={() => { setProgMin(0); setProgMax(100); setDateFrom(""); setDateTo(""); }}
              style={{ alignSelf: "flex-start", fontSize: "11px", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", padding: "6px 12px", border: "2px solid rgba(255,0,255,0.4)", background: "transparent", color: ACCENT_PINK, cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = ACCENT_PINK; e.currentTarget.style.color = "#000"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = ACCENT_PINK; }}
            >清除篩選</button>
          )}
        </div>,
        document.body
      )}

      {/* ── Sort Portal ── */}
      {showSort && createPortal(
        <div ref={sortPopRef} style={{ ...popBase, top: sortPos.top, left: sortPos.left, width: "152px", gap: "10px" }}>
          <div style={labelStyle}>排序依據</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "4px" }}>
            {[["time", "建立時間"], ["progress", "完成進度"]].map(([val, label]) => (
              <button key={val} onClick={() => setSortBy(val)} style={{ textAlign: "left", fontSize: "12px", fontWeight: 700, padding: "6px 10px", border: "2px solid", borderColor: sortBy === val ? "#000" : "transparent", background: sortBy === val ? ACCENT_YELLOW : "transparent", color: sortBy === val ? "#000" : (dark ? "#fff" : "#000"), cursor: "pointer" }}>{label}</button>
            ))}
          </div>
          <div style={labelStyle}>方向</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {[["desc", sortBy === "time" ? "最新優先" : "高→低"], ["asc", sortBy === "time" ? "最舊優先" : "低→高"]].map(([val, label]) => (
              <button key={val} onClick={() => setSortDir(val)} style={{ textAlign: "left", fontSize: "12px", fontWeight: 700, padding: "6px 10px", border: "2px solid", borderColor: sortDir === val ? "#000" : "transparent", background: sortDir === val ? ACCENT_YELLOW : "transparent", color: sortDir === val ? "#000" : (dark ? "#fff" : "#000"), cursor: "pointer" }}>{label}</button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}