import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { calcProgress } from './ProjectList.jsx';

const ACCENT_BLUE   = "#0000FF";
const ACCENT_PINK   = "#ff0000";
const ACCENT_YELLOW = "#f1f111";
const ACCENT_GREEN  = "#00FF00";

const CURSOR_HAND = "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"0 0 32 32\"><path d=\"M14 6 v10 h8 v12 h-16 v-16 h4 v-6 z\" fill=\"%23000000\" /><path d=\"M10 2 v10 h8 v12 h-16 v-16 h4 v-6 z\" fill=\"%23FF00FF\" stroke=\"%23FFFFFF\" stroke-width=\"2.5\" stroke-linejoin=\"miter\" /></svg>') 10 2, pointer";

function formatTaiwanDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

const LOCAL_CSS = `
  @keyframes waterfall { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: translateX(0); } }
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

function ProjectCard({ project, onSelect, onDelete, dark, index, size = 260 }) {
  const [hovered, setHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pct = calcProgress(project);
  const today = (() => { const _n = new Date(); return `${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}-${String(_n.getDate()).padStart(2,'0')}` })();
  const isOverdue = project.deadline && project.deadline < today && pct < 100;
  const isDone = pct >= 100;

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
      onMouseLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) { setHovered(false); setConfirmDelete(false); } }}
      style={{
        width: `${size}px`, height: `${size}px`,
        flexShrink: 0, boxSizing: "border-box",
        background: hovered ? ACCENT_YELLOW : "transparent",
        color: dark ? "#fff" : "#000",
        border: `${borderW}px solid ${dark ? "rgba(255,255,255,0.3)" : "#000"}`,
        boxShadow: hovered ? `${shadowOffset}px ${shadowOffset}px 0 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}` : `8px 8px 0 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`,
        transform: hovered ? "translate(-6px,-6px)" : "translate(0,0)",
        transition: "all 0.15s ease",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: `${pad}px`, position: "relative",
        cursor: "pointer",
        animation: `waterfall 0.35s ${index * 0.06}s cubic-bezier(0.16, 1, 0.3, 1) both`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ background: hovered ? "#000" : (dark ? "#fff" : "#000"), color: hovered ? ACCENT_YELLOW : (dark ? "#000" : "#fff"), fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: "0.1em", padding: "4px 8px", textTransform: "uppercase", alignSelf: "flex-start" }}>OGSM</div>
          <div style={{ fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: hovered ? "#000" : (dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.55)"), display: "flex", gap: "4px" }}>
            <span style={{ opacity: 0.6 }}>建立</span>{project.createdAt ? project.createdAt.slice(0, 10) : ""}
          </div>
        </div>
        {(isDone || isOverdue) && (
          <div style={{ fontSize: "9px", fontWeight: 900, padding: "4px 8px", background: isDone ? ACCENT_GREEN : ACCENT_PINK, color: "#000", textTransform: "uppercase", letterSpacing: "0.08em", border: "2px solid #000" }}>{isDone ? "已完成" : "已逾期"}</div>
        )}
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: `${pctFontSize}px`, lineHeight: 1, fontStyle: "italic", color: hovered ? "#000" : (dark ? "#fff" : "#000"), letterSpacing: "-0.04em" }}>
          {pct}<span style={{ fontSize: `${pctUnit}px`, fontStyle: "normal", marginLeft: "5px" }}>%</span>
        </div>
        <div style={{ width: "100%", height: "4px", background: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", marginTop: "8px" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: hovered ? "#000" : (pct >= 100 ? ACCENT_GREEN : pct >= 60 ? ACCENT_BLUE : pct >= 30 ? '#f97e27' : ACCENT_PINK), transition: "width 0.4s, background 0.15s" }} />
        </div>
      </div>

      <div>
        <h3 style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: `${titleSize}px`, lineHeight: 1.2, textTransform: "uppercase", letterSpacing: "-0.02em", marginBottom: "4px", color: hovered ? "#000" : (dark ? "#fff" : "#000"), display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{project.title || project.objective || "無標題"}</h3>
        <p style={{ fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, letterSpacing: "0.1em", opacity: isOverdue ? 1 : 0.5, textTransform: "uppercase", color: hovered ? "#000" : (isOverdue ? "#ff0000" : undefined), margin: 0 }}>{project.deadline || "無截止日期"}</p>
      </div>

      {/* Delete button — bottom-right corner */}
      {hovered && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: "absolute", bottom: `${Math.round(pad * 0.4)}px`, right: `${Math.round(pad * 0.4)}px` }}
        >
          {confirmDelete ? (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "10px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", color: "#000" }}>確定？</span>
              <button
                onClick={e => { e.stopPropagation(); onDelete && onDelete(project.id); }}
                style={{ fontSize: "10px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 8px", background: ACCENT_PINK, color: "#fff", border: "2px solid #000", boxShadow: "2px 2px 0 #000", cursor: "pointer", transition: "all 0.1s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translate(-1px,-1px)"; e.currentTarget.style.boxShadow = "3px 3px 0 #000"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "2px 2px 0 #000"; }}
                onMouseDown={e => { e.currentTarget.style.transform = "translate(1px,1px)"; e.currentTarget.style.boxShadow = "1px 1px 0 #000"; }}
                onMouseUp={e => { e.currentTarget.style.transform = "translate(-1px,-1px)"; e.currentTarget.style.boxShadow = "3px 3px 0 #000"; }}
              >刪除</button>
              <button
                onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
                style={{ fontSize: "10px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 8px", background: "#000", color: "#fff", border: "2px solid #000", boxShadow: "2px 2px 0 rgba(0,0,0,0.3)", cursor: "pointer", transition: "all 0.1s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translate(-1px,-1px)"; e.currentTarget.style.boxShadow = "3px 3px 0 rgba(0,0,0,0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "2px 2px 0 rgba(0,0,0,0.3)"; }}
              >取消</button>
            </div>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
              title="刪除專案"
              style={{ width: `${Math.round(28 * scale)}px`, height: `${Math.round(28 * scale)}px`, display: "flex", alignItems: "center", justifyContent: "center", background: "#000", border: "2px solid #000", boxShadow: "2px 2px 0 rgba(0,0,0,0.4)", cursor: "pointer", padding: 0, transition: "all 0.1s", color: "#fff" }}
              onMouseEnter={e => { e.currentTarget.style.background = ACCENT_PINK; e.currentTarget.style.transform = "translate(-1px,-1px)"; e.currentTarget.style.boxShadow = "3px 3px 0 rgba(0,0,0,0.4)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#000"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "2px 2px 0 rgba(0,0,0,0.4)"; }}
              onMouseDown={e => { e.currentTarget.style.transform = "translate(1px,1px)"; e.currentTarget.style.boxShadow = "1px 1px 0 rgba(0,0,0,0.4)"; }}
              onMouseUp={e => { e.currentTarget.style.background = ACCENT_PINK; e.currentTarget.style.transform = "translate(-1px,-1px)"; e.currentTarget.style.boxShadow = "3px 3px 0 rgba(0,0,0,0.4)"; }}
            >
              <svg width={Math.round(14 * scale)} height={Math.round(14 * scale)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function NewProjectCard({ onNewProject, dark, index, size = 260 }) {
  const [hovered, setHovered] = useState(false);
  const scale   = size / 260;
  const iconW   = Math.round(64 * scale);
  const iconFs  = Math.round(32 * scale);
  const labelFs = Math.max(12, Math.round(16 * scale));
  const borderW = Math.max(3, Math.round(4 * scale));

  return (
    <div onClick={onNewProject} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ width: `${size}px`, height: `${size}px`, flexShrink: 0, boxSizing: "border-box", border: `${borderW}px dashed ${dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}`, boxShadow: hovered ? `8px 8px 0 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}` : "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: `${Math.round(16*scale)}px`, color: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)", background: hovered ? ACCENT_BLUE : (dark ? "#333" : "#f5f5f5"), cursor: "pointer", transform: hovered ? "translate(-4px,-4px)" : "none", transition: "all 0.15s ease", animation: `waterfall 0.35s ${index * 0.06}s cubic-bezier(0.16, 1, 0.3, 1) both` }}
    >
      <div style={{ width: `${iconW}px`, height: `${iconW}px`, background: hovered ? "#000" : (dark ? "#222" : "#fff"), border: `${borderW}px solid ${dark ? "rgba(255,255,255,0.3)" : "#000"}`, boxShadow: `4px 4px 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: `${iconFs}px`, fontWeight: 900, color: hovered ? "#fff" : (dark ? "#fff" : "#000"), transition: "all 0.15s" }}>+</div>
      <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: `${labelFs}px`, textTransform: "uppercase", letterSpacing: "0.04em", color: hovered ? "#fff" : undefined }}>建立新專案</span>
    </div>
  );
}

export default function ProjectsPage({ projects, onSelect, onNewProject, onDeleteProject, onBack, dark, onToggleDark, entering, exitingTo }) {
  const [query, setQuery]       = useState("");
  const [progMin, setProgMin]   = useState(0);
  const [progMax, setProgMax]   = useState(100);
  const [progMinInput, setProgMinInput] = useState("0");
  const [progMaxInput, setProgMaxInput] = useState("100");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [deadlineFrom, setDeadlineFrom] = useState("");
  const [deadlineTo, setDeadlineTo]     = useState("");
  const [statusFilters, setStatusFilters] = useState(new Set());
  const toggleStatus = (val) => setStatusFilters(prev => { const n = new Set(prev); n.has(val) ? n.delete(val) : n.add(val); return n; });
  const [sortBy, setSortBy]     = useState("time");
  const [sortDir, setSortDir]   = useState("desc");
  const [animationKey, setAnimationKey] = useState(0);
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort]     = useState(false);
  const [filterPos, setFilterPos]   = useState({ top: 0, left: 0 });
  const [sortPos, setSortPos]       = useState({ top: 0, left: 0 });
  const [cardSize, setCardSize]     = useState(260);
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterHovered, setFilterHovered] = useState(false);
  const [sortHovered, setSortHovered]     = useState(false);

  const sliderContainerRef = useRef(null);
  const sliderDragging = useRef(null);
  const gridRef      = useRef(null);
  const filterBtnRef = useRef(null);
  const filterPopRef = useRef(null);
  const sortBtnRef   = useRef(null);
  const sortPopRef   = useRef(null);
  const titleRef     = useRef(null);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const GAP = 32;
    const MIN = 160;
    const MAX_COLS = 6;
    let rafId = null;

    const calc = (w) => {
      const cols = Math.min(MAX_COLS, Math.max(1, Math.floor((w + GAP) / (MIN + GAP))));
      const size = Math.floor((w - (cols - 1) * GAP) / cols);
      setCardSize(prev => (prev === size ? prev : size));
    };

    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        if (rafId) cancelAnimationFrame(rafId);
        const w = e.contentRect.width;
        rafId = requestAnimationFrame(() => calc(w));
      }
    });

    ro.observe(el);
    calc(el.getBoundingClientRect().width);

    return () => {
      ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
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

  // 為「飛回 HomePage」重新綁定放大飛行的動畫，保證精準重疊
  useLayoutEffect(() => {
    if (exitingTo && titleRef.current) {
      const el = titleRef.current;
      el.style.transition = "none";
      el.style.transform = "none";
      
      const rect = el.getBoundingClientRect();
      const currentFontSize = parseFloat(window.getComputedStyle(el).fontSize);
      let targetX = 0, targetY = 0, scale = 1;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (exitingTo === 'editor') {
        const ew = window.innerWidth;
        const shSize = 20; // 改為 Editor 的 20px
        // 取 Editor 目標絕對位置，左距 24px, 上距 16px (與上方 App.jsx 的 padding 相呼應)
        targetX = 24 - rect.left;
        targetY = 16 - rect.top;
        scale = shSize / currentFontSize;
      } else if (exitingTo === 'home') {
        // 放大的座標運算：對準 HomePage 的字型大小與快取座標
        const exactLeft = window.__OGSM_HOME_RECT__?.left ?? (Math.max(0, (vw - 1400) / 2) + 64);
        const exactTop = window.__OGSM_HOME_RECT__?.top ?? (vh * 0.35);
        targetX = exactLeft - rect.left;
        targetY = exactTop - rect.top;
        const homeSize = window.__OGSM_HOME_SIZE__ ?? Math.max(80, Math.min(vw * 0.1, 100)); // 對齊首頁的 100
        scale = homeSize / currentFontSize;
      }

      el.style.transformOrigin = "top left";
      
      requestAnimationFrame(() => {
        el.style.transition = "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.55s ease";
        el.style.transform = `translate(${targetX}px, ${targetY}px) scale(${scale})`;
        el.style.zIndex = 9999;
        el.style.position = "relative";
      });
    }
  }, [exitingTo]);

  const prevSortedIdsRef = useRef(null);
  useEffect(() => {
    const ids = sorted.map(p => p.id).join(",");
    if (prevSortedIdsRef.current !== ids) {
      prevSortedIdsRef.current = ids;
      setAnimationKey(k => k + 1);
    }
  });

  useEffect(() => {
    if (!showFilter) return;
    const h = (e) => { if (!filterBtnRef.current?.contains(e.target) && !filterPopRef.current?.contains(e.target)) setShowFilter(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showFilter]);

  useEffect(() => {
    if (!showSort) return;
    const h = (e) => { if (!sortBtnRef.current?.contains(e.target) && !sortPopRef.current?.contains(e.target)) setShowSort(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showSort]);

  const isFiltering = progMin > 0 || progMax < 100 || dateFrom !== "" || dateTo !== "" || deadlineFrom !== "" || deadlineTo !== "" || statusFilters.size > 0;
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
    if (deadlineFrom || deadlineTo) {
      if (!p.deadline) return false;
      if (deadlineFrom && p.deadline < deadlineFrom) return false;
      if (deadlineTo   && p.deadline > deadlineTo)   return false;
    }
    if (statusFilters.size > 0) {
      const pct = calcProgress(p);
      const today = new Date().toISOString().slice(0,10);
      const overdue = p.deadline && p.deadline < today && pct < 100;
      const done = pct >= 100;
      const inProgress = !done && !overdue;
      const match = (statusFilters.has("inProgress") && inProgress) || (statusFilters.has("overdue") && overdue) || (statusFilters.has("done") && done);
      if (!match) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const diff = sortBy === "time" ? new Date(a.createdAt) - new Date(b.createdAt) : sortBy === "deadline" ? ((a.deadline || "9999") < (b.deadline || "9999") ? -1 : (a.deadline || "9999") > (b.deadline || "9999") ? 1 : 0) : calcProgress(a) - calcProgress(b);
    return sortDir === "asc" ? diff : -diff;
  });

  const getSliderVal = (clientX) => {
    const rect = sliderContainerRef.current.getBoundingClientRect();
    return Math.round(Math.min(100, Math.max(0, (clientX - rect.left) / rect.width * 100)));
  };
  const onSliderMouseDown = (e) => {
    const val = getSliderVal(e.clientX);
    const distMin = Math.abs(val - progMin);
    const distMax = Math.abs(val - progMax);
    const startX = e.clientX;
    let decided = distMin !== distMax;
    sliderDragging.current = distMin <= distMax ? "min" : "max";
    e.preventDefault();
    const onMove = (e2) => {
      if (!decided) {
        const dx = e2.clientX - startX;
        if (Math.abs(dx) < 3) return;
        sliderDragging.current = dx < 0 ? "min" : "max";
        decided = true;
      }
      const v = getSliderVal(e2.clientX);
      if (sliderDragging.current === "min") { const val = Math.min(v, progMax); setProgMin(val); setProgMinInput(String(val)); }
      else { const val = Math.max(v, progMin); setProgMax(val); setProgMaxInput(String(val)); }
    };
    const onUp = () => { sliderDragging.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
    const btnStyle = (active, hovered) => ({
    width: "44px", height: "44px",
    background: active
      ? (hovered ? "#0000cc" : ACCENT_BLUE)
      : (hovered ? ACCENT_YELLOW : (dark ? "#3b3b3b" : "#fff")),
    border: `4px solid ${active && hovered ? "#0000cc" : (dark ? "rgba(255,255,255,0.3)" : "#000")}`,
    boxShadow: `3px 3px 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: active ? "#fff" : (hovered ? "#000" : (dark ? "#fff" : "#000")),
    cursor: "pointer", transition: "all 0.15s",
  });

  const labelStyle = { fontSize: "10px", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", background: "#000", color: ACCENT_YELLOW, padding: "2px 6px", alignSelf: "flex-start" };
  const popBase = { position: "fixed", zIndex: 99999, padding: "16px", display: "flex", flexDirection: "column", gap: "14px", border: `3px solid ${dark ? "#fff" : "#000"}`, background: dark ? "#2e2e2e" : "#f0f0f0", backgroundImage: dark ? "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)" : "linear-gradient(rgba(0,0,0,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.09) 1px, transparent 1px)", backgroundSize: "20px 20px", boxShadow: `5px 5px 0 0 ${dark ? "rgba(255,255,255,0.3)" : "#000"}` };

  const wrapperClass = `${entering === 'home' ? "sh-entering" : ""} ${entering === 'editor' ? "sh-entering-from-editor" : ""} ${exitingTo ? "sh-exiting-to-" + exitingTo : ""}`;

  return (
    <div className={wrapperClass} style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative", zIndex: 10, overflow: "hidden" }}>
      <style>{LOCAL_CSS}</style>

      <div style={{ padding: "32px 48px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, position: "relative", zIndex: 10 }}>
        {/* 恢復這裡的標題運算，不套用 CSS 動畫 */}
        <h1 ref={titleRef} onClick={onBack} className="cursor-pointer"
          style={{ 
            fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: "clamp(20px, 3vw, 40px)", lineHeight: 0.85, 
            letterSpacing: "-0.04em", textTransform: "uppercase", color: dark ? "#fff" : "#000", margin: 0
          }}
          onMouseEnter={e => { if(!exitingTo) e.currentTarget.style.opacity = "0.6" }}
          onMouseLeave={e => { if(!exitingTo) e.currentTarget.style.opacity = "1" }}
        >
          STRATEGIC<br /><span style={{ color: ACCENT_BLUE }}>OGSM</span><br />PLANNER.
        </h1>

        <div className="sh-controls-anim" style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {(query || isFiltering) && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ fontSize: "43px", fontWeight: 900, fontStyle: "italic", fontFamily: '"Space Grotesk", sans-serif', lineHeight: 1, letterSpacing: "-0.04em", color: dark ? "#fff" : "#000" }}>{sorted.length}<span style={{ fontSize: "18px", fontStyle: "normal", marginLeft: "3px", opacity: 0.4 }}>/ {projects.length}</span></span>
              <span style={{ fontSize: "12px", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.45, color: dark ? "#fff" : "#000" }}>個專案</span>
            </div>
          )}
          <div style={{ position: "relative", display: "flex", alignItems: "center", border: `4px solid ${query ? ACCENT_BLUE : searchFocused ? ACCENT_BLUE : (dark ? "rgba(255,255,255,0.3)" : "#000")}`, boxShadow: query ? `3px 3px 0 ${ACCENT_BLUE}, 0 0 0 2px rgba(0,0,255,0.15)` : searchFocused ? `3px 3px 0 ${ACCENT_BLUE}` : `3px 3px 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`, background: query ? (dark ? "rgba(0,0,60,0.5)" : "rgba(230,230,255,0.6)") : (dark ? "rgba(59,59,59,0.8)" : "#fff"), transition: "all 0.2s ease" }} onMouseEnter={e => { if(!query && !searchFocused){ e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = `6px 6px 0 ${dark ? "rgba(255,255,255,0.2)" : "#000"}`; } }} onMouseLeave={e => { if(!query && !searchFocused){ e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `3px 3px 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`; } }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={query ? ACCENT_BLUE : (dark ? "#fff" : "#000")} strokeWidth="3" style={{ position: "absolute", left: "12px", opacity: query ? 1 : 0.4, pointerEvents: "none", transition: "all 0.2s", transform: query ? "scale(1.15)" : "scale(1)" }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} placeholder="搜尋專案..." style={{ background: "transparent", border: "none", fontSize: "13px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, paddingLeft: "40px", paddingRight: query ? "4px" : "16px", paddingTop: "10px", paddingBottom: "10px", width: "200px", color: dark ? "#fff" : "#000", outline: "none" }} />
            {query && (
              <button onClick={() => setQuery("")} title="清除搜尋" style={{ flexShrink: 0, marginRight: "8px", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", background: dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)", border: "none", cursor: "pointer", color: dark ? "#fff" : "#000", fontSize: "14px", fontWeight: 900, lineHeight: 1, padding: 0, transition: "background 0.15s, color 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = "#FF00FF"; e.currentTarget.style.color = "#fff"; }} onMouseLeave={e => { e.currentTarget.style.background = dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"; e.currentTarget.style.color = dark ? "#fff" : "#000"; }}>✕</button>
            )}
          </div>
          <button ref={filterBtnRef} onClick={() => setShowFilter(v => !v)} style={btnStyle(isFiltering, filterHovered)} title="篩選" onMouseEnter={e => { setFilterHovered(true); e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? "rgba(255,255,255,0.2)" : "#000"}`; }} onMouseLeave={e => { setFilterHovered(false); e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `3px 3px 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`; }} onMouseDown={e => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = `2px 2px 0 0 ${dark ? "rgba(255,255,255,0.2)" : "#000"}`; }} onMouseUp={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? "rgba(255,255,255,0.2)" : "#000"}`; }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          </button>
          <button ref={sortBtnRef} onClick={() => setShowSort(v => !v)} style={btnStyle(isSorted, sortHovered)} title="排序" onMouseEnter={e => { setSortHovered(true); e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? "rgba(255,255,255,0.2)" : "#000"}`; }} onMouseLeave={e => { setSortHovered(false); e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `3px 3px 0 ${dark ? "rgba(255,255,255,0.1)" : "#000"}`; }} onMouseDown={e => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = `2px 2px 0 0 ${dark ? "rgba(255,255,255,0.2)" : "#000"}`; }} onMouseUp={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? "rgba(255,255,255,0.2)" : "#000"}`; }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ transition: "transform 0.2s", transform: sortDir === "asc" ? "rotate(180deg)" : "rotate(0deg)" }}><path d="M12 5v14m-7-7l7-7 7 7"/></svg>
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="sh-grid-anim" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" }}>
          <div style={{ fontSize: "120px", fontWeight: 900, fontStyle: "italic", fontFamily: '"Space Grotesk", sans-serif', lineHeight: 1, letterSpacing: "-0.04em", color: dark ? "rgba(255,255,255,0.5)" : "rgba(0, 0, 0, 0.6)" }}>0</div>
          <span style={{ fontSize: "28px", fontWeight: 900, fontFamily: '"Space Grotesk", sans-serif', textTransform: "uppercase", letterSpacing: "0.06em", color: dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)" }}>找不到符合的專案</span>
          <span style={{ fontSize: "18px", fontWeight: 700, color: dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)" }}>請嘗試調整搜尋條件或篩選範圍</span>
        </div>
      ) : (
        <div ref={gridRef} className="custom-scrollbar sh-grid-anim" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "20px 24px 48px" }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, ${cardSize}px)`, justifyContent: "center", columnGap: "32px", rowGap: "40px" }}>
            {sorted.map((p, i) => <ProjectCard key={`${animationKey}-${p.id}`} project={p} onSelect={onSelect} onDelete={onDeleteProject} dark={dark} index={i} size={cardSize} />)}
            {!query && !isFiltering && <NewProjectCard onNewProject={onNewProject} dark={dark} index={sorted.length} size={cardSize} />}
          </div>
        </div>
      )}

      <div className="sh-grid-anim" style={{ position: "absolute", bottom: "24px", right: "40px", zIndex: 10 }}>
        <button onClick={onToggleDark}
          style={{ width: "96px", height: "40px", borderRadius: "999px", background: dark ? "#4a4a4a" : "#b0b0b0", border: `2px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.15)"}`, boxShadow: `4px 4px 0 0 ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.25)"}`, display: "flex", alignItems: "center", position: "relative", cursor: "pointer", padding: "0", transition: "all 0.3s ease", overflow: "hidden" }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.4)"}`; }} onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `4px 4px 0 0 ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.25)"}`; }} onMouseDown={e => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = `2px 2px 0 0 ${dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.4)"}`; }} onMouseUp={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.4)"}`; }} title="切換主題"
        >
          <div style={{ width: "100%", display: "flex", justifyContent: dark ? "flex-end" : "flex-start", padding: dark ? "0 12px 0 0" : "0 0 0 12px", boxSizing: "border-box" }}>
            <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: "12px", letterSpacing: "0.05em", color: dark ? "#fff" : "#787878", transition: "all 0.3s ease" }}>{dark ? "DARK" : "LIGHT"}</span>
          </div>
          <div style={{ position: "absolute", top: "2px", left: dark ? "3px" : "calc(100% - 30px)", width: "32px", height: "32px", borderRadius: "50%", background: dark ? "#fff" : "#e8e8e8", display: "flex", alignItems: "center", justifyContent: "center", transition: "left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
            {dark ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a4a4a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#909090" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>}
          </div>
        </button>
      </div>
      
      {showFilter && createPortal(<div ref={filterPopRef} style={{ ...popBase, top: filterPos.top, left: filterPos.left, width: "fit-content" }}><div style={{ display: "flex", flexDirection: "column", gap: "8px" }}><div style={{ display: "flex", flexDirection: "column", gap: "6px" }}><div style={labelStyle}>專案狀態</div><div style={{ display: "flex", gap: "12px" }}>{[["inProgress", "進行中"], ["overdue", "已逾期"], ["done", "已完成"]].map(([val, label]) => { const checked = statusFilters.has(val); return (<label key={val} onClick={() => toggleStatus(val)} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: dark ? "#fff" : "#000", userSelect: "none", whiteSpace: "nowrap" }}><div style={{ width: "14px", height: "14px", border: `2px solid ${checked ? "#0000FF" : (dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)")}`, background: checked ? "#0000FF" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{checked && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}</div>{label}</label>); })}</div></div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={labelStyle}>完成進度</div><div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <input
                      type="text" inputMode="numeric" value={progMinInput}
                      onChange={e => { const v = e.target.value; if (v === "" || (/^\d+$/.test(v) && Number(v) <= 100)) setProgMinInput(v); }}
                      onKeyDown={e => { if (e.key === "Enter") { const v = Math.min(Math.max(0, Number(progMinInput)), progMax); setProgMin(v); setProgMinInput(String(v)); e.target.blur(); } }}
                      onBlur={() => { const v = Math.min(Math.max(0, Number(progMinInput)), progMax); setProgMin(v); setProgMinInput(String(v)); }}
                      style={{ width: "42px", fontSize: "12px", fontFamily: "monospace", fontWeight: 700, background: "transparent", border: "none", borderBottom: `2px solid ${dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}`, color: dark ? "#fff" : "#000", outline: "none", textAlign: "center", padding: "0 2px" }}
                    />
                    <span style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: 700, color: dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>%–</span>
                    <input
                      type="text" inputMode="numeric" value={progMaxInput}
                      onChange={e => { const v = e.target.value; if (v === "" || (/^\d+$/.test(v) && Number(v) <= 100)) setProgMaxInput(v); }}
                      onKeyDown={e => { if (e.key === "Enter") { const v = Math.max(Math.min(100, Number(progMaxInput)), progMin); setProgMax(v); setProgMaxInput(String(v)); e.target.blur(); } }}
                      onBlur={() => { const v = Math.max(Math.min(100, Number(progMaxInput)), progMin); setProgMax(v); setProgMaxInput(String(v)); }}
                      style={{ width: "42px", fontSize: "12px", fontFamily: "monospace", fontWeight: 700, background: "transparent", border: "none", borderBottom: `2px solid ${dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}`, color: dark ? "#fff" : "#000", outline: "none", textAlign: "center", padding: "0 2px" }}
                    />
                    <span style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: 700, color: dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>%</span>
                  </div></div><div style={{ position: "relative", height: "20px", marginTop: "4px", display: "flex", alignItems: "center" }}><div style={{ position: "absolute", width: "100%", height: "4px", background: dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)" }} /><div style={{ position: "absolute", height: "4px", background: ACCENT_BLUE, pointerEvents: "none", left: `${progMin}%`, width: `${progMax - progMin}%` }} /><div ref={sliderContainerRef} onMouseDown={onSliderMouseDown}
                        style={{ position: "absolute", width: "100%", height: "20px", cursor: "pointer", top: 0 }}>
                        <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: `${progMin}%`, width: "14px", height: "14px", background: ACCENT_BLUE, border: "2px solid #fff", boxShadow: "2px 2px 0 #000", marginLeft: "-7px", boxSizing: "border-box", zIndex: 5, cursor: "ew-resize" }} />
                        <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: `${progMax}%`, width: "14px", height: "14px", background: ACCENT_BLUE, border: "2px solid #fff", boxShadow: "2px 2px 0 #000", marginLeft: "-7px", boxSizing: "border-box", zIndex: 5, cursor: "ew-resize" }} />
                      </div></div></div><div style={{ display: "flex", flexDirection: "column", gap: "6px" }}><div style={labelStyle}>建立日期</div><input type="date" className="sh-date" value={dateFrom} max={dateTo || undefined} onChange={e => { const v = e.target.value; if (dateTo && v > dateTo) return; setDateFrom(v); }} style={{ width: "100%", fontSize: "12px", padding: "8px", border: `2px solid ${dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`, outline: "none", fontFamily: "monospace", background: dark ? "#2b2b2b" : "#f9fafb", color: dark ? "#fff" : "#000", colorScheme: dark ? "dark" : "light" }} /><input type="date" className="sh-date" value={dateTo} onChange={e => { const v = e.target.value; setDateTo(!v ? "" : (dateFrom && v < dateFrom ? dateFrom : v)); }} style={{ width: "100%", fontSize: "12px", padding: "8px", border: `2px solid ${dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`, outline: "none", fontFamily: "monospace", background: dark ? "#2b2b2b" : "#f9fafb", color: dark ? "#fff" : "#000", colorScheme: dark ? "dark" : "light" }} /></div><div style={{ display: "flex", flexDirection: "column", gap: "6px" }}><div style={labelStyle}>期限日期</div><input type="date" className="sh-date" value={deadlineFrom} max={deadlineTo || undefined} onChange={e => { const v = e.target.value; if (deadlineTo && v > deadlineTo) return; setDeadlineFrom(v); }} style={{ width: "100%", fontSize: "12px", padding: "8px", border: `2px solid ${dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`, outline: "none", fontFamily: "monospace", background: dark ? "#2b2b2b" : "#f9fafb", color: dark ? "#fff" : "#000", colorScheme: dark ? "dark" : "light" }} /><input type="date" className="sh-date" value={deadlineTo} onChange={e => { const v = e.target.value; setDeadlineTo(!v ? "" : (deadlineFrom && v < deadlineFrom ? deadlineFrom : v)); }} style={{ width: "100%", fontSize: "12px", padding: "8px", border: `2px solid ${dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`, outline: "none", fontFamily: "monospace", background: dark ? "#2b2b2b" : "#f9fafb", color: dark ? "#fff" : "#000", colorScheme: dark ? "dark" : "light" }} /></div>{isFiltering && (<button onClick={() => { setProgMin(0); setProgMax(100); setDateFrom(""); setDateTo(""); setDeadlineFrom(""); setDeadlineTo(""); setStatusFilters(new Set()); setProgMinInput("0"); setProgMaxInput("100"); }} style={{ alignSelf: "flex-start", fontSize: "11px", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", padding: "6px 12px", border: "2px solid rgba(255,0,255,0.4)", background: "transparent", color: ACCENT_PINK, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = ACCENT_PINK; e.currentTarget.style.color = "#000"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = ACCENT_PINK; }}>清除篩選</button>)}</div>, document.body)}
      {showSort && createPortal(<div ref={sortPopRef} style={{ ...popBase, top: sortPos.top, left: sortPos.left, width: "152px", gap: "10px" }}><div style={labelStyle}>排序依據</div><div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "4px" }}>{[["time", "建立時間"], ["deadline", "期限日期"], ["progress", "完成進度"]].map(([val, label]) => (<button key={val} onClick={() => setSortBy(val)} style={{ textAlign: "left", fontSize: "12px", fontWeight: 700, padding: "6px 10px", border: "2px solid", borderColor: sortBy === val ? "#000" : "transparent", background: sortBy === val ? ACCENT_YELLOW : "transparent", color: sortBy === val ? "#000" : (dark ? "#fff" : "#000"), cursor: "pointer" }}>{label}</button>))}</div><div style={labelStyle}>方向</div><div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>{[["desc", sortBy === "progress" ? "高→低" : sortBy === "deadline" ? "最遠優先" : "最新優先"], ["asc", sortBy === "progress" ? "低→高" : sortBy === "deadline" ? "最近優先" : "最舊優先"]].map(([val, label]) => (<button key={val} onClick={() => setSortDir(val)} style={{ textAlign: "left", fontSize: "12px", fontWeight: 700, padding: "6px 10px", border: "2px solid", borderColor: sortDir === val ? "#000" : "transparent", background: sortDir === val ? ACCENT_YELLOW : "transparent", color: sortDir === val ? "#000" : (dark ? "#fff" : "#000"), cursor: "pointer" }}>{label}</button>))}</div></div>, document.body)}
    </div>
  );
}