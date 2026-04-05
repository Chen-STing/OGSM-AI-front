import { useState, useMemo, useEffect } from 'react'
import BrutalistSelect from './BrutalistSelect'
import { loadSavedBgConfig } from '../bgConfig.js'
import BrutalistBackground from './BrutalistBackground.jsx'

// ─── BRUTALIST TOKENS ────────────────────────────────────────────────────────
const B_YELLOW = '#FFFF00'
const B_BLUE   = '#0000FF'
const B_PINK   = '#FF00FF'
const B_GREEN  = '#00FF00'

// 白天模式下稍深的版本
const B_YELLOW_LIGHT = '#b8a800'
const B_GREEN_LIGHT  = '#1a9e1a'

const STATUS_CONFIG = {
  NotStarted: { label: '未開始', color: '#a8b4c9' },
  InProgress:  { label: '進行中', color: '#3b9ede' },
  Completed:   { label: '已完成', color: '#4caf7d' },
  Overdue:     { label: '已逾期', color: '#e05252' },
}

const FILTERS = ['全部', '未完成', '已完成', '即將到期', '已逾期']

function diffDays(d1, d2) {
  const date1 = new Date(d1 + 'T12:00:00')
  const date2 = new Date(d2 + 'T12:00:00')
  return Math.round((date1 - date2) / (1000 * 60 * 60 * 24))
}

function flattenTodos(project) {
  const items = []
  const today = (() => { const _n = new Date(); return `${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}-${String(_n.getDate()).padStart(2,'0')}` })()
  project.goals.forEach((goal, gi) => {
    goal.strategies.forEach((st, si) => {
      st.measures.forEach((m, mi) => {
        ;(m.todos || []).forEach((t, ti) => {
          const remainingDays = t.deadline ? diffDays(t.deadline, today) : null
          const overdueDays = t.deadline && !t.done && t.deadline < today ? diffDays(today, t.deadline) : 0
          items.push({
            ...t,
            goalIndex: gi, stratIndex: si, measureIndex: mi, todoIndex: ti,
            measureKpi: m.kpi, measureDeadline: m.deadline || '',
            measureStatus: m.status, goalText: goal.text, stratText: st.text,
            isOverdue: !t.done && !!(t.deadline && t.deadline < today),
            isUpcoming: !t.done && remainingDays !== null && remainingDays >= 0 && remainingDays <= 7,
            remainingDays,
            overdueDays,
            todoOverdue: t.deadline && t.deadline < today && !t.done,
            todoUpcoming: !t.done && remainingDays !== null && remainingDays >= 0 && remainingDays <= 7,
          })
        })
      })
    })
  })
  return items
}

export default function TodoManagerPanel({ project, onClose, onToggleTodo, onUpdateTodo, members = [], darkMode = true, originRect = null }) {
  const [filter, setFilter]   = useState('全部')
  const [search, setSearch]   = useState('')
  const [groupBy, setGroupBy] = useState('measure')
  const [sortDate, setSortDate] = useState('none')
  const [collapsedGroups, setCollapsedGroups] = useState(new Set())
  const [confirmingId, setConfirmingId] = useState(null)

  const [bgConfig, setBgConfig] = useState(() => loadSavedBgConfig())
  useEffect(() => {
    const handleBgChange = () => setBgConfig(loadSavedBgConfig())
    window.addEventListener('brutalistBgChanged', handleBgChange)
    return () => window.removeEventListener('brutalistBgChanged', handleBgChange)
  }, [])

  const toggleGroup = (key) => setCollapsedGroups(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })

  const allTodos = useMemo(() => flattenTodos(project), [project])
  const today = (() => { const _n = new Date(); return `${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}-${String(_n.getDate()).padStart(2,'0')}` })()

  const stats = useMemo(() => ({
    total:    allTodos.length,
    done:     allTodos.filter(t => t.done).length,
    overdue:  allTodos.filter(t => t.isOverdue).length,
    upcoming: allTodos.filter(t => t.isUpcoming).length,
    pct:      allTodos.length ? Math.round(allTodos.filter(t => t.done).length / allTodos.length * 100) : 0,
  }), [allTodos])

  const filtered = useMemo(() => {
    let items = allTodos
    if (search.trim()) items = items.filter(t => t.text.includes(search.trim()) || t.measureKpi.includes(search.trim()))
    switch (filter) {
      case '未完成': items = items.filter(t => !t.done && !t.isOverdue && !t.isUpcoming); break
      case '已完成': items = items.filter(t => t.done); break
      case '即將到期': items = items.filter(t => t.isUpcoming); break
      case '已逾期': items = items.filter(t => t.isOverdue); break
    }
    if (sortDate !== 'none') {
      items = [...items].sort((a, b) => {
        const da = a.deadline || '', db = b.deadline || ''
        if (!da && !db) return 0
        if (!da) return sortDate === 'asc' ? 1 : -1
        if (!db) return sortDate === 'asc' ? -1 : 1
        return sortDate === 'asc' ? da.localeCompare(db) : db.localeCompare(da)
      })
    }
    return items
  }, [allTodos, filter, search, sortDate])

  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(t => {
      let key, label
      if (groupBy === 'goal') {
        key = `G${t.goalIndex + 1}`
        label = `G${t.goalIndex + 1} — ${t.goalText || '未命名'}`
      } else if (groupBy === 'status') {
        key   = t.done ? 'done' : t.isOverdue ? 'overdue' : t.isUpcoming ? 'upcoming' : 'pending'
        label = t.done ? '✓ 已完成' : t.isOverdue ? '⚠ 已逾期' : t.isUpcoming ? '📅 即將到期' : '○ 待處理'
      } else {
        key   = `G${t.goalIndex+1}-S${t.goalIndex+1}.${t.stratIndex+1}-D${t.goalIndex+1}.${t.stratIndex+1}.${t.measureIndex+1}`
        label = `D${t.goalIndex+1}.${t.stratIndex+1}.${t.measureIndex+1} — ${t.measureKpi || '未命名'}`
      }
      if (!groups[key]) groups[key] = { label, items: [] }
      groups[key].items.push(t)
    })
    return Object.entries(groups)
  }, [filtered, groupBy])

  const dark = darkMode
  const CY = dark ? B_YELLOW : B_YELLOW_LIGHT   // 動態黃
  const CG = dark ? B_GREEN  : B_GREEN_LIGHT    // 動態綠

  const PANEL_W = 800
  const vw = window.innerWidth
  const originX = originRect
    ? `${Math.max(0, originRect.left + originRect.width / 2 - (vw - PANEL_W))}px`
    : `${PANEL_W}px`
  const originY = originRect
    ? `${originRect.top + originRect.height / 2}px`
    : '50px'

  return (
    <>
      <style>{`
        @keyframes todoExpandPanel {
          0%   { transform: scale(0.08); opacity: 0.6; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes b-progress-pulse { 0%,100% { box-shadow: 0 0 4px ${CY}; } 50% { box-shadow: 0 0 12px ${CY}; } }
        .b-todo-item:hover { background: ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'} !important; }
        .b-filter-chip:hover { background: rgba(255,255,0,0.15) !important; border-color: ${CY} !important; color: ${CY} !important; }
        .b-group-btn:hover { }
        .b-sort-btn:hover { }
        .b-confirm-yes:hover { }
        .b-confirm-no:hover { }
        .b-scroll::-webkit-scrollbar { width: 6px; }
        .b-scroll::-webkit-scrollbar-track { background: transparent; }
        .b-scroll::-webkit-scrollbar-thumb { background: ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}; border-radius: 0; }
        .b-scroll::-webkit-scrollbar-thumb:hover { background: ${dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}; }
        .b-scroll { scrollbar-width: thin; scrollbar-color: ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} transparent; }
        .tmp-date::-webkit-calendar-picker-indicator { cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M14 6 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%23000000" /><path d="M10 2 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%23FF00FF" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></svg>') 10 2, pointer !important; }
        .tmp-date-overdue::-webkit-calendar-picker-indicator { filter: brightness(0) saturate(100%) invert(12%) sepia(90%) saturate(6000%) hue-rotate(0deg) brightness(85%) !important; cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M14 6 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%23000000" /><path d="M10 2 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%23FF00FF" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></svg>') 10 2, pointer !important; }
      `}</style>

      {/* 遮罩 */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', zIndex: 450 }} onClick={onClose} />

      {/* 動畫層 */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: `${PANEL_W}px`, maxWidth: '92vw',
        borderLeft: `2px solid ${dark ? '#9f9f9f' : '#000'}`,
        zIndex: 451,
        overflow: 'visible',
        transformOrigin: `${originX} ${originY}`,
        animation: 'todoExpandPanel 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      }}>
        {/* 佈局層 */}
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', background: dark ? 'rgba(18,18,18,0.92)' : 'rgba(246,246,246,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          <BrutalistBackground dark={darkMode} bgConfig={bgConfig} />

      {/* ── Header ── */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 18px 14px', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`, flexShrink: 0, background: 'transparent' }}>
          <div>
            <div style={{ fontSize: '12px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: CY, letterSpacing: '0.12em', marginBottom: '3px', textTransform: 'uppercase' }}>☑ MP 檢核步驟管理</div>
            <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '17px', color: dark ? '#fff' : '#000', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>{project.title}</div>
          </div>
          <button style={{ background: 'none', border: 'none', color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', cursor: 'pointer', fontSize: '18px', padding: '4px', lineHeight: 1, transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color = B_PINK} onMouseLeave={e => e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} onClick={onClose}>✕</button>
        </div>

        {/* ── Stats ── */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'stretch', padding: '12px 16px', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, flexShrink: 0, gap: '0', background: 'transparent', backdropFilter: dark ? 'blur(2px)' : 'blur(3px)', WebkitBackdropFilter: dark ? 'none' : 'blur(1px)' }}>
          {[
            { label: '總計', value: stats.total, color: dark ? '#fff' : '#000' },
            { label: '完成', value: stats.done, color: CG },
            { label: '逾期', value: stats.overdue, color: B_PINK },
            { label: '即將', value: stats.upcoming, color: CY },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex: '0 0 56px', textAlign: 'center', padding: '4px 8px' }}>
              <div style={{ fontSize: '24px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color, lineHeight: 1, fontStyle: 'italic', textShadow: color !== (dark?'#fff':'#000') ? `0 0 8px ${color}` : 'none' }}>{value}</div>
              <div style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
            </div>
          ))}
          {/* Progress bar */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px', paddingLeft: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>完成率</span>
              <span style={{ fontSize: '14px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: stats.pct === 100 ? CG : CY, fontStyle: 'italic', textShadow: `0 0 6px ${stats.pct === 100 ? CG : CY}` }}>{stats.pct}%</span>
            </div>
            <div style={{ height: '5px', background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stats.pct}%`, background: stats.pct === 100 ? CG : `linear-gradient(90deg,${CY},${CG})`, transition: 'width 0.4s ease', boxShadow: `0 0 6px ${stats.pct === 100 ? CG : CY}`, animation: stats.pct > 0 && stats.pct < 100 ? 'b-progress-pulse 2s ease-in-out infinite' : 'none' }} />
            </div>
          </div>
        </div>

        {/* ── Search + Filter + Group ── */}
        <div style={{ position: 'relative', zIndex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`, flexShrink: 0, background: 'transparent', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
          {/* Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: dark ? '#2b2b2b' : '#f0f0f0', border: `3px solid ${dark ? 'rgba(255,255,255,0.2)' : '#000'}` }}>
            <span style={{ position: 'absolute', left: '10px', fontSize: '12px', opacity: 0.5, color: dark ? '#fff' : '#000' }}>🔍</span>
            <input
              type="text"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: dark ? '#fff' : '#000', fontSize: '12px', padding: '7px 10px 7px 32px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 }}
              placeholder="搜尋檢核步驟或定量指標名稱…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                title="清除搜尋"
                style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  width: '20px', height: '20px',
                  border: 'none', background: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                  color: dark ? '#fff' : '#000',
                  cursor: 'pointer', fontSize: '12px', fontWeight: 900, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = B_PINK; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'; e.currentTarget.style.color = dark ? '#fff' : '#000' }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Filter chips */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {FILTERS.map(f => (
                <button key={f} className="b-filter-chip" style={{ padding: '3px 9px', border: `2px solid ${filter === f ? '#000' : (dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')}`, background: filter === f ? CY : 'transparent', color: filter === f ? '#000' : (dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'), fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, cursor: 'pointer', transition: 'all 0.12s', textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: filter === f ? '2px 2px 0 #000' : 'none' }} onClick={() => setFilter(f)}>{f}</button>
              ))}
            </div>

            {/* Group + Sort */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>分組：</span>
              {[['measure', '定量指標'], ['goal', 'GOAL'], ['status', '狀態']].map(([v, l]) => {
                const isActive = groupBy === v
                return (
                  <button key={v}
                    style={{ padding: '3px 8px', border: `2px solid ${isActive ? B_BLUE : (dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')}`, background: isActive ? B_BLUE : 'transparent', color: isActive ? '#fff' : (dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, cursor: 'pointer', transition: 'all 0.12s', textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: isActive ? '2px 2px 0 #000' : 'none' }}
                    onClick={() => setGroupBy(v)}
                    onMouseEnter={e => {
                      if (isActive) {
                        e.currentTarget.style.background = '#FFFF00'; e.currentTarget.style.color = '#000'; e.currentTarget.style.borderColor = '#000';
                      } else {
                        e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = B_BLUE; e.currentTarget.style.background = B_BLUE;
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = isActive ? B_BLUE : 'transparent';
                      e.currentTarget.style.color = isActive ? '#fff' : (dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)');
                      e.currentTarget.style.borderColor = isActive ? B_BLUE : (dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)');
                    }}
                  >{l}</button>
                )
              })}
              <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginLeft: '6px' }}>排序：</span>
              {(() => {
                const isActive = sortDate !== 'none'
                return (
                  <button
                    style={{ padding: '3px 8px', border: `2px solid ${isActive ? B_PINK : (dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')}`, background: isActive ? B_PINK : 'transparent', color: isActive ? '#000' : (dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, cursor: 'pointer', minWidth: '48px', transition: 'all 0.12s', textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: isActive ? '2px 2px 0 #000' : 'none' }}
                    onClick={() => setSortDate(s => s === 'none' ? 'asc' : s === 'asc' ? 'desc' : 'none')}
                    title="點擊切換：預設 → 日期升序 → 日期降序"
                    onMouseEnter={e => {
                      if (isActive) {
                        e.currentTarget.style.background = '#FFFF00'; e.currentTarget.style.color = '#000'; e.currentTarget.style.borderColor = '#000';
                      } else {
                        e.currentTarget.style.background = B_PINK; e.currentTarget.style.color = '#000'; e.currentTarget.style.borderColor = B_PINK;
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = isActive ? B_PINK : 'transparent';
                      e.currentTarget.style.color = isActive ? '#000' : (dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)');
                      e.currentTarget.style.borderColor = isActive ? B_PINK : (dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)');
                    }}
                  >
                    {sortDate === 'none' ? '日期' : sortDate === 'asc' ? '日期↑' : '日期↓'}
                  </button>
                )
              })()}
            </div>
          </div>
        </div>

        {/* ── Todo list ── */}
        <div className="b-scroll" data-scroll-container="" style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 0 40px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)', fontSize: '12px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {search || filter !== '全部' ? '沒有符合的待辦事項' : '目前沒有待辦事項'}
            </div>
          ) : grouped.map(([groupKey, group]) => {
            const isCollapsed = collapsedGroups.has(groupKey)
            return (
              <div key={groupKey} style={{ marginBottom: '4px' }}>
                {/* Group header */}
                <div onClick={() => toggleGroup(groupKey)} style={{ padding: '8px 14px 4px', display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', userSelect: 'none', borderLeft: `4px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                  <span style={{ fontSize: '13px', color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', flexShrink: 0, lineHeight: 1, fontWeight: 900 }}>{isCollapsed ? '▸' : '▾'}</span>
                  <span style={{ fontSize: '13px', fontFamily: '"Space Grotesk", sans-serif', color: dark ? 'rgba(255,255,255,0.7)' : '#000', fontWeight: 900, flex: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{group.label}</span>
                  <span style={{ fontSize: '12px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: CG, fontStyle: 'italic' }}>
                    {group.items.filter(t => t.done).length}/{group.items.length}
                  </span>
                </div>

                {!isCollapsed && group.items.map((t, idx) => {
                  const itemId = `${t.goalIndex}-${t.stratIndex}-${t.measureIndex}-${t.id || idx}`
                  return (
                    <TodoItem
                      key={itemId}
                      todo={t}
                      confirming={confirmingId === itemId}
                      onRequestConfirm={() => setConfirmingId(id => id === itemId ? null : itemId)}
                      onConfirm={() => { onToggleTodo(t.goalIndex, t.stratIndex, t.measureIndex, t.id); setConfirmingId(null) }}
                      onCancel={() => setConfirmingId(null)}
                      onUpdate={(field, val) => onUpdateTodo && onUpdateTodo(t.goalIndex, t.stratIndex, t.measureIndex, t.id, field, val)}
                      members={members}
                      darkMode={darkMode}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
        </div>  {/* 佈局層 */}
      </div>  {/* 動畫層 */}
    </>
  )
}

function TodoItem({ todo, confirming, onRequestConfirm, onConfirm, onCancel, onUpdate, members, darkMode }) {
  const dark = darkMode
  const today = (() => { const _n = new Date(); return `${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}-${String(_n.getDate()).padStart(2,'0')}` })()
  const CY = dark ? B_YELLOW : B_YELLOW_LIGHT
  const CG = dark ? B_GREEN  : B_GREEN_LIGHT

  return (
    <div>
      <div
        className="b-todo-item"
        style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '7px 14px', cursor: 'pointer', transition: 'background 0.12s', background: confirming ? (dark ? 'rgba(30,50,180,0.25)' : 'rgba(0,0,255,0.08)') : 'transparent', opacity: todo.done && !confirming ? 0.6 : 1, borderLeft: `4px solid ${confirming ? B_BLUE : 'transparent'}` }}
        onClick={onRequestConfirm}
      >
        {/* Checkbox */}
        <div style={{ width: '16px', height: '16px', flexShrink: 0, marginTop: '2px', border: `2px solid ${todo.done ? CG : (dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)')}`, borderRadius: 0, background: todo.done ? CG : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', boxShadow: todo.done ? `0 0 6px ${CG}` : 'none' }}>
          {todo.done && <span style={{ fontSize: '9px', color: '#000', fontWeight: 900 }}>✓</span>}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '12px', color: todo.done ? (dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)') : (dark ? '#fff' : '#000'), textDecoration: todo.done ? 'line-through' : 'none', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '10px', color: dark ? '#7090ff' : B_BLUE, marginRight: '5px', fontWeight: 900 }}>P{todo.goalIndex+1}.{todo.stratIndex+1}.{todo.measureIndex+1}.{todo.todoIndex+1}</span>
                {todo.text}
              </span>
              {todo.todoOverdue && (
                <div style={{ marginTop: '4px' }}>
                  <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.05em', textTransform: 'uppercase', background: B_PINK, color: '#fff', padding: '2px 6px', border: '1px solid rgba(0,0,0,0.2)' }}>
                    已逾期 {todo.overdueDays} 天
                  </span>
                </div>
              )}
              {todo.todoUpcoming && !todo.todoOverdue && (
                <div style={{ marginTop: '4px' }}>
                  <span style={{
                    fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.05em', textTransform: 'uppercase',
                    background: todo.remainingDays === 0 ? B_BLUE : CY,
                    color: todo.remainingDays === 0 ? '#fff' : '#000',
                    padding: '2px 6px',
                    border: `1px solid ${todo.remainingDays === 0 ? '#fff' : 'rgba(0,0,0,0.2)'}`,
                    boxShadow: todo.remainingDays === 0 ? '0 0 8px rgba(0,0,255,0.45)' : 'none'
                  }}>
                    {todo.remainingDays === 0 ? '本日到期' : `剩餘 ${todo.remainingDays} 天`}
                  </span>
                </div>
              )}
            </div>
            {/* Inline assignee + deadline */}
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center', paddingTop: '1px' }} onClick={e => e.stopPropagation()}>
              <BrutalistSelect
                multiple
                value={todo.assignees ?? []}
                onChange={v => onUpdate && onUpdate('assignees', v)}
                options={(members || []).map(mb => ({ value: mb, label: mb }))}
                darkMode={darkMode}
                overdue={todo.todoOverdue}
                style={{ width: '180px', fontSize: '9px', fontWeight: 700, minHeight: '26px', boxSizing: 'border-box' }}
              />
              <input
                type="date"
                className={`tmp-date${todo.todoOverdue ? ' tmp-date-overdue' : ''}`}
                style={{ width: '108px', height: '26px', boxSizing: 'border-box', background: dark ? '#2b2b2b' : '#f0f0f0', border: `2px solid ${todo.todoOverdue ? '#cc0000' : (dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')}`, color: todo.todoOverdue ? '#cc0000' : (dark ? 'rgba(255,255,255,0.7)' : '#000'), fontSize: '9px', fontFamily: 'monospace', padding: '0 4px', outline: 'none', colorScheme: dark ? 'dark' : 'light', fontWeight: 700 }}
                value={todo.deadline || ''}
                max={todo.measureDeadline || undefined}
                onChange={e => {
                  const nextDeadline = e.target.value
                  if (todo.measureDeadline && nextDeadline && nextDeadline > todo.measureDeadline) return
                  onUpdate && onUpdate('deadline', nextDeadline)
                }}
              />
            </div>
          </div>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '9px', fontFamily: 'monospace', color: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)', fontWeight: 700 }}>
              G{todo.goalIndex + 1} › S{todo.goalIndex + 1}.{todo.stratIndex + 1} › D{todo.goalIndex + 1}.{todo.stratIndex + 1}.{todo.measureIndex + 1}
            </span>
            {todo.measureKpi && (
              <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, color: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{todo.measureKpi}</span>
            )}
            {todo.measureDeadline && (
              <span style={{ fontSize: '9px', fontFamily: 'monospace', fontWeight: 700, color: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)', border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, padding: '1px 5px' }}>{todo.measureDeadline}</span>
            )}
            {todo.measureStatus && (
              <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: STATUS_CONFIG[todo.measureStatus]?.color || '#8a95ae', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>● {STATUS_CONFIG[todo.measureStatus]?.label}</span>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation bar */}
      {confirming && (
        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px 11px 20px', background: dark ? 'rgba(0,0,200,0.55)' : 'rgba(0,0,255,0.3)', borderLeft: `4px solid ${B_BLUE}` }}>
          <span style={{ fontSize: '18px', color: dark ? '#7090ff' : B_BLUE, flexShrink: 0 }}>{todo.done ? '↩' : '☑'}</span>
          <span style={{ flex: 1, fontSize: '13px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: dark ? '#fff' : '#000', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
            {todo.done ? '確定要取消完成此項目？' : '確定要標記此項目為完成？'}
          </span>
          <button
            style={{ width: '72px', padding: '6px 0', border: `3px solid ${B_BLUE}`, background: B_BLUE, color: '#fff', fontSize: '12px', fontFamily: '"Space Grotesk", sans-serif', cursor: 'pointer', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', boxShadow: '3px 3px 0 0 #000', transition: 'all 0.12s', textAlign: 'center' }}
            onClick={onConfirm}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '5px 5px 0 0 #000'; e.currentTarget.style.background = '#FFFF00'; e.currentTarget.style.color = '#000'; e.currentTarget.style.borderColor = '#000'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '3px 3px 0 0 #000'; e.currentTarget.style.background = B_BLUE; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = B_BLUE; }}
            onMouseDown={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = '1px 1px 0 0 #000'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '5px 5px 0 0 #000'; }}
          >確定</button>
          <button
            style={{ width: '72px', padding: '6px 0', border: `3px solid ${dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}`, background: 'transparent', color: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)', fontSize: '12px', fontFamily: '"Space Grotesk", sans-serif', cursor: 'pointer', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', transition: 'all 0.12s', boxShadow: `3px 3px 0 0 ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.25)'}`, textAlign: 'center' }}
            onClick={onCancel}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `5px 5px 0 0 ${dark ? 'rgba(255,255,255,0.3)' : '#000'}`; e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.6)' : '#000'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `3px 3px 0 0 ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.25)'}`; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'; }}
            onMouseDown={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = `1px 1px 0 0 ${dark ? 'rgba(255,255,255,0.3)' : '#000'}`; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `5px 5px 0 0 ${dark ? 'rgba(255,255,255,0.3)' : '#000'}`; }}
          >取消</button>
        </div>
      )}
    </div>
  )
}