import { useState, useMemo } from 'react'

// ─── BRUTALIST TOKENS ────────────────────────────────────────────────────────
const B_YELLOW = '#FFFF00'
const B_BLUE   = '#0000FF'
const B_PINK   = '#FF00FF'
const B_GREEN  = '#00FF00'

const STATUS_CONFIG = {
  NotStarted: { label: '未開始', color: '#a8b4c9' },
  InProgress:  { label: '進行中', color: '#3b9ede' },
  Completed:   { label: '已完成', color: '#4caf7d' },
  Overdue:     { label: '已逾期', color: '#e05252' },
}

const FILTERS = ['全部', '未完成', '已完成', '今日到期', '已逾期']

function flattenTodos(project) {
  const items = []
  const today = new Date().toISOString().slice(0, 10)
  project.goals.forEach((goal, gi) => {
    goal.strategies.forEach((st, si) => {
      st.measures.forEach((m, mi) => {
        ;(m.todos || []).forEach((t, ti) => {
          items.push({
            ...t,
            goalIndex: gi, stratIndex: si, measureIndex: mi, todoIndex: ti,
            measureKpi: m.kpi, measureDeadline: m.deadline || '',
            measureStatus: m.status, goalText: goal.text, stratText: st.text,
            isOverdue: !t.done && !!(t.deadline && t.deadline < today),
            isDueToday: !t.done && t.deadline === today,
            todoOverdue: t.deadline && t.deadline < today && !t.done,
            todoDueToday: t.deadline === today && !t.done,
          })
        })
      })
    })
  })
  return items
}

export default function TodoManagerPanel({ project, onClose, onToggleTodo, onUpdateTodo, members = [], darkMode = true }) {
  const [filter, setFilter]   = useState('全部')
  const [search, setSearch]   = useState('')
  const [groupBy, setGroupBy] = useState('measure')
  const [sortDate, setSortDate] = useState('none')
  const [collapsedGroups, setCollapsedGroups] = useState(new Set())
  const [confirmingId, setConfirmingId] = useState(null)

  const toggleGroup = (key) => setCollapsedGroups(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })

  const allTodos = useMemo(() => flattenTodos(project), [project])
  const today = new Date().toISOString().slice(0, 10)

  const stats = useMemo(() => ({
    total:    allTodos.length,
    done:     allTodos.filter(t => t.done).length,
    overdue:  allTodos.filter(t => t.isOverdue).length,
    dueToday: allTodos.filter(t => t.isDueToday).length,
    pct:      allTodos.length ? Math.round(allTodos.filter(t => t.done).length / allTodos.length * 100) : 0,
  }), [allTodos])

  const filtered = useMemo(() => {
    let items = allTodos
    if (search.trim()) items = items.filter(t => t.text.includes(search.trim()) || t.measureKpi.includes(search.trim()))
    switch (filter) {
      case '未完成': items = items.filter(t => !t.done); break
      case '已完成': items = items.filter(t => t.done); break
      case '今日到期': items = items.filter(t => t.isDueToday); break
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
        key   = t.done ? 'done' : t.isOverdue ? 'overdue' : t.isDueToday ? 'today' : 'pending'
        label = t.done ? '✓ 已完成' : t.isOverdue ? '⚠ 已逾期' : t.isDueToday ? '📅 今日到期' : '○ 待處理'
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

  return (
    <>
      <style>{`
        @keyframes b-slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes b-progress-pulse { 0%,100% { box-shadow: 0 0 4px ${B_YELLOW}; } 50% { box-shadow: 0 0 12px ${B_YELLOW}; } }
        .b-todo-item:hover { background: ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'} !important; }
        .b-filter-chip:hover { background: rgba(255,255,0,0.15) !important; border-color: ${B_YELLOW} !important; color: ${B_YELLOW} !important; }
        .b-group-btn:hover { color: ${dark ? B_BLUE : B_BLUE} !important; border-color: ${B_BLUE} !important; }
        .b-sort-btn:hover { color: ${B_PINK} !important; border-color: ${B_PINK} !important; }
        .b-confirm-yes:hover { background: ${B_BLUE} !important; box-shadow: 3px 3px 0 #000 !important; transform: translate(-1px,-1px); }
        .b-confirm-no:hover { background: ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'} !important; }
      `}</style>

      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', zIndex: 450 }} onClick={onClose} />

      {/* Panel */}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '680px', maxWidth: '92vw', background: dark ? '#111' : '#f0f0f0', borderLeft: `4px solid ${dark ? 'rgba(255,255,255,0.2)' : '#000'}`, boxShadow: dark ? '-8px 0 0 rgba(255,255,255,0.05)' : '-8px 0 0 #000', display: 'flex', flexDirection: 'column', zIndex: 451, animation: 'b-slide-in-right 0.25s ease' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 18px 14px', borderBottom: `4px solid ${dark ? 'rgba(255,255,255,0.15)' : '#000'}`, flexShrink: 0, background: dark ? '#000' : '#000' }}>
          <div>
            <div style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: B_YELLOW, letterSpacing: '0.12em', marginBottom: '3px', textTransform: 'uppercase' }}>☑ MP 檢核步驟管理</div>
            <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '17px', color: '#fff', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>{project.title}</div>
          </div>
          <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '18px', padding: '4px', lineHeight: 1, transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color = B_PINK} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'} onClick={onClose}>✕</button>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'flex', alignItems: 'stretch', padding: '12px 16px', borderBottom: `4px solid ${dark ? 'rgba(255,255,255,0.1)' : '#000'}`, flexShrink: 0, gap: '0', background: dark ? '#1a1a1a' : '#fff' }}>
          {[
            { label: '總計', value: stats.total, color: dark ? '#fff' : '#000' },
            { label: '完成', value: stats.done, color: B_GREEN },
            { label: '逾期', value: stats.overdue, color: B_PINK },
            { label: '今日', value: stats.dueToday, color: B_YELLOW },
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
              <span style={{ fontSize: '14px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: stats.pct === 100 ? B_GREEN : B_YELLOW, fontStyle: 'italic', textShadow: `0 0 6px ${stats.pct === 100 ? B_GREEN : B_YELLOW}` }}>{stats.pct}%</span>
            </div>
            <div style={{ height: '5px', background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stats.pct}%`, background: stats.pct === 100 ? B_GREEN : `linear-gradient(90deg,${B_YELLOW},${B_GREEN})`, transition: 'width 0.4s ease', boxShadow: `0 0 6px ${stats.pct === 100 ? B_GREEN : B_YELLOW}`, animation: stats.pct > 0 && stats.pct < 100 ? 'b-progress-pulse 2s ease-in-out infinite' : 'none' }} />
            </div>
          </div>
        </div>

        {/* ── Search + Filter + Group ── */}
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: `3px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`, flexShrink: 0, background: dark ? '#1a1a1a' : '#fff' }}>
          {/* Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: dark ? '#2b2b2b' : '#f0f0f0', border: `3px solid ${dark ? 'rgba(255,255,255,0.2)' : '#000'}` }}>
            <span style={{ position: 'absolute', left: '10px', fontSize: '12px', opacity: 0.5, color: dark ? '#fff' : '#000' }}>🔍</span>
            <input
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: dark ? '#fff' : '#000', fontSize: '12px', padding: '7px 10px 7px 32px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700 }}
              placeholder="搜尋檢核步驟或定量指標名稱…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Filter chips */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {FILTERS.map(f => (
                <button key={f} className="b-filter-chip" style={{ padding: '3px 9px', border: `2px solid ${filter === f ? '#000' : (dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')}`, background: filter === f ? B_YELLOW : 'transparent', color: filter === f ? '#000' : (dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'), fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, cursor: 'pointer', transition: 'all 0.12s', textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: filter === f ? '2px 2px 0 #000' : 'none' }} onClick={() => setFilter(f)}>{f}</button>
              ))}
            </div>

            {/* Group + Sort */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>分組：</span>
              {[['measure', '定量指標'], ['goal', 'GOAL'], ['status', '狀態']].map(([v, l]) => (
                <button key={v} className="b-group-btn" style={{ padding: '3px 8px', border: `2px solid ${groupBy === v ? B_BLUE : (dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')}`, background: groupBy === v ? B_BLUE : 'transparent', color: groupBy === v ? '#fff' : (dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, cursor: 'pointer', transition: 'all 0.12s', textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: groupBy === v ? '2px 2px 0 #000' : 'none' }} onClick={() => setGroupBy(v)}>{l}</button>
              ))}
              <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginLeft: '6px' }}>排序：</span>
              <button className="b-sort-btn" style={{ padding: '3px 8px', border: `2px solid ${sortDate !== 'none' ? B_PINK : (dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')}`, background: sortDate !== 'none' ? B_PINK : 'transparent', color: sortDate !== 'none' ? '#000' : (dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, cursor: 'pointer', minWidth: '48px', transition: 'all 0.12s', textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: sortDate !== 'none' ? '2px 2px 0 #000' : 'none' }} onClick={() => setSortDate(s => s === 'none' ? 'asc' : s === 'asc' ? 'desc' : 'none')} title="點擊切換：預設 → 日期升序 → 日期降序">
                {sortDate === 'none' ? '日期' : sortDate === 'asc' ? '日期↑' : '日期↓'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Todo list ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 40px', scrollbarWidth: 'thin' }}>
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
                  <span style={{ fontSize: '10px', color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', flexShrink: 0, lineHeight: 1, fontWeight: 900 }}>{isCollapsed ? '▸' : '▾'}</span>
                  <span style={{ fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', color: dark ? 'rgba(255,255,255,0.7)' : '#000', fontWeight: 900, flex: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{group.label}</span>
                  <span style={{ fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: B_GREEN, fontStyle: 'italic' }}>
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
      </div>
    </>
  )
}

function TodoItem({ todo, confirming, onRequestConfirm, onConfirm, onCancel, onUpdate, members, darkMode }) {
  const dark = darkMode
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div>
      <div
        className="b-todo-item"
        style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '7px 14px', cursor: 'pointer', transition: 'background 0.12s', background: confirming ? (dark ? 'rgba(0,0,255,0.15)' : 'rgba(0,0,255,0.08)') : 'transparent', opacity: todo.done && !confirming ? 0.6 : 1, borderLeft: `4px solid ${confirming ? B_BLUE : 'transparent'}` }}
        onClick={onRequestConfirm}
      >
        {/* Checkbox */}
        <div style={{ width: '16px', height: '16px', flexShrink: 0, marginTop: '2px', border: `2px solid ${todo.done ? B_GREEN : (dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)')}`, borderRadius: 0, background: todo.done ? B_GREEN : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', boxShadow: todo.done ? `0 0 6px ${B_GREEN}` : 'none' }}>
          {todo.done && <span style={{ fontSize: '9px', color: '#000', fontWeight: 900 }}>✓</span>}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '12px', color: todo.done ? (dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)') : (dark ? '#fff' : '#000'), textDecoration: todo.done ? 'line-through' : 'none', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '10px', color: B_BLUE, marginRight: '5px', fontWeight: 900 }}>P{todo.goalIndex+1}.{todo.stratIndex+1}.{todo.measureIndex+1}.{todo.todoIndex+1}</span>
                {todo.text}
              </span>
            </div>
            {/* Inline assignee + deadline */}
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center', paddingTop: '1px' }} onClick={e => e.stopPropagation()}>
              <select
                style={{ width: '88px', background: dark ? '#2b2b2b' : '#f0f0f0', border: `2px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, color: dark ? 'rgba(255,255,255,0.7)' : '#000', fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, padding: '1px 4px', outline: 'none', cursor: 'pointer', colorScheme: dark ? 'dark' : 'light' }}
                value={todo.assignee || ''}
                onChange={e => onUpdate && onUpdate('assignee', e.target.value)}
                onClick={e => e.stopPropagation()}
              >
                <option value=''>— 負責人 —</option>
                {(members || []).map(mb => <option key={mb} value={mb}>{mb}</option>)}
              </select>
              <input
                type="date"
                style={{ width: '108px', background: dark ? '#2b2b2b' : '#f0f0f0', border: `2px solid ${todo.todoOverdue ? B_PINK : (dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')}`, color: todo.todoOverdue ? B_PINK : (dark ? 'rgba(255,255,255,0.7)' : '#000'), fontSize: '9px', fontFamily: 'monospace', padding: '1px 4px', outline: 'none', colorScheme: dark ? 'dark' : 'light', fontWeight: 700 }}
                value={todo.deadline || ''}
                onChange={e => onUpdate && onUpdate('deadline', e.target.value)}
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
        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px 11px 20px', background: dark ? 'rgba(0,0,255,0.25)' : 'rgba(0,0,255,0.12)', borderLeft: `4px solid ${B_BLUE}` }}>
          <span style={{ fontSize: '16px', color: dark ? B_BLUE : B_BLUE, flexShrink: 0 }}>{todo.done ? '↩' : '☑'}</span>
          <span style={{ flex: 1, fontSize: '13px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: dark ? '#fff' : '#000', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
            {todo.done ? '確定要取消完成此項目？' : '確定要標記此項目為完成？'}
          </span>
          <button className="b-confirm-yes" style={{ padding: '5px 18px', border: `3px solid ${B_BLUE}`, background: dark ? B_BLUE : B_BLUE, color: '#fff', fontSize: '12px', fontFamily: '"Space Grotesk", sans-serif', cursor: 'pointer', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', boxShadow: '3px 3px 0 #000', transition: 'all 0.12s' }} onClick={onConfirm}>確定</button>
          <button className="b-confirm-no" style={{ padding: '5px 14px', border: `2px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`, background: 'transparent', color: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)', fontSize: '12px', fontFamily: '"Space Grotesk", sans-serif', cursor: 'pointer', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', transition: 'all 0.12s' }} onClick={onCancel}>取消</button>
        </div>
      )}
    </div>
  )
}