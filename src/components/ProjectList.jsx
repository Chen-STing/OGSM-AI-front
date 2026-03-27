import React, { useState, useEffect, useRef } from 'react';
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

const LOCAL_CSS = `
  .p-range::-webkit-slider-thumb {
    -webkit-appearance: none; width: 14px; height: 14px; border-radius: 0; background: #0000FF; border: 2px solid #fff; cursor: pointer; position: relative; z-index: 10; box-shadow: 2px 2px 0 #000;
  }
  .p-range::-moz-range-thumb {
    width: 14px; height: 14px; border-radius: 0; background: #0000FF; border: 2px solid #fff; cursor: pointer; z-index: 10; box-shadow: 2px 2px 0 #000;
  }
  .p-item { transition: background 0.15s; }
  .p-item:hover { background: rgba(0,0,0,0.03); }
  .dark .p-item:hover { background: rgba(255,255,255,0.03); }
  .p-delete { opacity: 0; transition: opacity 0.2s, color 0.15s; }
  .p-item:hover .p-delete { opacity: 0.6; }
  .p-delete:hover { opacity: 1 !important; color: #FF00FF !important; }
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
  
  const filterRef = useRef(null);
  const sortRef = useRef(null);

  useEffect(() => {
    if (!showFilter) return;
    function handleClick(e) { if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilter(false); }
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
  const sorted = [...filtered].sort((a, b) => {
    let diff = sortBy === 'time' ? new Date(a.createdAt) - new Date(b.createdAt) : calcProgress(a) - calcProgress(b);
    return sortDir === 'asc' ? diff : -diff;
  });

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative', background: 'transparent' }}>
      <style>{LOCAL_CSS}</style>

      {/* ── 搜尋框與獨立篩選按鈕 (Brutalist Style) ── */}
      <div style={{ padding: '0px 20px 20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        
        {/* 獨立搜尋框 */}
        <div style={{ flex: 1, position: 'relative', height: '48px' }}>
          <input 
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
              padding: '0 16px', 
              fontSize: '14px', 
              fontWeight: 700, 
              fontFamily: '"Inter", "Noto Sans TC", sans-serif', 
              color: darkMode ? '#fff' : '#000',
              boxShadow: `5px 5px 0 0 ${darkMode ? 'rgba(255,255,255,0.2)' : '#000'}`,
              transition: 'all 0.1s ease-out'
            }}
            onFocus={(e) => {
              e.target.style.transform = 'translate(2px, 2px)';
              e.target.style.boxShadow = `3px 3px 0 0 ${darkMode ? 'rgba(255,255,255,0.2)' : '#000'}`;
              e.target.style.borderColor = '#0000FF';
            }}
            onBlur={(e) => {
              e.target.style.transform = 'translate(0, 0)';
              e.target.style.boxShadow = `5px 5px 0 0 ${darkMode ? 'rgba(255,255,255,0.2)' : '#000'}`;
              e.target.style.borderColor = darkMode ? '#fff' : '#000';
            }}
          />
        </div>

        {/* 獨立篩選按鈕 */}
        <div style={{ position: 'relative' }}>
          <button 
            ref={filterRef}
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
              boxShadow: `5px 5px 0 0 ${darkMode ? 'rgba(255,255,255,0.2)' : '#000'}`,
              transition: 'all 0.1s ease-out'
            }}
            onMouseDown={e => {
              e.currentTarget.style.transform = 'translate(2px, 2px)';
              e.currentTarget.style.boxShadow = `3px 3px 0 0 ${darkMode ? 'rgba(255,255,255,0.2)' : '#000'}`;
            }}
            onMouseUp={e => {
              e.currentTarget.style.transform = 'translate(0, 0)';
              e.currentTarget.style.boxShadow = `5px 5px 0 0 ${darkMode ? 'rgba(255,255,255,0.2)' : '#000'}`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translate(0, 0)';
              e.currentTarget.style.boxShadow = `5px 5px 0 0 ${darkMode ? 'rgba(255,255,255,0.2)' : '#000'}`;
            }}
          >
            <Filter size={20} strokeWidth={2.5} />
          </button>

          {/* Filter Dropdown */}
          {showFilter && (
            <div style={{ position: 'fixed', top: popupPos.top, left: popupPos.left, zIndex: 9999, width: '224px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', border: `3px solid ${darkMode ? '#fff' : '#000'}`, background: darkMode ? '#1a1a1a' : '#fff', boxShadow: `5px 5px 0 0 ${darkMode ? 'rgba(255,255,255,0.15)' : '#000'}` }}>
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
                <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => { const v = e.target.value; if (dateTo && v > dateTo) return; setDateFrom(v); }} style={{ width: '100%', fontSize: '12px', padding: '8px', border: `2px solid ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, outline: 'none', fontFamily: 'monospace', background: darkMode ? '#2b2b2b' : '#f9fafb', color: darkMode ? '#fff' : '#000', colorScheme: darkMode ? 'dark' : 'light' }} />
                <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => { const v = e.target.value; if (dateFrom && v < dateFrom) return; setDateTo(v); }} style={{ width: '100%', fontSize: '12px', padding: '8px', border: `2px solid ${darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, outline: 'none', fontFamily: 'monospace', background: darkMode ? '#2b2b2b' : '#f9fafb', color: darkMode ? '#fff' : '#000', colorScheme: darkMode ? 'dark' : 'light' }} />
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px', borderTop: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, background: 'transparent' }}>
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
            onClick={() => {
              if (!showSort && sortRef.current) {
                const r = sortRef.current.getBoundingClientRect();
                setPopupPos({ top: r.bottom + 8, left: r.right - 140 });
              }
              setShowSort(v => !v);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: 'transparent', border: 'none', color: darkMode ? '#fff' : '#000', opacity: (sortBy !== 'time' || sortDir !== 'desc') ? 1 : 0.5, transition: 'opacity 0.2s' }}
            onMouseEnter={e => { if(sortBy === 'time' && sortDir === 'desc') e.currentTarget.style.opacity = 1; }}
            onMouseLeave={e => { if(sortBy === 'time' && sortDir === 'desc') e.currentTarget.style.opacity = 0.5; }}
          >
            <Clock size={12} style={{ opacity: 0.7 }} /> {sortBy === 'time' ? '時間' : '進度'}
            <ChevronRight size={12} style={{ opacity: 0.7, transform: sortDir === 'desc' ? 'rotate(90deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
          </button>

          {/* Sort Dropdown */}
          {showSort && (
            <div style={{ position: 'fixed', top: popupPos.top, left: popupPos.left, zIndex: 9999, width: '144px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', border: `3px solid ${darkMode ? '#fff' : '#000'}`, background: darkMode ? '#1a1a1a' : '#fff', boxShadow: `5px 5px 0 0 ${darkMode ? 'rgba(255,255,255,0.15)' : '#000'}` }}>
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
            </div>
          )}
        </div>
      </div>

      {/* ── 清單 (高度縮小，百分比靠下) ── */}
      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', fontSize: '12px', fontWeight: 700, opacity: 0.4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: darkMode ? '#fff' : '#000' }}>
            <Search size={24} style={{ opacity: 0.5 }} />
            找不到符合的專案
          </div>
        )}
        
        {sorted.map(p => {
          const isActive = p.id === activeId;
          const pct = calcProgress(p);

          return (
            <div
              key={p.id}
              className="p-item"
              onClick={() => onSelect(p.id)}
              style={{
                cursor: 'pointer', position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', 
                padding: '12px 20px', /* 縮小 Padding 以降低高度 */
                borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                background: isActive ? 'rgba(0,0,255,0.06)' : 'transparent',
              }}
            >
              {isActive && (
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: '#0000FF', zIndex: 10 }} />
              )}
              
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 900, marginBottom: '4px', color: darkMode ? '#fff' : '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '14px' }}>
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
    </div>
  );
}