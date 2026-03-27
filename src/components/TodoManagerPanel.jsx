import { useState, useMemo } from 'react'

const STATUS_CONFIG = {
  NotStarted: { label: '未開始', color: '#a8b4c9' },
  InProgress:  { label: '進行中', color: '#3b9ede' },
  Completed:   { label: '已完成', color: '#4caf7d' },
  Overdue:     { label: '已逾期', color: '#e05252' },
}

const FILTERS = ['全部', '未完成', '已完成', '今日到期', '已逾期']

// 從 OGSM 資料結構攤平出所有 Todo，帶來源標籤
function flattenTodos(project) {
  const items = []
  const today = new Date().toISOString().slice(0, 10)

  project.goals.forEach((goal, gi) => {
    goal.strategies.forEach((st, si) => {
      st.measures.forEach((m, mi) => {
        ;(m.todos || []).forEach((t, ti) => {
          items.push({
            ...t,
            // 來源路徑
            goalIndex:     gi,
            stratIndex:    si,
            measureIndex:  mi,
            todoIndex:     ti,
            measureKpi:    m.kpi,
            measureDeadline: m.deadline || '',
            measureStatus: m.status,
            goalText:      goal.text,
            stratText:     st.text,
            // 是否逾期（依 MP 步驟自身期限早於今日）
            isOverdue: !t.done && !!(t.deadline && t.deadline < today),
            isDueToday: !t.done && t.deadline === today,
            // 向下相容保留
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
  const [groupBy, setGroupBy] = useState('measure') // 'measure' | 'goal' | 'status'
  const [sortDate, setSortDate] = useState('none')  // 'none' | 'asc' | 'desc'
  const [collapsedGroups, setCollapsedGroups] = useState(new Set())
  const [confirmingId, setConfirmingId] = useState(null)

  const toggleGroup = (key) => setCollapsedGroups(s => {
    const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n
  })

  const allTodos = useMemo(() => flattenTodos(project), [project])

  const today = new Date().toISOString().slice(0, 10)

  // 統計
  const stats = useMemo(() => ({
    total:    allTodos.length,
    done:     allTodos.filter(t => t.done).length,
    overdue:  allTodos.filter(t => t.isOverdue).length,
    dueToday: allTodos.filter(t => t.isDueToday).length,
    pct:      allTodos.length ? Math.round(allTodos.filter(t => t.done).length / allTodos.length * 100) : 0,
  }), [allTodos])

  // 篩選
  const filtered = useMemo(() => {
    let items = allTodos
    if (search.trim()) items = items.filter(t => t.text.includes(search.trim()) || t.measureKpi.includes(search.trim()))
    switch (filter) {
      case '未完成': items = items.filter(t => !t.done); break
      case '已完成': items = items.filter(t => t.done); break
      case '今日到期': items = items.filter(t => t.isDueToday); break
      case '已逾期': items = items.filter(t => t.isOverdue); break
    }
    // 日期排序
    if (sortDate !== 'none') {
      items = [...items].sort((a, b) => {
        const da = a.deadline || ''
        const db = b.deadline || ''
        if (!da && !db) return 0
        if (!da) return sortDate === 'asc' ? 1 : -1
        if (!db) return sortDate === 'asc' ? -1 : 1
        return sortDate === 'asc' ? da.localeCompare(db) : db.localeCompare(da)
      })
    }
    return items
  }, [allTodos, filter, search, sortDate])

  // 分組
  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(t => {
      let key, label
      if (groupBy === 'goal') {
        key   = `G${t.goalIndex + 1}`
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

  const T = darkMode ? DARK : LIGHT

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 450 }} onClick={onClose} />

      {/* Panel */}
      <div style={{ ...P.panel, background: T.panelBg, borderLeft: `1px solid ${T.border}` }}>

        {/* ── Header ── */}
        <div style={{ ...P.header, borderBottom: `1px solid ${T.border}` }}>
          <div>
            <div style={{ fontSize: '11px', fontFamily: '"DM Mono", monospace', color: '#d4a855', letterSpacing: '0.8px', marginBottom: '3px' }}>☑ MP 檢核步驟管理</div>
            <div style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: '17px', color: T.text }}>{project.title}</div>
          </div>
          <button style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: '16px', padding: '4px' }} onClick={onClose}>✕</button>
        </div>

        {/* ── 整體統計 ── */}
        <div style={{ ...P.statsRow, borderBottom: `1px solid ${T.border}` }}>
          {[
            { label: '總計', value: stats.total, color: T.text },
            { label: '完成', value: stats.done, color: '#4caf7d' },
            { label: '逾期', value: stats.overdue, color: '#e05252' },
            { label: '今日', value: stats.dueToday, color: '#f0a500' },
          ].map(({ label, value, color }) => (
            <div key={label} style={P.statBox}>
              <div style={{ fontSize: '20px', fontFamily: '"Syne", sans-serif', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: '10px', fontFamily: '"DM Mono", monospace', color: T.textMuted, marginTop: '3px' }}>{label}</div>
            </div>
          ))}
          {/* 進度條 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '5px', paddingLeft: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', fontFamily: '"DM Mono", monospace', color: T.textMuted }}>完成率</span>
              <span style={{ fontSize: '13px', fontFamily: '"DM Mono", monospace', fontWeight: 700, color: stats.pct === 100 ? '#4caf7d' : '#f0a500' }}>{stats.pct}%</span>
            </div>
            <div style={{ height: '5px', background: T.barTrack, borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stats.pct}%`, background: stats.pct === 100 ? '#4caf7d' : 'linear-gradient(90deg,#f0a500,#4caf7d)', borderRadius: '99px', transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>

        {/* ── 搜尋 + 篩選 + 分組 ── */}
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          {/* 搜尋 */}
          <input
            style={{ background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '5px', color: T.text, fontSize: '12px', fontFamily: '"Noto Sans TC", sans-serif', padding: '6px 10px', outline: 'none', width: '100%' }}
            placeholder="🔍 搜尋檢核步驟或定量指標名稱…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* 篩選 */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {FILTERS.map(f => (
                <button
                  key={f}
                  style={{ padding: '3px 9px', borderRadius: '99px', border: `1px solid ${filter === f ? '#f0a500' : T.border}`, background: filter === f ? 'rgba(240,165,0,0.15)' : 'transparent', color: filter === f ? '#f0a500' : T.textMuted, fontSize: '10px', fontFamily: '"DM Mono", monospace', cursor: 'pointer', transition: 'all 0.15s' }}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            {/* 分組 + 排序 */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', fontFamily: '"DM Mono", monospace', color: T.textMuted }}>分組：</span>
              {[['measure', '定量指標'], ['goal', 'Goal'], ['status', '狀態']].map(([v, l]) => (
                <button
                  key={v}
                  style={{ padding: '3px 8px', borderRadius: '4px', border: `1px solid ${groupBy === v ? '#3b9ede' : T.border}`, background: groupBy === v ? 'rgba(59,158,222,0.15)' : 'transparent', color: groupBy === v ? '#3b9ede' : T.textMuted, fontSize: '10px', fontFamily: '"DM Mono", monospace', cursor: 'pointer' }}
                  onClick={() => setGroupBy(v)}
                >{l}</button>
              ))}
              <span style={{ fontSize: '10px', fontFamily: '"DM Mono", monospace', color: T.textMuted, marginLeft: '6px' }}>排序：</span>
              <button
                style={{ padding: '3px 8px', borderRadius: '4px', border: `1px solid ${sortDate !== 'none' ? '#f472b6' : T.border}`, background: sortDate !== 'none' ? 'rgba(244,114,182,0.15)' : 'transparent', color: sortDate !== 'none' ? '#f472b6' : T.textMuted, fontSize: '10px', fontFamily: '"DM Mono", monospace', cursor: 'pointer', minWidth: '48px' }}
                onClick={() => setSortDate(s => s === 'none' ? 'asc' : s === 'asc' ? 'desc' : 'none')}
                title="點擊切換：預設 → 日期升序 → 日期降序"
              >
                {sortDate === 'none' ? '日期' : sortDate === 'asc' ? '日期↑' : '日期↓'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Todo 列表 ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0 40px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: T.textMuted, fontSize: '12px', fontFamily: '"DM Mono", monospace' }}>
              {search || filter !== '全部' ? '沒有符合的待辦事項' : '目前沒有待辦事項'}
            </div>
          ) : grouped.map(([groupKey, group]) => {
            const isCollapsed = collapsedGroups.has(groupKey)
            return (
            <div key={groupKey} style={{ marginBottom: '4px' }}>
              {/* Group header */}
              <div
                onClick={() => toggleGroup(groupKey)}
                style={{ padding: '8px 16px 4px', display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', userSelect: 'none' }}
              >
                <span style={{ fontSize: '10px', color: T.textMuted, flexShrink: 0, lineHeight: 1 }}>{isCollapsed ? '▸' : '▾'}</span>

                <span style={{ fontSize: '11px', fontFamily: '"Noto Sans TC", sans-serif', color: T.textSub, fontWeight: 600, flex: 1 }}>{group.label}</span>
                <span style={{ fontSize: '10px', fontFamily: '"DM Mono", monospace', color: '#4caf7d' }}>
                  {group.items.filter(t => t.done).length}/{group.items.length}
                </span>
              </div>

              {/* Todo items */}
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
                    T={T}
                  />
                )
              })}
            </div>
          )})}
        </div>
      </div>
    </>
  )
}

function TodoItem({ todo, confirming, onRequestConfirm, onConfirm, onCancel, onUpdate, members, darkMode, T }) {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div>
    <div
      style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '7px 16px', cursor: 'pointer', transition: 'background 0.15s', background: confirming ? (darkMode ? 'rgba(18, 189, 241, 0.20)' : 'rgba(59,158,222,0.14)') : 'transparent', opacity: todo.done && !confirming ? 0.6 : 1 }}
      onClick={onRequestConfirm}
    >
      {/* Checkbox */}
      <div style={{ width: '16px', height: '16px', flexShrink: 0, marginTop: '1px', border: `1.5px solid ${todo.done ? '#4caf7d' : T.checkboxBorder}`, borderRadius: '3px', background: todo.done ? '#4caf7d' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
        {todo.done && <span style={{ fontSize: '9px', color: '#000', fontWeight: 700 }}>✓</span>}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Main row: text + right-side badges */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '12px', color: todo.done ? T.textMuted : T.text, textDecoration: todo.done ? 'line-through' : 'none', fontFamily: '"Noto Sans TC", sans-serif', lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              <span style={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', color: '#5a9ade', marginRight: '4px' }}>P{todo.goalIndex+1}.{todo.stratIndex+1}.{todo.measureIndex+1}.{todo.todoIndex+1}</span>{todo.text}
            </span>
          </div>
          {/* Assignee + deadline — always shown, editable inline */}
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center', paddingTop: '1px' }} onClick={e => e.stopPropagation()}>
            <select
              style={{ width: '88px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: '3px', color: T.textMuted, fontSize: '9px', fontFamily: '"Noto Sans TC", sans-serif', padding: '1px 4px', outline: 'none', cursor: 'pointer', colorScheme: darkMode ? 'dark' : 'light' }}
              value={todo.assignee || ''}
              onChange={e => onUpdate && onUpdate('assignee', e.target.value)}
              onClick={e => e.stopPropagation()}
            >
              <option value=''>— 負責人 —</option>
              {(members || []).map(mb => <option key={mb} value={mb}>{mb}</option>)}
            </select>
            <input
              type="date"
              style={{ width: '108px', background: 'transparent', border: `1px solid ${todo.todoOverdue ? 'rgba(224,82,82,0.4)' : T.border}`, borderRadius: '3px', color: todo.todoOverdue ? '#e05252' : T.textMuted, fontSize: '9px', fontFamily: '"DM Mono", monospace', padding: '1px 4px', outline: 'none', colorScheme: darkMode ? 'dark' : 'light' }}
              value={todo.deadline || ''}
              onChange={e => onUpdate && onUpdate('deadline', e.target.value)}
            />
          </div>
        </div>
        {/* Source breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '9px', fontFamily: '"DM Mono", monospace', color: T.textMuted, opacity: 0.7 }}>
            G{todo.goalIndex + 1} › S{todo.goalIndex + 1}.{todo.stratIndex + 1} › D{todo.goalIndex + 1}.{todo.stratIndex + 1}.{todo.measureIndex + 1}
          </span>
          {/* KPI */}
          {todo.measureKpi && (
            <span style={{ fontSize: '9px', fontFamily: '"Noto Sans TC", sans-serif', color: T.textMuted, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {todo.measureKpi}
            </span>
          )}
          {/* MD deadline badge */}
          {todo.measureDeadline && (
            <span style={{
              fontSize: '9px', fontFamily: '"DM Mono", monospace', padding: '1px 5px', borderRadius: '99px',
              background: 'transparent', color: T.textMuted, border: `1px solid ${T.border}`
            }}>
              {todo.measureDeadline}
            </span>
          )}
          {/* KPI Status */}
          {todo.measureStatus && (
            <span style={{ fontSize: '9px', fontFamily: '"DM Mono", monospace', color: STATUS_CONFIG[todo.measureStatus]?.color || '#8a95ae', opacity: 0.8 }}>
              ● {STATUS_CONFIG[todo.measureStatus]?.label}
            </span>
          )}
        </div>
      </div>
    </div>

    {/* ── Confirmation bar ── */}
    {confirming && (
      <div
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px 11px 19px', background: darkMode ? 'rgba(47, 124, 219, 0.4)' : 'rgba(47, 134, 192, 0.25)' }}
      >
        <span style={{ fontSize: '15px', color: darkMode ? '#a8d8ff' : '#0a4899', flexShrink: 0 }}>
          {todo.done ? '↩' : '☑'}
        </span>
        <span style={{ flex: 1, fontSize: '13px', fontFamily: '"Noto Sans TC", sans-serif', fontWeight: 700, color: darkMode ? '#f0f7ff' : '#082a5e', letterSpacing: '0.3px' }}>
          {todo.done ? '確定要取消完成此項目？' : '確定要標記此項目為完成？'}
        </span>
        <button
          onClick={onConfirm}
          style={{ padding: '4px 16px', borderRadius: '5px', border: 'none', background: darkMode ? '#62c1ea' : '#058feb', color: '#fff', fontSize: '12px', fontFamily: '"Noto Sans TC", sans-serif', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.5px', boxShadow: '0 1px 4px rgba(59,158,222,0.4)' }}
        >確定</button>
        <button
          onClick={onCancel}
          style={{ padding: '4px 12px', borderRadius: '5px', border: 'none', background: darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0,0,0,0.08)', color: darkMode ? '#c8ddf5' : '#2a4a80', fontSize: '12px', fontFamily: '"Noto Sans TC", sans-serif', cursor: 'pointer', fontWeight: 500 }}
        >取消</button>
      </div>
    )}
    </div>
  )
}

// ── Style tokens ────────────────────────────────────────────
const DARK = {
  panelBg:       '#161b27',
  border:        '#2a3347',
  text:          '#e8ecf4',
  textSub:       '#c0c8d8',
  textMuted:     '#8a95ae',
  inputBg:       '#1e2535',
  barTrack:      '#2a3347',
  checkboxBorder:'#334060',
}
const LIGHT = {
  panelBg:       '#ffffff',
  border:        '#d1d9e8',
  text:          '#1a2133',
  textSub:       '#445069',
  textMuted:     '#8a9ab8',
  inputBg:       '#f3f7fd',
  barTrack:      '#d4dde8',
  checkboxBorder:'#c8d4e8',
}

const P = {
  panel: {
    position: 'fixed', top: 0, right: 0, bottom: 0,
    width: '680px', maxWidth: '92vw',
    display: 'flex', flexDirection: 'column',
    zIndex: 451,
    animation: 'slideInRight 0.25s ease',
    boxShadow: '-20px 0 60px rgba(0,0,0,0.4)',
  },
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '22px 20px 14px', flexShrink: 0,
  },
  statsRow: {
    display: 'flex', alignItems: 'stretch', gap: '0',
    padding: '12px 16px', flexShrink: 0,
  },
  statBox: {
    flex: '0 0 52px', textAlign: 'center',
    padding: '4px 8px',
  },
}