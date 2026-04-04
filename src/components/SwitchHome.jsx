import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { calcProgress } from './ProjectList.jsx';
import MpCalendarPanel from './MpCalendarPanel.jsx';

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
  .top-drawer-container { 
    width: 600px;
    max-width: 90vw;
    margin: 0 auto;
    max-height: 0;
    overflow: hidden;
    transition: max-height 1s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.8s ease;
    border-radius: 0 0 16px 16px;
  }
  .top-drawer-container.is-open {
    max-height: 300px;
  }
  .top-drawer-inner { 
    display: flex; flex-direction: column; justify-content: flex-end; 
    padding-bottom: 40px; /* 給陰影空間，避免被 overflow hidden 裁切 */
    margin-bottom: -40px; /* 抵銷 padding，讓原本版面不被影響 */
  }
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
  const [clampCount, setClampCount] = useState(Infinity);
  const displayRef = useRef(null);
  const pct = calcProgress(project);
  const today = (() => { const _n = new Date(); return `${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}-${String(_n.getDate()).padStart(2,'0')}` })();
  const isOverdue = project.deadline && project.deadline < today && pct < 100;
  const isDone = pct >= 100;

  const assignees = Array.isArray(project.assignees) ? project.assignees : [];
  const assigneesKey = assignees.join('\x00');
  const hasBadge = isDone || isOverdue;
  const showMore = isFinite(clampCount) && clampCount < assignees.length;
  const displayAssignees = showMore ? assignees.slice(0, clampCount) : assignees;

  // Reset clamp whenever the things that affect layout change
  useLayoutEffect(() => {
    setClampCount(Infinity);
  }, [assigneesKey, size, hasBadge]);

  // Measure the visible container only when showing all tags (clampCount === Infinity)
  useLayoutEffect(() => {
    if (isFinite(clampCount)) return; // already clamped — stable, skip
    const container = displayRef.current;
    if (!container) return;
    const kids = Array.from(container.children);
    if (!kids.length) return;

    let rafId;
    const measure = () => {
      const rowH = kids[0].offsetHeight;
      if (!rowH) { rafId = requestAnimationFrame(measure); return; }
      const maxBottom = rowH + 1; // 1 row + 1px tolerance
      const last = kids[kids.length - 1];
      if (last.offsetTop + last.offsetHeight <= maxBottom + 1) return; // all fit
      let fitCount = 0;
      for (const k of kids) {
        if (k.offsetTop + k.offsetHeight <= maxBottom + 1) fitCount++;
        else break;
      }
      setClampCount(Math.max(1, fitCount - 1)); // reserve 1 slot for '...'
    };
    measure();
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [clampCount]);

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
        boxShadow: hovered ? `${shadowOffset}px ${shadowOffset}px 0 0 ${dark ? "rgba(255,255,255,0.1)" : "rgba(0, 0, 0, 0.7)"}` : `8px 8px 0 0 ${dark ? "rgba(255,255,255,0.1)" : "rgba(0, 0, 0, 0.7)"}`,
        transform: hovered ? "translate(-6px,-6px)" : "translate(0,0)",
        transition: "all 0.15s ease",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: `${pad}px`, position: "relative",
        cursor: "pointer",
        animation: `waterfall 0.35s ${index * 0.06}s cubic-bezier(0.16, 1, 0.3, 1) both`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px", minWidth: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, flex: 1, overflow: "hidden" }}>
          {/* Assignee tags: measure directly on this container; position:relative makes it the offsetParent */}
          <div ref={displayRef} style={{ position: "relative", maxHeight: "23px", overflow: "hidden", display: "flex", flexWrap: "wrap", gap: "3px" }}>
              {assignees.length > 0 ? (
                <>
                  {displayAssignees.map(name => (
                    <div key={name} style={{ background: hovered ? "#000" : (dark ? "#fff" : "#000"), color: hovered ? ACCENT_YELLOW : (dark ? "#000" : "#fff"), fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: "0.1em", padding: "4px 8px", textTransform: "uppercase", whiteSpace: "nowrap" }}>{name}</div>
                  ))}
                  {showMore && (
                    <div style={{ color: hovered ? "#000" : (dark ? "#fff" : "#000"), fontSize: "11px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 1100, letterSpacing: "0.1em", padding: "4px 4px", textTransform: "uppercase", alignSelf: "center" }}>...</div>
                  )}
                </>
              ) : (
                <div style={{ background: hovered ? "#000" : (dark ? "#fff" : "#000"), color: hovered ? ACCENT_YELLOW : (dark ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)"), fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: "0.1em", padding: "4px 8px", textTransform: "uppercase" }}>全部</div>
              )}
          </div>

          <div style={{ fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: hovered ? "#000" : (dark ? "rgba(255, 255, 255, 0.75)" : "rgba(0,0,0,0.75)"), display: "flex", gap: "4px" }}>
            <span style={{ opacity: 0.8 }}>建立</span>{project.createdAt ? project.createdAt.slice(0, 10) : ""}
          </div>
        </div>
        {(isDone || isOverdue) && (
          <div style={{ fontSize: "9px", fontWeight: 900, padding: "4px 8px", background: isDone ? ACCENT_GREEN : ACCENT_PINK, color: "#000", textTransform: "uppercase", letterSpacing: "0.08em", border: "2px solid #000", flexShrink: 0 }}>{isDone ? "已完成" : "已逾期"}</div>
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

export default function ProjectsPage({ projects, onSelect, onNewProject, onDeleteProject, onBack, dark, onToggleDark, entering, exitingTo, onUpdateProject, onOpenMemberSettings, onOpenDashboard }) {
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
  const [cardSize, setCardSize]     = useState(() => {
    const GAP = 32, MIN = 160, MAX_COLS = 6;
    const w = Math.max(200, window.innerWidth - 48);
    const cols = Math.min(MAX_COLS, Math.max(1, Math.floor((w + GAP) / (MIN + GAP))));
    return Math.floor((w - (cols - 1) * GAP) / cols);
  });
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterHovered, setFilterHovered] = useState(false);
  const [sortHovered, setSortHovered]     = useState(false);
  const [memberHovered, setMemberHovered] = useState(false);
  const [showTopDrawer, setShowTopDrawer] = useState(false);

  // New states for Assignees filter
  const allMembers = React.useMemo(() => {
    const s = new Set();
    projects.forEach(p => {
      if (Array.isArray(p.assignees)) p.assignees.forEach(m => s.add(m));
    });
    return Array.from(s).sort();
  }, [projects]);
  const [memberFilters, setMemberFilters] = useState(new Set());
  const toggleMemberFilter = (m) => setMemberFilters(prev => {
    const n = new Set(prev);
    if (n.has(m)) {
      n.delete(m);
    } else {
      if (m === '__UNASSIGNED__') {
        n.clear();
      } else {
        n.delete('__UNASSIGNED__');
      }
      n.add(m);
    }
    return n;
  });
  const [assigneeConditions, setAssigneeConditions] = useState(new Set());
  const toggleAssigneeCondition = (val) => setAssigneeConditions(prev => {
    const n = new Set(prev); n.has(val) ? n.delete(val) : n.add(val); return n;
  });
  const [showMemberPop, setShowMemberPop] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  const memberPopTimer = useRef(null);
  const handleMemberEnter = () => {
    if (memberPopTimer.current) clearTimeout(memberPopTimer.current);
    setShowMemberPop(true);
  };
  const handleMemberLeave = () => {
    memberPopTimer.current = setTimeout(() => {
      setShowMemberPop(false);
    }, 100);
  };
  const sliderDragging    = useRef(null);
  const sliderContainerRef = useRef(null);
  const roRef    = useRef(null);
  const rafIdRef = useRef(null);
  const gridRef  = useCallback((el) => {
    // Disconnect previous observer if element unmounts
    if (roRef.current) { roRef.current.disconnect(); roRef.current = null; }
    if (rafIdRef.current) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; }
    if (!el) return;
    const GAP = 32, MIN = 160, MAX_COLS = 6;
    const calc = (w) => {
      const cols = Math.min(MAX_COLS, Math.max(1, Math.floor((w + GAP) / (MIN + GAP))));
      const size = Math.floor((w - (cols - 1) * GAP) / cols);
      setCardSize(prev => (prev === size ? prev : size));
    };
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = requestAnimationFrame(() => calc(e.contentRect.width));
      }
    });
    ro.observe(el);
    // clientWidth - padding matches ResizeObserver's contentRect.width (both exclude scrollbar)
    calc(el.clientWidth - 48);
    roRef.current = ro;
  }, []);
  const filterBtnRef = useRef(null);
  const filterPopRef = useRef(null);
  const sortBtnRef   = useRef(null);
  const sortPopRef   = useRef(null);
  const titleRef     = useRef(null);

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
        // 取 Editor 目標絕對位置：左距 24px，上距 16px (與 Editor App.jsx padding 一致)
        targetX = 24 - rect.left;
        targetY = 16 - rect.top;
        scale = shSize / currentFontSize;
      } else if (exitingTo === 'home') {
        // 放大的座標運算：對準 HomePage 的字型大小與快取座標
        const cachedRect = window.__OGSM_HOME_RECT__ ?? (() => { try { const s = sessionStorage.getItem('__OGSM_HOME_RECT__'); return s ? JSON.parse(s) : null; } catch { return null; } })();
        const cachedSize = window.__OGSM_HOME_SIZE__ ?? (() => { try { const s = sessionStorage.getItem('__OGSM_HOME_SIZE__'); return s ? parseFloat(s) : null; } catch { return null; } })();
        // HomePage: container padding-left 64px + .hp-title marginLeft 64px = 128px total
        const hpFS = Math.min(100, Math.max(80, vw * 0.1));
        const exactLeft = cachedRect?.left ?? (Math.max(0, (vw - 1400) / 2) + 128);
        const exactTop  = cachedRect?.top  ?? Math.max(0, (vh - 64 - hpFS * 2.55 - 200) / 2);
        targetX = exactLeft - rect.left;
        targetY = exactTop - rect.top;
        const homeSize = cachedSize ?? hpFS;
        scale = homeSize / currentFontSize;
      }

      el.style.transformOrigin = "top left";
      
      requestAnimationFrame(() => {
        el.style.transition = "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.45s ease";
        el.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) scale(${scale})`;
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
    if (memberFilters.size > 0) {
      const pAssignees = Array.isArray(p.assignees) ? p.assignees : [];
      if (pAssignees.length > 0 && !pAssignees.some(m => memberFilters.has(m))) return false;
    }
    if (assigneeConditions.size > 0) {
      const pAssignees = Array.isArray(p.assignees) ? p.assignees : [];
      const cnt = pAssignees.length;
      if (assigneeConditions.has('excludeUnassigned') && cnt === 0) return false;
      const hasSingle = assigneeConditions.has('single');
      const hasMultiple = assigneeConditions.has('multiple');
      if (hasSingle || hasMultiple) {
        if (!(hasSingle && cnt === 1) && !(hasMultiple && cnt >= 2)) return false;
      }
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

      {/* Header 區塊：主列固定，抽屜+按鈕浮空疊在 grid 上 */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 10 }}>

        {/* 主列： logo + controls */}
        <div style={{ padding: "32px 48px 20px", display: "flex", alignItems: "center", position: "relative" }}>
        {/* 獨立的標題，避免右側元素消失時牽連排版 */}
        <h1 ref={titleRef} onClick={onBack} className="cursor-pointer"
          style={{
            fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: "clamp(20px, 3vw, 40px)", lineHeight: 0.9, 
            letterSpacing: "-0.02em", textTransform: "uppercase", color: dark ? "#fff" : "#000", margin: 0, padding: 0, cursor: 'pointer',
            transformOrigin: 'top left', transform: 'translateZ(0)', backfaceVisibility: 'hidden', willChange: 'transform, opacity',
            WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale',
            flexShrink: 0, marginRight: "80px"
          }}
          onMouseEnter={e => { if(!exitingTo) e.currentTarget.style.opacity = "0.6" }}
          onMouseLeave={e => { if(!exitingTo) e.currentTarget.style.opacity = "1" }}
        >
          <img src={dark ? "/logo_dark.svg" : "/logo_sun.svg"} alt="STRATEGIC OGSM PLANNER." style={{ height: "3em", width: 'auto', display: 'block' }} draggable={false} />
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", opacity: exitingTo ? 0 : 1, pointerEvents: exitingTo ? 'none' : 'auto', transition: 'opacity 0.2s', flex: 1 }}>
            <div style={{ position: "relative" }} onMouseEnter={handleMemberEnter} onMouseLeave={handleMemberLeave}>
              <button 
                style={{ 
                  background: (memberFilters.size > 0 || assigneeConditions.size > 0) ? ACCENT_BLUE : (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"),
                  color: (memberFilters.size > 0 || assigneeConditions.size > 0) ? "#fff" : (dark ? "#fff" : "#000"),
                  border: `2px solid ${(memberFilters.size > 0 || assigneeConditions.size > 0) ? ACCENT_BLUE : "transparent"}`,
                  backdropFilter: "blur(4px)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "8px",
                  borderRadius: "50%",
                  transition: "all 0.2s ease",
                  transform: memberHovered ? "scale(1.15)" : "scale(1)"
                }}
                onMouseEnter={() => setMemberHovered(true)}
                onMouseLeave={() => setMemberHovered(false)}
                title="依人員篩選專案"
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
{(memberFilters.size + assigneeConditions.size) > 0 && (
                  <div style={{ position: "absolute", top: 0, right: 0, minWidth: "26px", height: "26px", background: ACCENT_PINK, color: "#000", borderRadius: "13px", border: `2px solid ${dark ? "#2e2e2e" : "#f0f0f0"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 900, padding: "0 4px", boxShadow: "2px 2px 0 rgba(0,0,0,0.2)" }}>
                    {memberFilters.size + assigneeConditions.size}
                  </div>
                )}
              </button>
              {showMemberPop && (
                <div style={{ ...popBase, position: "absolute", top: "87%", left: "190%", transform: "translateX(-50%)", marginTop: "16px", width: "240px", padding: "12px", zIndex: 100000, cursor: "default", opacity: exitingTo ? 0 : 1, pointerEvents: exitingTo ? 'none' : 'auto', transition: "opacity 0.2s" }}>
                  <div style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", alignSelf: "flex-start" }}>依所有人篩選 (多選)</div>
                  
                  <div style={{ position: "relative", marginBottom: "1px" }}>
                    <input 
                      type="text" 
                      placeholder="搜尋人員..." 
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px",
                        paddingRight: "28px",
                        borderRadius: "4px",
                        border: `1px solid ${dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`,
                        background: dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.5)",
                        backdropFilter: "blur(3px)",
                        WebkitBackdropFilter: "blur(3px)",
                        color: dark ? "#fff" : "#000",
                        outline: "none",
                        fontSize: "12px",
                        fontFamily: "inherit"
                      }}
                    />
                    {memberSearchQuery && (
                      <div 
                        onClick={() => setMemberSearchQuery("")}
                        style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}
                        title="清除搜尋"
                        onMouseEnter={e => e.currentTarget.style.color = dark ? "#fff" : "#000"}
                        onMouseLeave={e => e.currentTarget.style.color = dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </div>
                    )}
                  </div>

                  <div className="custom-scrollbar" style={{ display: "flex", flexDirection: "column", gap: "4px", height: "240px", overflowY: "auto", paddingRight: "4px", paddingTop: "8px", borderTop: `2px solid ${dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.3)"}` }}>
                    <div onClick={() => setMemberFilters(new Set())} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", cursor: "pointer", background: memberFilters.size === 0 ? (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)") : "transparent", flexShrink: 0 }} onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)"} onMouseLeave={e => e.currentTarget.style.background = memberFilters.size === 0 ? (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)") : "transparent"}>
                      <span style={{ width: "14px", height: "14px", border: `2px solid ${dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {memberFilters.size === 0 && <span style={{ width: "8px", height: "8px", background: dark ? "#fff" : "#000" }} />}
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: dark ? "#fff" : "#000" }}>全部人員</span>
                    </div>

                    {(!memberSearchQuery || "全部 (未設定)".includes(memberSearchQuery)) && (
                      <div onClick={() => toggleMemberFilter('__UNASSIGNED__')} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", cursor: "pointer", background: memberFilters.has('__UNASSIGNED__') ? (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)") : "transparent", flexShrink: 0 }} onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)"} onMouseLeave={e => e.currentTarget.style.background = memberFilters.has('__UNASSIGNED__') ? (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)") : "transparent"}>
                        <span style={{ width: "14px", height: "14px", border: `2px solid ${dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {memberFilters.has('__UNASSIGNED__') && <span style={{ width: "8px", height: "8px", background: ACCENT_BLUE }} />}
                        </span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: dark ? "#fff" : "#000" }}>全部 (未設定)</span>
                      </div>
                    )}

                    {allMembers.filter(m => m.toLowerCase().includes(memberSearchQuery.toLowerCase())).map(m => (
                      <div key={m} onClick={() => toggleMemberFilter(m)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", cursor: "pointer", background: memberFilters.has(m) ? (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)") : "transparent", flexShrink: 0 }} onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)"} onMouseLeave={e => e.currentTarget.style.background = memberFilters.has(m) ? (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)") : "transparent"}>
                        <span style={{ width: "14px", height: "14px", border: `2px solid ${dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {memberFilters.has(m) && <span style={{ width: "8px", height: "8px", background: ACCENT_BLUE }} />}
                        </span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: dark ? "#fff" : "#000" }}>{m}</span>
                      </div>
                    ))}
                  </div>

                  {/* ─ Assignee-count conditions ─ */}
                  <div style={{ borderTop: `2px solid ${dark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)"}`, paddingTop: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
                    <div style={{ fontSize: "9px", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)", padding: "2px 8px 4px" }}>數量條件（可多選）</div>
                    {[['single', '只限單一所有人'], ['multiple', '多人以上'], ['excludeUnassigned', '排除全部 (未設定)']].map(([val, label]) => (
                      <div key={val} onClick={() => toggleAssigneeCondition(val)}
                        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", cursor: "pointer", background: assigneeConditions.has(val) ? (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)") : "transparent", flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)"}
                        onMouseLeave={e => e.currentTarget.style.background = assigneeConditions.has(val) ? (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)") : "transparent"}
                      >
                        <span style={{ width: "14px", height: "14px", border: `2px solid ${assigneeConditions.has(val) ? ACCENT_YELLOW : (dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)")}`, background: assigneeConditions.has(val) ? ACCENT_YELLOW : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {assigneeConditions.has(val) && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                        </span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: dark ? "#fff" : "#000" }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <MpCalendarPanel projects={sorted} dark={dark} onUpdateProject={onUpdateProject} />
          </div>

        <div style={{ flex: 1 }} />

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

        {/* 浮空層：從 header 頂端開始，滑鼠 Hover 時展開，離開時收起 */}
        <div 
          onMouseLeave={() => setShowTopDrawer(false)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none', opacity: exitingTo ? 0 : 1, transition: 'opacity 0.2s' }}
        >
          <div className={`top-drawer-container ${showTopDrawer ? 'is-open' : ''}`} style={{
            opacity: showTopDrawer ? 1 : 0,
            pointerEvents: showTopDrawer ? 'auto' : 'none'
          }}>
            <div className="top-drawer-inner">
              <div className="top-drawer-panel" style={{
                width: '100%',
                minHeight: '120px',
                padding: '32px 32px',
                borderLeft: `2px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                borderRight: `2px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                borderBottom: `2px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                borderRadius: '0 0 16px 16px',
                background: dark ? 'rgba(18,18,18,0.97)' : 'rgba(248,248,248,0.97)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                boxShadow: dark ? '0 16px 48px rgba(0,0,0,0.6)' : '0 16px 48px rgba(0,0,0,0.12)',
                display: 'flex', gap: '24px', flexWrap: 'wrap',
                pointerEvents: 'auto'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <button 
                    onClick={() => { setShowTopDrawer(false); if (onOpenMemberSettings) onOpenMemberSettings(); }}
                    style={{
                      width: '64px', height: '64px',
                      borderRadius: '16px',
                      background: `linear-gradient(135deg, ${ACCENT_BLUE}, #3B5BDB)`,
                      border: `2px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.8)'}`,
                      boxShadow: '0 6px 16px rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.2)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', padding: 0,
                      transition: 'transform 0.1s, box-shadow 0.1s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)'; e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.2)'; }}
                    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.1)'; }}
                    onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)'; e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.2)'; }}
                    title="人員管理設定"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="15" r="3" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M10 15H6a4 4 0 0 0-4 4v2" />
                      <path d="m21.7 16.4-.9-.3" />
                      <path d="m15.2 13.9-.9-.3" />
                      <path d="m16.6 18.7.3-.9" />
                      <path d="m19.1 12.2.3-.9" />
                      <path d="m19.6 18.7-.4-1" />
                      <path d="m16.8 12.3-.4-1" />
                      <path d="m14.3 16.6 1-.4" />
                      <path d="m20.7 13.8 1-.4" />
                    </svg>
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontFamily: '"Space Grotesk", sans-serif' }}>
                    人員管理
                  </span>
                </div>

                {/* Dashboard */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => { setShowTopDrawer(false); if (onOpenDashboard) onOpenDashboard(); }}
                    style={{
                      width: '64px', height: '64px',
                      borderRadius: '16px',
                      background: `linear-gradient(135deg, #b7b700, #8a8a00)`,
                      border: `2px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.8)'}`,
                      boxShadow: '0 6px 16px rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.2)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', padding: 0,
                      transition: 'transform 0.1s, box-shadow 0.1s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)'; e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.2)'; }}
                    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.1)'; }}
                    onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)'; e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.2)'; }}
                    title="統計儀表板"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1"/>
                      <rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="14" y="14" width="7" height="7" rx="1"/>
                      <rect x="3" y="14" width="7" height="7" rx="1"/>
                    </svg>
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontFamily: '"Space Grotesk", sans-serif' }}>
                    儀表板
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button
            onMouseEnter={() => setShowTopDrawer(true)}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = dark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.1)'; }}
            onMouseDown={e => { e.currentTarget.style.boxShadow = 'none'; }}
            onMouseUp={e => { e.currentTarget.style.boxShadow = dark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.1)'; }}
            style={{
              pointerEvents: 'auto',
              width: '48px', height: '16px',
              background: showTopDrawer ? ACCENT_BLUE : (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'),
              border: `2px solid ${showTopDrawer ? ACCENT_BLUE : (dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)')}`,
              borderTop: 'none', borderRadius: '0 0 24px 24px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: showTopDrawer ? '#fff' : (dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)'),
              transition: 'background 0.2s, border-color 0.2s, transform 0.12s ease, box-shadow 0.12s ease', padding: 0,
              boxShadow: dark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.1)',
            }}
            title={showTopDrawer ? '收起' : '展開'}
          >
            <svg width="12" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: 'transform 0.35s cubic-bezier(0.34, 1.18, 0.64, 1)', transform: showTopDrawer ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
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
          style={{ width: "96px", height: "40px", borderRadius: "999px", background: dark ? "#222222" : "#e4e4e4", border: `2px solid ${dark ? "#b7b6b6" : "#000"}`, boxShadow: `4px 4px 0 0 ${dark ? "#b7b6b6" : "#000"}`, display: "flex", alignItems: "center", position: "relative", cursor: "pointer", padding: "0", transition: "all 0.3s ease", overflow: "hidden" }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? "#b7b6b6" : "#000"}`; }} onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `4px 4px 0 0 ${dark ? "#b7b6b6" : "#000"}`; }} onMouseDown={e => { e.currentTarget.style.transform = "translate(2px,2px)"; e.currentTarget.style.boxShadow = `2px 2px 0 0 ${dark ? "#b7b6b6" : "#000"}`; }} onMouseUp={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? "#b7b6b6" : "#000"}`; }} title="切換主題"
        >
          <div style={{ width: "100%", display: "flex", justifyContent: dark ? "flex-end" : "flex-start", padding: dark ? "0 12px 0 0" : "0 0 0 12px", boxSizing: "border-box" }}>
            <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: "12px", letterSpacing: "0.05em", color: dark ? "#fff" : "#464646", transition: "all 0.3s ease" }}>{dark ? "DARK" : "LIGHT"}</span>
          </div>
          <div style={{ position: "absolute", top: "2px", left: dark ? "calc(0% - 3px)" : "calc(100% - 30px)", width: "32px", height: "32px", borderRadius: "50%", background: dark ? "#fff" : "#e8e8e8", display: "flex", alignItems: "center", justifyContent: "center", transition: "left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
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