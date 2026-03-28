import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Filter, 
  Clock, 
  ChevronRight, 
  Trash2, 
  Layout,
  Search
} from 'lucide-react';

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
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const ampm = d.getHours() >= 12 ? '下午' : '上午';
  const hours = d.getHours() % 12 || 12;
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${year}年${month}月${date}日 ${ampm}${hours}:${mins}`;
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

export default function ProjectList({ projects, loading, activeId, onSelect, onDelete, onManage, darkMode = true }) {
  const [query, setQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const [progMin, setProgMin] = useState(0);
  const [progMax, setProgMax] = useState(100);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showSort, setShowSort] = useState(false);
  const [sortBy, setSortBy] = useState('time');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  
  const filterRef = useRef(null);
  const popupRef  = useRef(null);
  const sortRef = useRef(null);
  const sortBtnRef = useRef(null);
  const inputRef = useRef(null);
  const clearBtnRef = useRef(null);

  // 讓清除按鈕跟隨 input 的 transform 同步
  function syncClearBtn(translateXY) {
    if (!clearBtnRef.current) return;
    clearBtnRef.current.style.transform = `translateY(-50%) ${translateXY}`;
  }

  // query 從無到有時，按鈕剛 mount，立刻從 input 讀取當前 transform 補上
  useEffect(() => {
    if (!query || !clearBtnRef.current || !inputRef.current) return;
    const currentTransform = inputRef.current.style.transform || 'translate(0px, 0px)';
    clearBtnRef.current.style.transform = `translateY(-50%) ${currentTransform}`;
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
    if (progMin > 0 || progMax < 100) {
      const pct = calcProgress(p);
      if (pct < progMin || pct > progMax) return false;
    }
    if (dateFrom || dateTo) {
      const created = new Date(p.createdAt).setHours(0,0,0,0);
      if (dateFrom && created < new Date(dateFrom + 'T00:00:00').getTime()) return false;
      if (dateTo   && created > new Date(dateTo   + 'T00:00:00').getTime()) return false;
    }
    return true;
  });
  
  const isFiltering = progMin > 0 || progMax < 100 || dateFrom !== '' || dateTo !== '';

  // 搜尋/篩選/排序變動時重置頁碼
  React.useEffect(() => { setPage(1); }, [query, progMin, progMax, dateFrom, dateTo, sortBy, sortDir]);
  const sorted = [...filtered].sort((a, b) => {
    let diff = sortBy === 'time' ? new Date(a.createdAt) - new Date(b.createdAt) : calcProgress(a) - calcProgress(b);
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

  const baseShadow = darkMode ? '4px 4px 0 0 rgba(255,255,255,0.2)' : '4px 4px 0 0 #000';
  const hoverShadow = darkMode ? '6px 6px 0 0 rgba(255,255,255,0.2)' : '6px 6px 0 0 #000';
  const activeShadow = darkMode ? '2px 2px 0 0 rgba(255,255,255,0.2)' : '2px 2px 0 0 #000';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative', background: 'transparent' }}>
      <style>{LOCAL_CSS}</style>

      {/* ── 搜尋框與獨立篩選按鈕 (Brutalist Style) ── */}
      <div style={{ padding: '2px 20px 20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        
        {/* 獨立搜尋框 */}
        <div style={{ flex: 1, position: 'relative', height: '48px' }}>
          <input 
            ref={inputRef}
            type="text" 
            placeholder="搜尋專案..." 
            value={query} 
            onChange={e => setQuery(e.target.value)}
            style={{ 
              width: '100%', 
              height: '100%', 
              background: darkMode ? '#1a1a1a' : '#fff', 
              border: `3px solid ${darkMode ? '#fff' : '#000'}`, 
              outline: 'none', 
              padding: query ? '0 40px 0 16px' : '0 16px', 
              fontSize: '14px', 
              fontWeight: 700, 
              fontFamily: '"Inter", "Noto Sans TC", sans-serif', 
              color: darkMode ? '#fff' : '#000',
              boxShadow: baseShadow,
              transition: 'all 0.1s ease-out',
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
              e.currentTarget.style.boxShadow = baseShadow;
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
              e.currentTarget.style.transform = 'translate(2px, 2px)';
              e.currentTarget.style.boxShadow = activeShadow;
              e.currentTarget.style.borderColor = '#0000FF';
              syncClearBtn('translate(2px, 2px)');
            }}
            onBlur={e => {
              e.currentTarget.style.transform = 'translate(0px, 0px)';
              e.currentTarget.style.boxShadow = baseShadow;
              e.currentTarget.style.borderColor = darkMode ? '#fff' : '#000';
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
              width: '48px', 
              height: '48px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer', 
              background: isFiltering ? '#0000FF' : (darkMode ? '#1a1a1a' : '#fff'), 
              border: `3px solid ${darkMode ? '#fff' : '#000'}`, 
              color: isFiltering ? '#fff' : (darkMode ? '#fff' : '#000'), 
              boxShadow: baseShadow,
              transition: 'all 0.1s ease-out',
              transform: 'translate(0px, 0px)' // 鎖定初始狀態
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translate(-2px, -2px)';
              e.currentTarget.style.boxShadow = hoverShadow;
            }}
            onMouseLeave={e => {
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
            <div ref={popupRef} style={{ position: 'fixed', top: popupPos.top, left: popupPos.left, zIndex: 9999, width: '224px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', border: `3px solid ${darkMode ? '#fff' : '#000'}`, background: darkMode ? '#1a1a1a' : '#fff', boxShadow: `5px 5px 0 0 ${darkMode ? 'rgba(255,255,255,0.15)' : '#000'}` }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#000', color: '#FFFF00', padding: '2px 6px' }}>完成進度</div>
                  <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: darkMode ? '#fff' : '#000' }}>{progMin}% – {progMax}%</span>
                </div>
                <div style={{ position: 'relative', height: '20px', marginTop: '4px', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', width: '100%', height: '4px', background: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} />
                  <div style={{ position: 'absolute', height: '4px', background: '#0000FF', pointerEvents: 'none', left: `${progMin}%`, width: `${progMax - progMin}%` }} />
                  <input type="range" min={0} max={100} step={1} value={progMin} onChange={e => setProgMin(Math.min(Number(e.target.value), progMax))} className="p-range" style={{ position: 'absolute', width: '100%', height: '4px', appearance: 'none', WebkitAppearance: 'none', background: 'transparent', outline: 'none', margin: 0 }} />
                  <input type="range" min={0} max={100} step={1} value={progMax} onChange={e => setProgMax(Math.max(Number(e.target.value), progMin))} className="p-range" style={{ position: 'absolute', width: '100%', height: '4px', appearance: 'none', WebkitAppearance: 'none', background: 'transparent', outline: 'none', margin: 0 }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#000', color: '#FFFF00', padding: '2px 6px', alignSelf: 'flex-start' }}>建立日期</div>
                <input type="date" className="p-date" value={dateFrom} max={dateTo || undefined} onChange={e => { const v = e.target.value; if (dateTo && v > dateTo) return; setDateFrom(v); }} style={{ width: '100%', fontSize: '12px', padding: '8px', border: `2px solid ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, outline: 'none', fontFamily: 'monospace', background: darkMode ? '#2b2b2b' : '#f9fafb', color: darkMode ? '#fff' : '#000', colorScheme: darkMode ? 'dark' : 'light' }} />
                <input type="date" className="p-date" value={dateTo} min={dateFrom || undefined} onChange={e => { const v = e.target.value; if (dateFrom && v < dateFrom) return; setDateTo(v); }} style={{ width: '100%', fontSize: '12px', padding: '8px', border: `2px solid ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, outline: 'none', fontFamily: 'monospace', background: darkMode ? '#2b2b2b' : '#f9fafb', color: darkMode ? '#fff' : '#000', colorScheme: darkMode ? 'dark' : 'light' }} />
              </div>

              {isFiltering && (
                <button onClick={() => { setProgMin(0); setProgMax(100); setDateFrom(''); setDateTo(''); }} style={{ alignSelf: 'flex-start', fontSize: '11px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 12px', border: '2px solid rgba(255,0,255,0.4)', background: 'transparent', color: '#FF00FF', cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = '#FF00FF'; e.currentTarget.style.color = '#000'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#FF00FF'; }}>
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
            <div ref={sortRef} style={{ position: 'fixed', top: popupPos.top, left: popupPos.left, zIndex: 99999, width: '144px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', border: `3px solid ${darkMode ? '#fff' : '#000'}`, background: darkMode ? '#1a1a1a' : '#fff', boxShadow: `5px 5px 0 0 ${darkMode ? 'rgba(255,255,255,0.4)' : '#000'}` }}>
              <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#000', color: '#FFFF00', padding: '2px 6px', alignSelf: 'flex-start' }}>排序依據</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                {[['time', '建立時間'], ['progress', '完成進度']].map(([val, label]) => (
                  <button key={val} onClick={() => setSortBy(val)} style={{ textAlign: 'left', fontSize: '12px', fontWeight: 700, padding: '6px 10px', border: '2px solid', borderColor: sortBy === val ? '#000' : 'transparent', background: sortBy === val ? '#FFFF00' : 'transparent', color: sortBy === val ? '#000' : (darkMode ? '#fff' : '#000'), cursor: 'pointer' }}>{label}</button>
                ))}
              </div>
              <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#000', color: '#FFFF00', padding: '2px 6px', alignSelf: 'flex-start' }}>方向</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[['desc', sortBy === 'time' ? '最新優先' : '高→低'], ['asc', sortBy === 'time' ? '最舊優先' : '低→高']].map(([val, label]) => (
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
              onClick={() => onSelect(p.id)}
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
                      <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#00FF00', color: '#000', padding: '2px 6px', border: '1px solid rgba(0,0,0,0.2)' }}>✓ 完成</span>
                    )}
                    {isOverdue && (
                      <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#ff0000', color: '#fff', padding: '2px 6px', border: '1px solid rgba(0,0,0,0.2)' }}>已逾期</span>
                    )}
                  </div>
                )}
                <h4 style={{ fontSize: '14px', fontWeight: 900, marginBottom: '4px', color: isOverdue ? '#ff0000' : pct === 100 ? '#00CC44' : (darkMode ? '#fff' : '#000'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.title}
                </h4>
                <p style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.objective}
                </p>
                <div style={{ fontSize: '11px', fontWeight: 700, color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                  {formatTaiwanDate(p.createdAt)}
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
                onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
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
    </div>
  );
}