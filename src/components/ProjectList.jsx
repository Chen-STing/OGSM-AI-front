import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Filter, 
  Clock, 
  ChevronRight, 
  Trash2, 
  Layout,
  Search,
  Lock
} from 'lucide-react';
import { SetPasswordModal, RemoveLockModal, PasswordGateModal } from './LockModals.jsx';

export function calcProgress(project) {
  const measures = (project.goals || []).flatMap(g =>
    (g.strategies || []).flatMap(s => s.measures || [])
  );
  if (!measures.length) return 0;
  return Math.round(measures.reduce((sum, m) => sum + (m.progress || 0), 0) / measures.length);
}

function formatTaiwanDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

const CURSOR_HAND = "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"0 0 32 32\"><path d=\"M14 6 v10 h8 v12 h-16 v-16 h4 v-6 z\" fill=\"%23000000\" /><path d=\"M10 2 v10 h8 v12 h-16 v-16 h4 v-6 z\" fill=\"%23FF00FF\" stroke=\"%23FFFFFF\" stroke-width=\"2.5\" stroke-linejoin=\"miter\" /></svg>') 10 2, pointer";

const LOCAL_CSS = `
  .p-range::-webkit-slider-thumb {
    -webkit-appearance: none; width: 14px; height: 14px; border-radius: 0; background: #0000FF; border: 2px solid #fff; position: relative; z-index: 10; box-shadow: 2px 2px 0 #000;
    cursor: ${CURSOR_HAND};
  }
  .p-range::-moz-range-thumb {
    width: 14px; height: 14px; border-radius: 0; background: #0000FF; border: 2px solid #fff; z-index: 10; box-shadow: 2px 2px 0 #000;
    cursor: ${CURSOR_HAND};
  }
  .p-date::-webkit-calendar-picker-indicator {
    cursor: ${CURSOR_HAND};
  }
  .p-item { transition: background 0.15s; }
  .p-item:hover { background: rgba(0,0,0,0.03); }
  .dark .p-item:hover { background: rgba(255,255,255,0.03); }
  .p-delete { opacity: 0; transition: opacity 0.2s, color 0.15s; }
  .p-item:hover .p-delete { opacity: 0.6; }
  .p-delete:hover { opacity: 1 !important; color: #FF00FF !important; }
  .p-page-btn { transition: border-color 0.1s, color 0.1s, background 0.1s; }
  .p-page-btn:not(.active):hover { border-color: rgba(0,0,200,0.5) !important; color: rgba(0,0,200,0.8) !important; }
  .dark .p-page-btn:not(.active):hover { border-color: rgba(120,140,255,0.6) !important; color: rgba(120,140,255,0.9) !important; }
  .p-page-btn.active { pointer-events: none; }
`;

export default function ProjectList({ projects, loading, activeId, onSelect, onDelete, onManage, darkMode = true, onPatchProject, showToast }) {
  const [query, setQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const [statusFilters, setStatusFilters] = useState(new Set());
  const toggleStatus = (val) => setStatusFilters(prev => { const n = new Set(prev); n.has(val) ? n.delete(val) : n.add(val); return n; });
  const [lockFilters, setLockFilters] = useState(new Set());
  const toggleLockStatus = (val) => setLockFilters(prev => {
    const n = new Set(prev);
    if (n.has(val)) {
      n.delete(val);
      return n;
    }
    const other = val === 'locked' ? 'unlocked' : 'locked';
    if (n.has(other)) {
      // If both would be selected, clear both.
      n.delete(other);
      return n;
    }
    n.add(val);
    return n;
  });
  const [progMin, setProgMin] = useState(0);
  const [progMax, setProgMax] = useState(100);
  const [progMinInput, setProgMinInput] = useState('0');
  const [progMaxInput, setProgMaxInput] = useState('100');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deadlineFrom, setDeadlineFrom] = useState('');
  const [deadlineTo, setDeadlineTo] = useState('');
  const [showSort, setShowSort] = useState(false);
  const [sortBy, setSortBy] = useState('time');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const [confirmId, setConfirmId] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterHovered, setFilterHovered] = useState(false);

  // ── 密碼保護狀態 ──
  const unlockedIdsRef = useRef(new Set());
  const [ctxMenu, setCtxMenu] = useState(null); // { x, y, project }
  const ctxMenuRef = useRef(null);
  const [lockModal, setLockModal] = useState(null);
  const [removeLockModal, setRemoveLockModal] = useState(null);
  const [gateModal, setGateModal] = useState(null); // { project, pendingAction }
  const [localToast, setLocalToast] = useState(null);

  const showLocalToast = useCallback((msg) => {
    setLocalToast(msg);
    setTimeout(() => setLocalToast(null), 3000);
  }, []);

  const handleItemClick = useCallback((project) => {
    if (project.isLocked && !unlockedIdsRef.current.has(project.id)) {
      setGateModal({ project, pendingAction: () => onSelect(project.id) });
    } else {
      onSelect(project.id);
    }
  }, [onSelect]);

  const handleContextMenu = useCallback((e, project) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, project });
  }, []);

  useEffect(() => {
    if (!ctxMenu) return;
    const h = (e) => { if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target)) setCtxMenu(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ctxMenu]);

  useEffect(() => {
    if (!ctxMenu) return;
    const h = (e) => { if (e.key === 'Escape') setCtxMenu(null); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [ctxMenu]);
  
  const sliderContainerRef = useRef(null);
  const sliderDragging = useRef(null);
  const filterRef = useRef(null);
  const popupRef  = useRef(null);
  const sortRef = useRef(null);
  const sortBtnRef = useRef(null);
  const inputRef = useRef(null);
  const clearBtnRef = useRef(null);
  const searchIconRef = useRef(null);

  // 讓清除按鈕與搜尋 icon 跟隨 input 的 transform 同步
  function syncClearBtn(translateXY) {
    if (clearBtnRef.current) clearBtnRef.current.style.transform = `translateY(-50%) ${translateXY}`;
    if (searchIconRef.current) {
      const scale = query ? 'scale(1.2)' : 'scale(1)';
      searchIconRef.current.style.transform = `translateY(-50%) ${translateXY} ${scale}`;
    }
  }

  // query 從無到有時，按鈕剛 mount，立刻從 input 讀取當前 transform 補上
  useEffect(() => {
    if (!query || !inputRef.current) return;
    const currentTransform = inputRef.current.style.transform || 'translate(0px, 0px)';
    if (clearBtnRef.current) clearBtnRef.current.style.transform = `translateY(-50%) ${currentTransform}`;
    if (searchIconRef.current) searchIconRef.current.style.transform = `translateY(-50%) ${currentTransform}`;
  }, [query]);

  // Portal 定位：showSort 開啟後立刻從按鈕取座標
  useLayoutEffect(() => {
    if (!showSort || !sortBtnRef.current) return;
    const r = sortBtnRef.current.getBoundingClientRect();
    setPopupPos({ top: r.bottom + 8, left: r.right - 144 });
  }, [showSort]);

  useEffect(() => {
    if (!showFilter) return;
    function handleClick(e) {
      const inBtn   = filterRef.current && filterRef.current.contains(e.target);
      const inPopup = popupRef.current  && popupRef.current.contains(e.target);
      if (!inBtn && !inPopup) setShowFilter(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showFilter]);

  useEffect(() => {
    if (!showSort) return;
    function handleClick(e) { if (sortRef.current && !sortRef.current.contains(e.target)) setShowSort(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSort]);

  const filtered = projects.filter(p => {
    if (query.trim()) {
      const q = query.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !(p.objective || '').toLowerCase().includes(q)) return false;
    }
    if (statusFilters.size > 0) {
      const pct = calcProgress(p);
      const today = new Date().toISOString().slice(0,10);
      const overdue = p.deadline && p.deadline < today && pct < 100;
      const done = pct >= 100;
      const inProgress = !done && !overdue;
      const match =
        (statusFilters.has('inProgress') && inProgress) ||
        (statusFilters.has('overdue') && overdue) ||
        (statusFilters.has('done') && done);
      if (!match) return false;
    }
    if (lockFilters.size === 1) {
      if (lockFilters.has('locked') && !p.isLocked) return false;
      if (lockFilters.has('unlocked') && p.isLocked) return false;
    }
    if (progMin > 0 || progMax < 100) {
      const pct = calcProgress(p);
      if (pct < progMin || pct > progMax) return false;
    }
    if (dateFrom || dateTo) {
      const created = new Date(p.createdAt).setHours(0,0,0,0);
      if (dateFrom && created < new Date(dateFrom + 'T00:00:00').getTime()) return false;
      if (dateTo   && created > new Date(dateTo   + 'T00:00:00').getTime()) return false;
    }
    if (deadlineFrom || deadlineTo) {
      if (!p.deadline) return false;
      if (deadlineFrom && p.deadline < deadlineFrom) return false;
      if (deadlineTo   && p.deadline > deadlineTo)   return false;
    }
    return true;
  });
  
  const isFiltering = statusFilters.size > 0 || lockFilters.size > 0 || progMin > 0 || progMax < 100 || dateFrom !== '' || dateTo !== '' || deadlineFrom !== '' || deadlineTo !== '';

  // 搜尋/篩選/排序變動時重置頁碼
  React.useEffect(() => { setPage(1); }, [query, statusFilters, lockFilters, progMin, progMax, dateFrom, dateTo, deadlineFrom, deadlineTo, sortBy, sortDir]);
  const sorted = [...filtered].sort((a, b) => {
    let diff = sortBy === 'time' ? new Date(a.createdAt) - new Date(b.createdAt)
      : sortBy === 'deadline' ? ((a.deadline || '9999') < (b.deadline || '9999') ? -1 : (a.deadline || '9999') > (b.deadline || '9999') ? 1 : 0)
      : calcProgress(a) - calcProgress(b);
    return sortDir === 'asc' ? diff : -diff;
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '24px', gap: '16px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: '72px', border: '2px solid', borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', opacity: 1 - i * 0.2 }} />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', height: '100%' }}>
        <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid', transform: 'rotate(3deg)', marginBottom: '16px', background: darkMode ? '#3b3b3b' : '#f3f4f6', borderColor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', color: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}>
          <Layout size={24} />
        </div>
        <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4, color: darkMode ? '#fff' : '#000' }}>
          尚無 OGSM 專案
        </span>
      </div>
    );
  }

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
    sliderDragging.current = distMin <= distMax ? 'min' : 'max';
    e.preventDefault();
    const onMove = (e2) => {
      if (!decided) {
        const dx = e2.clientX - startX;
        if (Math.abs(dx) < 3) return;
        sliderDragging.current = dx < 0 ? 'min' : 'max';
        decided = true;
      }
      const v = getSliderVal(e2.clientX);
      if (sliderDragging.current === 'min') { const val = Math.min(v, progMax); setProgMin(val); setProgMinInput(String(val)); }
      else { const val = Math.max(v, progMin); setProgMax(val); setProgMaxInput(String(val)); }
    };
    const onUp = () => { sliderDragging.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
    const baseShadow = darkMode ? '4px 4px 0 0 rgba(255,255,255,0.2)' : '4px 4px 0 0 #000';
  const hoverShadow = darkMode ? '6px 6px 0 0 rgba(255,255,255,0.2)' : '6px 6px 0 0 #000';
  const activeShadow = darkMode ? '2px 2px 0 0 rgba(255,255,255,0.2)' : '2px 2px 0 0 #000';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative', background: 'transparent' }}>
      <style>{LOCAL_CSS}</style>

      {/* ── 搜尋框與獨立篩選按鈕 (Brutalist Style) ── */}
      <div style={{ padding: '2px 20px 10px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        
        {/* 獨立搜尋框 */}
        <div style={{ flex: 1, position: 'relative', height: '48px' }}>
          <svg ref={searchIconRef} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={query ? '#0000FF' : (darkMode ? '#fff' : '#000')} strokeWidth="3" style={{ position: 'absolute', left: '14px', top: '50%', transform: query ? 'translateY(-50%) scale(1.2)' : 'translateY(-50%) scale(1)', opacity: query ? 1 : 0.35, pointerEvents: 'none', transition: 'all 0.2s', zIndex: 2 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input 
            ref={inputRef}
            type="text" 
            placeholder="搜尋專案..." 
            value={query} 
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={e => {
              setSearchFocused(false);
              e.currentTarget.style.transform = 'translate(0px, 0px)';
              e.currentTarget.style.boxShadow = baseShadow;
              e.currentTarget.style.borderColor = query ? '#0000FF' : (darkMode ? '#fff' : '#000');
              syncClearBtn('translate(0px, 0px)');
            }}
            style={{ 
              width: '100%', 
              height: '92%', 
              background: query ? (darkMode ? 'rgba(0,0,60,0.5)' : 'rgba(230,230,255,0.6)') : (darkMode ? '#1a1a1a' : '#fff'), 
              border: `3px solid ${query ? '#0000FF' : searchFocused ? '#0000FF' : (darkMode ? '#fff' : '#000')}`, 
              outline: 'none', 
              padding: query ? '0 40px 0 38px' : '0 16px 0 38px', 
              fontSize: '14px', 
              fontWeight: 700, 
              fontFamily: '"Inter", "Noto Sans TC", sans-serif', 
              color: darkMode ? '#fff' : '#000',
              boxShadow: query ? `${baseShadow}, 0 0 0 2px rgba(0,0,255,0.15)` : baseShadow,
              transition: 'all 0.15s ease-out',
              transform: 'translate(0px, 0px)' 
            }}
            onMouseEnter={e => {
              if (document.activeElement === e.currentTarget) return; 
              e.currentTarget.style.transform = 'translate(-2px, -2px)';
              e.currentTarget.style.boxShadow = hoverShadow;
              syncClearBtn('translate(-2px, -2px)');
            }}
            onMouseLeave={e => {
              if (document.activeElement === e.currentTarget) return;
              e.currentTarget.style.transform = 'translate(0px, 0px)';
              e.currentTarget.style.boxShadow = query ? `${baseShadow}, 0 0 0 2px rgba(0,0,255,0.15)` : baseShadow;
              syncClearBtn('translate(0px, 0px)');
            }}
            onMouseDown={e => {
              e.currentTarget.style.transform = 'translate(2px, 2px)';
              e.currentTarget.style.boxShadow = activeShadow;
              syncClearBtn('translate(2px, 2px)');
            }}
            onMouseUp={e => {
              if (document.activeElement === e.currentTarget) return;
              e.currentTarget.style.transform = 'translate(-2px, -2px)';
              e.currentTarget.style.boxShadow = hoverShadow;
              syncClearBtn('translate(-2px, -2px)');
            }}
            onFocus={e => {
              setSearchFocused(true);
              e.currentTarget.style.transform = 'translate(2px, 2px)';
              e.currentTarget.style.boxShadow = activeShadow;
              e.currentTarget.style.borderColor = '#0000FF';
              syncClearBtn('translate(2px, 2px)');
            }}
            onBlur={e => {
              setSearchFocused(false);
              e.currentTarget.style.transform = 'translate(0px, 0px)';
              e.currentTarget.style.boxShadow = query ? `${baseShadow}, 0 0 0 2px rgba(0,0,255,0.15)` : baseShadow;
              e.currentTarget.style.borderColor = query ? '#0000FF' : (darkMode ? '#fff' : '#000');
              syncClearBtn('translate(0px, 0px)');
            }}
          />
          {/* 一鍵清除按鈕 */}
          {query && (
            <button
              ref={clearBtnRef}
              onClick={() => setQuery('')}
              title="清除搜尋"
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%) translate(0px, 0px)',
                width: '22px',
                height: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                border: 'none',
                cursor: 'pointer',
                color: darkMode ? '#fff' : '#000',
                fontSize: '14px',
                fontWeight: 900,
                lineHeight: 1,
                padding: 0,
                transition: 'background 0.15s, color 0.15s, transform 0.1s ease-out',
                zIndex: 5,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#FF00FF';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
                e.currentTarget.style.color = darkMode ? '#fff' : '#000';
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* 獨立篩選按鈕 */}
        <div ref={filterRef} style={{ position: 'relative' }}>
          <button 
            onClick={() => {
              if (!showFilter && filterRef.current) {
                const r = filterRef.current.getBoundingClientRect();
                setPopupPos({ top: r.bottom + 12, left: r.right - 224 });
              }
              setShowFilter(v => !v);
            }}
            style={{ 
              width: '42px', 
              height: '42px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer', 
              background: isFiltering
                ? (filterHovered ? '#0000cc' : '#0000FF')
                : (filterHovered ? '#FFFF00' : (darkMode ? '#1a1a1a' : '#fff')), 
              border: `3px solid ${darkMode ? '#fff' : '#000'}`, 
              color: isFiltering ? '#fff' : (filterHovered ? '#000' : (darkMode ? '#fff' : '#000')), 
              boxShadow: baseShadow,
              transition: 'all 0.15s ease-out',
              transform: 'translate(0px, 0px)'
            }}
            onMouseEnter={e => {
              setFilterHovered(true);
              e.currentTarget.style.transform = 'translate(-2px, -2px)';
              e.currentTarget.style.boxShadow = hoverShadow;
            }}
            onMouseLeave={e => {
              setFilterHovered(false);
              e.currentTarget.style.transform = 'translate(0px, 0px)';
              e.currentTarget.style.boxShadow = baseShadow;
            }}
            onMouseDown={e => {
              e.currentTarget.style.transform = 'translate(2px, 2px)';
              e.currentTarget.style.boxShadow = activeShadow;
            }}
            onMouseUp={e => {
              e.currentTarget.style.transform = 'translate(-2px, -2px)';
              e.currentTarget.style.boxShadow = hoverShadow;
            }}
          >
            <Filter size={20} strokeWidth={2.5} />
          </button>

          {/* Filter Dropdown */}
          {showFilter && (
            <div ref={popupRef} style={{ position: 'fixed', top: popupPos.top, left: popupPos.left, zIndex: 9999, width: 'fit-content', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', border: `3px solid ${darkMode ? '#fff' : '#000'}`, background: darkMode ? '#2e2e2e' : '#f0f0f0', backgroundImage: darkMode ? 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)' : 'linear-gradient(rgba(0,0,0,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.09) 1px, transparent 1px)', backgroundSize: '20px 20px', boxShadow: `5px 5px 0 0 ${darkMode ? 'rgba(255,255,255,0.15)' : '#000'}` }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#000', color: '#FFFF00', padding: '2px 6px', alignSelf: 'flex-start' }}>專案狀態</div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {[['inProgress', '進行中'], ['overdue', '已逾期'], ['done', '已完成']].map(([val, label]) => {
                    const checked = statusFilters.has(val);
                    return (
                      <label key={val} onClick={() => toggleStatus(val)} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: darkMode ? '#fff' : '#000', userSelect: 'none', whiteSpace: 'nowrap' }}>
                        <div style={{ width: '14px', height: '14px', border: `2px solid ${checked ? '#0000FF' : (darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)')}`, background: checked ? '#0000FF' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {checked && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                        {label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#000', color: '#FFFF00', padding: '2px 6px', alignSelf: 'flex-start' }}>上鎖狀態</div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {[['locked', '已上鎖'], ['unlocked', '未上鎖']].map(([val, label]) => {
                    const checked = lockFilters.has(val);
                    return (
                      <label key={val} onClick={() => toggleLockStatus(val)} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: darkMode ? '#fff' : '#000', userSelect: 'none', whiteSpace: 'nowrap' }}>
                        <div style={{ width: '14px', height: '14px', border: `2px solid ${checked ? '#0000FF' : (darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)')}`, background: checked ? '#0000FF' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {checked && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                        {label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#000', color: '#FFFF00', padding: '2px 6px' }}>完成進度</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="text" inputMode="numeric" value={progMinInput}
                      onChange={e => { const v = e.target.value; if (v === '' || (/^\d+$/.test(v) && Number(v) <= 100)) setProgMinInput(v); }}
                      onKeyDown={e => { if (e.key === 'Enter') { const v = Math.min(Math.max(0, Number(progMinInput)), progMax); setProgMin(v); setProgMinInput(String(v)); e.target.blur(); } }}
                      onBlur={() => { const v = Math.min(Math.max(0, Number(progMinInput)), progMax); setProgMin(v); setProgMinInput(String(v)); }}
                      style={{ width: '42px', fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, background: 'transparent', border: 'none', borderBottom: `2px solid ${darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}`, color: darkMode ? '#fff' : '#000', outline: 'none', textAlign: 'center', padding: '0 2px' }}
                    />
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>%–</span>
                    <input
                      type="text" inputMode="numeric" value={progMaxInput}
                      onChange={e => { const v = e.target.value; if (v === '' || (/^\d+$/.test(v) && Number(v) <= 100)) setProgMaxInput(v); }}
                      onKeyDown={e => { if (e.key === 'Enter') { const v = Math.max(Math.min(100, Number(progMaxInput)), progMin); setProgMax(v); setProgMaxInput(String(v)); e.target.blur(); } }}
                      onBlur={() => { const v = Math.max(Math.min(100, Number(progMaxInput)), progMin); setProgMax(v); setProgMaxInput(String(v)); }}
                      style={{ width: '42px', fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, background: 'transparent', border: 'none', borderBottom: `2px solid ${darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}`, color: darkMode ? '#fff' : '#000', outline: 'none', textAlign: 'center', padding: '0 2px' }}
                    />
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>%</span>
                  </div>
                </div>
                <div style={{ position: 'relative', height: '20px', marginTop: '4px', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', width: '100%', height: '4px', background: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} />
                  <div style={{ position: 'absolute', height: '4px', background: '#0000FF', pointerEvents: 'none', left: `${progMin}%`, width: `${progMax - progMin}%` }} />
                  <div ref={sliderContainerRef} onMouseDown={onSliderMouseDown}
                        style={{ position: 'absolute', width: '100%', height: '20px', cursor: 'pointer', top: 0 }}>
                        <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: `${progMin}%`, width: '14px', height: '14px', background: '#0000FF', border: '2px solid #fff', boxShadow: '2px 2px 0 #000', marginLeft: '-7px', boxSizing: 'border-box', zIndex: 5, cursor: 'ew-resize' }} />
                        <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: `${progMax}%`, width: '14px', height: '14px', background: '#0000FF', border: '2px solid #fff', boxShadow: '2px 2px 0 #000', marginLeft: '-7px', boxSizing: 'border-box', zIndex: 5, cursor: 'ew-resize' }} />
                      </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#000', color: '#FFFF00', padding: '2px 6px', alignSelf: 'flex-start' }}>建立日期</div>
                <input type="date" className="p-date" value={dateFrom} max={dateTo || undefined} onChange={e => { const v = e.target.value; if (dateTo && v > dateTo) return; setDateFrom(v); }} style={{ width: '100%', fontSize: '12px', padding: '8px', border: `2px solid ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, outline: 'none', fontFamily: 'monospace', background: darkMode ? '#2b2b2b' : '#f9fafb', color: darkMode ? '#fff' : '#000', colorScheme: darkMode ? 'dark' : 'light' }} />
                <input type="date" className="p-date" value={dateTo} onChange={e => { const v = e.target.value; setDateTo(!v ? '' : (dateFrom && v < dateFrom ? dateFrom : v)); }} style={{ width: '100%', fontSize: '12px', padding: '8px', border: `2px solid ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, outline: 'none', fontFamily: 'monospace', background: darkMode ? '#2b2b2b' : '#f9fafb', color: darkMode ? '#fff' : '#000', colorScheme: darkMode ? 'dark' : 'light' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#000', color: '#FFFF00', padding: '2px 6px', alignSelf: 'flex-start' }}>期限日期</div>
                <input type="date" className="p-date" value={deadlineFrom} max={deadlineTo || undefined} onChange={e => { const v = e.target.value; if (deadlineTo && v > deadlineTo) return; setDeadlineFrom(v); }} style={{ width: '100%', fontSize: '12px', padding: '8px', border: `2px solid ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, outline: 'none', fontFamily: 'monospace', background: darkMode ? '#2b2b2b' : '#f9fafb', color: darkMode ? '#fff' : '#000', colorScheme: darkMode ? 'dark' : 'light' }} />
                <input type="date" className="p-date" value={deadlineTo} onChange={e => { const v = e.target.value; setDeadlineTo(!v ? '' : (deadlineFrom && v < deadlineFrom ? deadlineFrom : v)); }} style={{ width: '100%', fontSize: '12px', padding: '8px', border: `2px solid ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, outline: 'none', fontFamily: 'monospace', background: darkMode ? '#2b2b2b' : '#f9fafb', color: darkMode ? '#fff' : '#000', colorScheme: darkMode ? 'dark' : 'light' }} />
              </div>

              {isFiltering && (
                <button onClick={() => { setStatusFilters(new Set()); setLockFilters(new Set()); setProgMin(0); setProgMax(100); setProgMinInput('0'); setProgMaxInput('100'); setDateFrom(''); setDateTo(''); setDeadlineFrom(''); setDeadlineTo(''); }} style={{ alignSelf: 'flex-start', fontSize: '11px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', border: '2px solid rgba(255,0,255,0.4)', background: 'transparent', color: '#FF00FF', cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = '#FF00FF'; e.currentTarget.style.color = '#000'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#FF00FF'; }}>
                  清除篩選
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 標題列 (專案清單 • 4) 可跳轉至 SwitchHome ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px', borderTop: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, background: darkMode ? 'rgba(20,20,20,0.7)' : 'rgba(255,255,255,0.7)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        <span 
          onClick={onManage}
          style={{ fontSize: '12px', fontWeight: 700, color: darkMode ? '#fff' : '#000', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '4px', opacity: 0.7, transition: 'opacity 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
        >
          {(query || isFiltering) ? `搜尋結果 • ${filtered.length}` : `專案清單 • ${projects.length}`}
        </span>
        
        <div style={{ position: 'relative' }} ref={sortRef}>
          <button 
            onClick={() => setShowSort(v => !v)}
            ref={sortBtnRef}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: 'transparent', border: 'none', color: darkMode ? '#fff' : '#000', opacity: (sortBy !== 'time' || sortDir !== 'desc') ? 1 : 0.5, transition: 'opacity 0.2s' }}
            onMouseEnter={e => { if(sortBy === 'time' && sortDir === 'desc') e.currentTarget.style.opacity = 1; }}
            onMouseLeave={e => { if(sortBy === 'time' && sortDir === 'desc') e.currentTarget.style.opacity = 0.5; }}
          >
            <Clock size={12} style={{ opacity: 0.7 }} /> {sortBy === 'time' ? '時間' : '進度'}
            <ChevronRight size={12} style={{ opacity: 0.7, transform: sortDir === 'desc' ? 'rotate(90deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
          </button>

          {/* Sort Dropdown — Portal 渲染到 body，突破 stacking context */}
          {showSort && createPortal(
            <div ref={sortRef} style={{ position: 'fixed', top: popupPos.top, left: popupPos.left, zIndex: 99999, width: '144px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', border: `3px solid ${darkMode ? '#fff' : '#000'}`, background: darkMode ? '#2e2e2e' : '#f0f0f0', backgroundImage: darkMode ? 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)' : 'linear-gradient(rgba(0,0,0,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.09) 1px, transparent 1px)', backgroundSize: '20px 20px', boxShadow: `5px 5px 0 0 ${darkMode ? 'rgba(255,255,255,0.4)' : '#000'}` }}>
              <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#000', color: '#FFFF00', padding: '2px 6px', alignSelf: 'flex-start' }}>排序依據</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                {[['time', '建立時間'], ['deadline', '期限日期'], ['progress', '完成進度']].map(([val, label]) => (
                  <button key={val} onClick={() => setSortBy(val)} style={{ textAlign: 'left', fontSize: '12px', fontWeight: 700, padding: '6px 10px', border: '2px solid', borderColor: sortBy === val ? '#000' : 'transparent', background: sortBy === val ? '#FFFF00' : 'transparent', color: sortBy === val ? '#000' : (darkMode ? '#fff' : '#000'), cursor: 'pointer' }}>{label}</button>
                ))}
              </div>
              <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#000', color: '#FFFF00', padding: '2px 6px', alignSelf: 'flex-start' }}>方向</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[['desc', sortBy === 'progress' ? '高→低' : sortBy === 'deadline' ? '最遠優先' : '最新優先'], ['asc', sortBy === 'progress' ? '低→高' : sortBy === 'deadline' ? '最近優先' : '最舊優先']].map(([val, label]) => (
                  <button key={val} onClick={() => setSortDir(val)} style={{ textAlign: 'left', fontSize: '12px', fontWeight: 700, padding: '6px 10px', border: '2px solid', borderColor: sortDir === val ? '#000' : 'transparent', background: sortDir === val ? '#FFFF00' : 'transparent', color: sortDir === val ? '#000' : (darkMode ? '#fff' : '#000'), cursor: 'pointer' }}>{label}</button>
                ))}
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>

      {/* ── 清單 (高度縮小，百分比靠下) ── */}
      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {filtered.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', fontSize: '12px', fontWeight: 700, opacity: 0.4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: darkMode ? '#fff' : '#000' }}>
            <Search size={24} style={{ opacity: 0.5 }} />
            找不到符合的專案
          </div>
        )}
        
        {paged.map(p => {
          const isActive = p.id === activeId;
          const pct = calcProgress(p);
          const today = (() => { const _n = new Date(); return `${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}-${String(_n.getDate()).padStart(2,'0')}` })();
          const isOverdue = p.deadline && p.deadline < today && pct < 100;

          return (
            <div
              key={p.id}
              className="p-item"
              onClick={() => handleItemClick(p)}
              onContextMenu={(e) => handleContextMenu(e, p)}
              style={{
                cursor: 'pointer', position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', 
                padding: '12px 20px', /* 縮小 Padding 以降低高度 */
                borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                background: isActive ? 'rgba(0,0,255,0.06)' : 'transparent',
              }}
            >
              {isActive && (
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: isOverdue ? '#ff0000' : '#0000FF', zIndex: 10 }} />
              )}
              
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                {(isOverdue || pct === 100) && (
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '5px', flexWrap: 'wrap' }}>
                    {pct === 100 && (
                      <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#00FF00', color: '#000', padding: '2px 6px', border: '1px solid rgba(0,0,0,0.2)' }}>已完成</span>
                    )}
                    {isOverdue && (
                      <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#ff0000', color: '#fff', padding: '2px 6px', border: '1px solid rgba(0,0,0,0.2)' }}>已逾期</span>
                    )}
                  </div>
                )}
                <h4 style={{ fontSize: '14px', fontWeight: 900, marginBottom: '4px', color: isOverdue ? '#ff0000' : pct === 100 ? '#00CC44' : (darkMode ? '#fff' : '#000'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {p.isLocked && <Lock size={12} strokeWidth={3} style={{ flexShrink: 0, opacity: 0.7 }} />}
                  {p.title}
                </h4>
                <p style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.objective}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>建立</span>
                    {formatTaiwanDate(p.createdAt)}
                  </div>
                  {p.deadline && (
                    <div style={{ fontSize: '11px', fontWeight: 700, color: isOverdue ? '#ff0000' : (darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.65)'), display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>期限</span>
                      {formatTaiwanDate(p.deadline)}
                    </div>
                  )}
                </div>
              </div>
              
              {/* 百分比容器加入 marginTop 讓它排在下方一些 */}
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end', paddingBottom: '2px' }}>
                <span style={{ fontSize: '32px', fontWeight: 900, fontStyle: 'italic', lineHeight: 0.9, letterSpacing: '-0.04em', color: isActive ? '#0000FF' : (darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)') }}>
                  {pct}<span style={{ fontSize: '14px', fontStyle: 'normal', marginLeft: '2px' }}>%</span>
                </span>
              </div>

              {/* 移除按鈕 (單純淡入，無風格變形) */}
              <button
                className="p-delete"
                onClick={(e) => { e.stopPropagation(); setConfirmId(p.id); }}
                title="刪除專案"
                style={{ position: 'absolute', top: '12px', right: '20px', padding: '4px', background: 'transparent', border: 'none', color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', cursor: 'pointer', zIndex: 20 }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>
      {/* ── 分頁控制 ── */}
      {totalPages > 1 && (
        <div className={darkMode ? 'dark' : ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 20px', borderTop: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, flexShrink: 0, background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
          <button
            className="p-page-btn"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${darkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}`, background: 'transparent', color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.25 : 0.7, fontWeight: 900, fontSize: '14px' }}
          >‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => {
            const isActive = n === page;
            const activeBlue = darkMode ? 'rgba(80,100,255,0.85)' : '#0000FF';
            return (
              <button key={n}
                className={`p-page-btn${isActive ? ' active' : ''}`}
                onClick={() => setPage(n)}
                style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${isActive ? activeBlue : (darkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)')}`, background: isActive ? activeBlue : 'transparent', color: isActive ? '#fff' : (darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'), cursor: isActive ? 'default' : 'pointer', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '11px', opacity: isActive ? 1 : 0.7 }}
              >{n}</button>
            );
          })}
          <button
            className="p-page-btn"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${darkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}`, background: 'transparent', color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.25 : 0.7, fontWeight: 900, fontSize: '14px' }}
          >›</button>
        </div>
      )}

      {/* ── Brutalist 確認刪除 Modal ── */}
      {confirmId !== null && createPortal(
        <div
          onClick={() => setConfirmId(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: darkMode ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.25)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative', width: '360px', maxWidth: '92vw', padding: '28px',
              background: darkMode ? '#393939' : '#f8f9fa',
              border: `3px solid ${darkMode ? '#fff' : '#000'}`,
              boxShadow: `8px 8px 0 0 ${darkMode ? '#223fce' : '#7389dd'}`,
              backgroundImage: darkMode
                ? 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)'
                : 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              display: 'flex', flexDirection: 'column', gap: '20px',
            }}
          >
            {/* Header */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '12px', fontFamily: '"DM Mono", monospace', color: '#5e5eea', fontWeight: 900, letterSpacing: '1px', marginBottom: '4px' }}>[ CONFIRM ]</div>
                <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '20px', color: darkMode ? '#fff' : '#000' }}>刪除專案</div>
              </div>
            </div>

            {/* 訊息 */}
            <p style={{ position: 'relative', zIndex: 1, fontSize: '13px', color: darkMode ? '#ccc' : '#444', lineHeight: 1.6, fontWeight: 500, borderLeft: '3px solid #ff0000', paddingLeft: '12px', margin: 0 }}>
              此操作無法復原。<br />確定要刪除這個專案嗎？
            </p>

            {/* 按鈕列 */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmId(null)}
                style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 20px', background: 'transparent', color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', border: `2px solid ${darkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}`, cursor: 'pointer', transition: 'all 0.1s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = darkMode ? '#fff' : '#000'; e.currentTarget.style.color = darkMode ? '#fff' : '#000'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = darkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'; e.currentTarget.style.color = darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'; }}
              >取消</button>
              <button
                onClick={() => { onDelete(confirmId); setConfirmId(null); }}
                style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 20px', background: '#ff0000', color: '#fff', border: '3px solid #ff0000', boxShadow: `4px 4px 0 0 ${darkMode ? '#686868' : '#000'}`, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${darkMode ? '#686868' : '#000'}`; e.currentTarget.style.background = '#cc0000'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `4px 4px 0 0 ${darkMode ? '#686868' : '#000'}`; e.currentTarget.style.background = '#ff0000'; }}
                onMouseDown={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = '2px 2px 0 0 #000'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${darkMode ? '#686868' : '#000'}`; }}
              >確認刪除</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── 右鍵選單 ── */}
      {ctxMenu && createPortal(
        <div
          ref={ctxMenuRef}
          style={{
            position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 999999,
            minWidth: '156px', padding: '6px 0',
            border: `2px solid ${darkMode ? '#fff' : '#000'}`,
            background: darkMode ? '#2e2e2e' : '#f8f9fa',
            backgroundImage: darkMode
              ? 'linear-gradient(rgba(255,255,255,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.06) 1px,transparent 1px)'
              : 'linear-gradient(rgba(0,0,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.05) 1px,transparent 1px)',
            backgroundSize: '16px 16px',
            boxShadow: `4px 4px 0 0 ${darkMode ? 'rgba(255,255,255,0.15)' : '#000'}`,
          }}
        >
          {[{
            label: ctxMenu.project.isLocked ? '🔄 更換密碼' : '🔒 設定密碼',
            action: () => { setCtxMenu(null); setLockModal(ctxMenu.project); }
          }, ctxMenu.project.isLocked ? {
            label: '🔓 移除密碼',
            danger: true,
            action: () => { setCtxMenu(null); setRemoveLockModal(ctxMenu.project); }
          } : null].filter(Boolean).map((item, idx) => (
            <button key={idx} onClick={item.action} style={{
              display: 'block', width: '100%', padding: '8px 16px',
              background: 'transparent', border: 'none',
              color: item.danger ? '#ff4444' : (darkMode ? '#fff' : '#000'),
              fontSize: '13px', fontWeight: 700,
              fontFamily: '"Space Grotesk",sans-serif',
              textAlign: 'left', cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = item.danger ? 'rgba(255,0,0,0.12)' : (darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'); }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}

      {/* ── 密碼 Modals ── */}
      <SetPasswordModal visible={!!lockModal} project={lockModal} onClose={() => setLockModal(null)} darkMode={darkMode}
        onSuccess={(updated) => { setLockModal(null); onPatchProject && onPatchProject(updated.id, { isLocked: updated.isLocked }); (showToast || showLocalToast)(updated.isLocked ? '密碼已設定，專案已上鎖' : '密碼已更換'); }} />
      <RemoveLockModal visible={!!removeLockModal} project={removeLockModal} onClose={() => setRemoveLockModal(null)} darkMode={darkMode}
        onSuccess={(updated) => { setRemoveLockModal(null); onPatchProject && onPatchProject(updated.id, { isLocked: false }); unlockedIdsRef.current.delete(updated.id); (showToast || showLocalToast)('密碼已移除'); }} />
      <PasswordGateModal visible={!!gateModal} project={gateModal?.project} onClose={() => setGateModal(null)} darkMode={darkMode}
        onSuccess={() => { const { project, pendingAction } = gateModal; unlockedIdsRef.current.add(project.id); setGateModal(null); pendingAction && pendingAction(); }} />

      {/* ── 區域 Toast ── */}
      {localToast && createPortal(
        <div style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', zIndex: 999999, background: '#0000FF', color: '#fff', padding: '10px 24px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, fontSize: '13px', letterSpacing: '0.06em', border: '2px solid #fff', boxShadow: '4px 4px 0 0 rgba(0,0,0,0.5)', pointerEvents: 'none' }}>
          {localToast}
        </div>,
        document.body
      )}
    </div>
  );
}