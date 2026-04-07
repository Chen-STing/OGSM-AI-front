import { useState } from 'react'
import BrutalistSelect from './BrutalistSelect.jsx'

const TODOLIST_CSS = `
  .tl-date::-webkit-calendar-picker-indicator {
    cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M14 6 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%23000000" /><path d="M10 2 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%23FF00FF" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></svg>') 10 2, pointer !important;
  }
  .tl-date-overdue::-webkit-calendar-picker-indicator {
    filter: brightness(0) saturate(100%) invert(12%) sepia(90%) saturate(6000%) hue-rotate(0deg) brightness(85%) !important;
    cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M14 6 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%23000000" /><path d="M10 2 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%23FF00FF" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></svg>') 10 2, pointer !important;
  }
`

export default function TodoList({ todos = [], onChange, editMode, members = [], darkMode = true, noHeader = false }) {
  const [inputVal, setInputVal] = useState('')
  const [open, setOpen] = useState(false)

  const addTodo = () => {
    const text = inputVal.trim()
    if (!text) return
    onChange([...todos, {
      id: crypto.randomUUID(),
      text,
      done: false,
      assignees: [],
      startDate: '',
      deadline: '',
      createdAt: new Date().toISOString()
    }])
    setInputVal('')
  }

  const toggleTodo = (id) =>
    onChange(todos.map(t => t.id === id ? { ...t, done: !t.done } : t))

  const updateTodoField = (id, field, value) =>
    onChange(todos.map(t => t.id === id ? { ...t, [field]: value } : t))

  const removeTodo = (id) =>
    onChange(todos.filter(t => t.id !== id))

  const handleKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTodo() }
  }

  const doneCount = todos.filter(t => t.done).length
  const pct = todos.length ? Math.round((doneCount / todos.length) * 100) : 0

  const progressColor = doneCount === 0
    ? (darkMode ? '#8a96a8' : '#9aaaba')
    : doneCount === todos.length
      ? (darkMode ? '#4caf7d' : '#2a9060')
      : (darkMode ? '#3b9ede' : '#1a7bbf')

  const s = buildStyles(darkMode)

  if (todos.length === 0 && !editMode) return null

  const today = (() => { const _n = new Date(); return `${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}-${String(_n.getDate()).padStart(2,'0')}` })()

  const content = (
    <>
      {/* Todo items */}
      <div style={s.list}>
        {todos.map(t => {
          const isOverdue = t.deadline && t.deadline < today && !t.done
          return (
            <div key={t.id} style={{ ...s.item, ...(t.done ? s.itemDone : {}) }}>
              {/* Checkbox + text row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', flex: 1, minWidth: 0 }}>
                <button
                  style={{ ...s.checkbox, ...(t.done ? s.checkboxDone : {}), marginTop: '2px', flexShrink: 0 }}
                  onClick={() => toggleTodo(t.id)}
                >
                  {t.done && <span style={s.checkmark}>✓</span>}
                </button>
                <span
                  style={{ ...s.itemText, ...(t.done ? s.itemTextDone : {}), cursor: 'pointer', userSelect: 'none', flex: 1 }}
                  onClick={() => toggleTodo(t.id)}
                >
                  {t.text}
                </span>
              </div>

              {/* Meta: assignee + deadline */}
              <div style={s.todoMeta}>
                <BrutalistSelect
                  multiple
                  value={t.assignees ?? []}
                  onChange={v => updateTodoField(t.id, 'assignees', v)}
                  options={members.map(mb => ({ value: mb, label: mb }))}
                  darkMode={darkMode}
                  style={{ ...s.assigneeInput, padding: '1px 4px' }}
                />

                {editMode ? (
                  <div style={{ ...s.todoDateRange, ...(isOverdue ? s.todoDateRangeOverdue : {}) }}>
                    <input
                      type="date"
                      className={isOverdue ? 'tl-date-overdue' : 'tl-date'}
                      style={{ ...s.todoRangeInput, ...(isOverdue ? s.todoRangeInputOverdue : {}) }}
                      value={t.startDate || ''}
                      max={t.deadline || undefined}
                      onChange={e => updateTodoField(t.id, 'startDate', e.target.value)}
                      title="開始日期"
                    />
                    <span style={s.todoRangeArrow}>→</span>
                    <input
                      type="date"
                      className={isOverdue ? 'tl-date-overdue' : 'tl-date'}
                      style={{ ...s.todoRangeInput, ...(isOverdue ? s.todoRangeInputOverdue : {}) }}
                      value={t.deadline || ''}
                      min={t.startDate || undefined}
                      onChange={e => updateTodoField(t.id, 'deadline', e.target.value)}
                      title="截止日期"
                    />
                  </div>
                ) : (t.startDate || t.deadline) ? (
                  <span style={{ ...s.deadlineBadge, ...(isOverdue ? s.deadlineBadgeOverdue : {}) }}>
                    {t.startDate || '—'} → {t.deadline || '—'}
                  </span>
                ) : null}

                {editMode && (
                  <button className="ogsm-remove-btn" style={s.removeBtn} onClick={() => removeTodo(t.id)}>✕</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      {editMode && (
        <div style={s.inputRow}>
          <input
            style={s.input}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={handleKey}
            placeholder="新增待辦事項…"
          />
          <button
            className="ogsm-add-btn"
            style={{ ...s.addBtn, ...(inputVal.trim() ? s.addBtnActive : {}) }}
            onClick={addTodo}
            disabled={!inputVal.trim()}
          >
            +
          </button>
        </div>
      )}
    </>
  )

  if (noHeader) {
    return <div style={s.wrap}><style>{TODOLIST_CSS}</style>{content}</div>
  }

  return (
    <div style={s.wrap}>
      <style>{TODOLIST_CSS}</style>
      {/* Header — click to toggle */}
      <div style={s.header} onClick={() => setOpen(o => !o)}>
        <span style={s.headerLabel}>
          {open ? '▾' : '▸'} 待辦事項{todos.length > 0 ? ` (${todos.length})` : ''}
        </span>
        {todos.length > 0 && (
          <div style={s.progressPill}>
            <div style={s.pillTrack}>
              <div style={{ ...s.pillFill, width: `${pct}%`, background: progressColor }} />
            </div>
            <span style={{ ...s.pillText, color: progressColor }}>{doneCount}/{todos.length}</span>
          </div>
        )}
      </div>
      {open && content}
    </div>
  )
}

function buildStyles(dark) {
  const T = dark ? {
    wrapBg:          'rgba(240,165,0,0.02)',
    wrapBorder:      '#2a3347',
    inputBg:         '#1e2535',
    inputBorder:     '#2a3347',
    inputColor:      '#e8ecf4',
    addBtnBg:        '#2a3347',
    addBtnBorder:    '#334060',
    addBtnColor:     '#4a5568',
    itemText:        '#cbd4e6',
    itemTextDone:    '#9aa8b8',
    checkboxBorder:  '#334060',
    pillTrack:       '#2a3347',
    metaInputBg:     '#1e2840',
    metaInputBorder: '#3d5080',
    metaInputColor:  '#c8d8f0',
  } : {
    wrapBg:          'rgba(204,119,0,0.03)',
    wrapBorder:      '#c8d4e8',
    inputBg:         '#edf2fa',
    inputBorder:     '#c8d4e8',
    inputColor:      '#1a2133',
    addBtnBg:        '#eaf0f8',
    addBtnBorder:    '#c8d4e8',
    addBtnColor:     '#8a9ab8',
    itemText:        '#445069',
    itemTextDone:    '#8a9ab8',
    checkboxBorder:  '#8a9ab8',
    pillTrack:       '#d4dde8',
    metaInputBg:     '#f3f7fd',
    metaInputBorder: '#c8d4e8',
    metaInputColor:  '#5a6e88',
  }
  return {
    wrap: {
      borderTop: `1px dashed ${T.wrapBorder}`,
      padding: '8px 12px 10px',
      background: T.wrapBg,
    },
    header: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: '6px', cursor: 'pointer', userSelect: 'none',
    },
    headerLabel: {
      fontSize: '10px', fontFamily: '"DM Mono", monospace',
      color: '#f0a500', letterSpacing: '0.8px', fontWeight: 600,
    },
    progressPill: { display: 'flex', alignItems: 'center', gap: '6px' },
    pillTrack: { width: '48px', height: '3px', background: T.pillTrack, borderRadius: '99px', overflow: 'hidden' },
    pillFill: { height: '100%', background: '#4caf7d', borderRadius: '99px', transition: 'width 0.3s ease' },
    pillText: { fontSize: '10px', fontFamily: '"DM Mono", monospace', color: '#4caf7d' },

    list: { display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '6px' },
    item: {
      display: 'flex', alignItems: 'flex-start', gap: '7px',
      padding: '5px 4px',
      borderRadius: '4px',
      transition: 'background 0.12s',
      flexWrap: 'wrap',
    },
    itemDone: { opacity: 0.7 },

    checkbox: {
      width: '15px', height: '15px', flexShrink: 0,
      border: `1.5px solid ${T.checkboxBorder}`, borderRadius: '3px',
      backgroundColor: 'transparent', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 0, outline: 'none',
    },
    checkboxDone: { backgroundColor: '#4caf7d', border: '1.5px solid #4caf7d' },
    checkmark: { fontSize: '9px', color: '#000', fontWeight: 700, lineHeight: 1 },

    itemText: {
      flex: 1, fontSize: '11px', color: T.itemText,
      fontFamily: '"Noto Sans TC", sans-serif', lineHeight: 1.4,
    },
    itemTextDone: {
      textDecoration: 'line-through', color: T.itemTextDone,
    },

    todoMeta: {
      display: 'flex', alignItems: 'center', gap: '5px',
      flexShrink: 0, flexWrap: 'wrap',
    },
    assigneeInput: {
      background: T.metaInputBg,
      border: `1px solid ${T.metaInputBorder}`,
      borderRadius: '3px',
      color: T.metaInputColor,
      fontSize: '10px',
      fontFamily: '"Noto Sans TC", sans-serif',
      padding: '2px 4px',
      outline: 'none',
      cursor: 'pointer',
      width: '88px',
      colorScheme: dark ? 'dark' : 'light',
    },
    todoDeadlineInput: {
      background: T.metaInputBg,
      border: `1px solid ${T.metaInputBorder}`,
      borderRadius: '3px',
      color: T.metaInputColor,
      fontSize: '10px',
      fontFamily: '"DM Mono", monospace',
      padding: '2px 4px',
      outline: 'none',
      colorScheme: dark ? 'dark' : 'light',
      width: '106px',
    },
    todoDateRange: {
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      background: T.metaInputBg,
      border: `1px solid ${T.metaInputBorder}`,
      borderRadius: '3px',
      padding: '0 3px',
      height: '22px',
      boxSizing: 'border-box',
    },
    todoDateRangeOverdue: {
      borderColor: 'rgba(239,68,68,0.4)',
    },
    todoRangeInput: {
      width: '74px',
      background: 'none',
      border: 'none',
      color: T.metaInputColor,
      fontSize: '10px',
      fontFamily: '"DM Mono", monospace',
      outline: 'none',
      colorScheme: dark ? 'dark' : 'light',
      padding: 0,
      height: '18px',
    },
    todoRangeInputOverdue: {
      color: '#ef4444',
    },
    todoRangeArrow: {
      fontSize: '9px',
      color: dark ? '#8ea0b8' : '#7a8aa2',
      userSelect: 'none',
      lineHeight: 1,
    },
    todoDeadlineOverdue: {
      color: '#ef4444',
      borderColor: 'rgba(239,68,68,0.4)',
    },
    assigneeBadge: {
      fontSize: '10px',
      fontFamily: '"Noto Sans TC", sans-serif',
      color: dark ? '#c8d8f0' : '#5a6e88',
      background: dark ? 'rgba(100,140,210,0.15)' : 'rgba(90,110,136,0.08)',
      border: `1px solid ${dark ? '#3d5080' : '#c8d4e8'}`,
      borderRadius: '3px',
      padding: '1px 5px',
      whiteSpace: 'nowrap',
    },
    deadlineBadge: {
      fontSize: '10px',
      fontFamily: '"DM Mono", monospace',
      color: dark ? '#c8d8f0' : '#5a6e88',
      background: dark ? 'rgba(100,140,210,0.15)' : 'rgba(90,110,136,0.08)',
      border: `1px solid ${dark ? '#3d5080' : '#c8d4e8'}`,
      borderRadius: '3px',
      padding: '1px 5px',
      whiteSpace: 'nowrap',
    },
    deadlineBadgeOverdue: {
      color: '#ef4444',
      background: 'rgba(239,68,68,0.08)',
      borderColor: 'rgba(239,68,68,0.3)',
    },
    removeBtn: {
      background: 'rgba(239,68,68,0.15)',
      border: '1px solid rgba(239,68,68,0.3)',
      color: '#ef4444',
      cursor: 'pointer', fontSize: '10px', padding: '2px 5px',
      borderRadius: '3px', lineHeight: 1,
      transition: 'all 0.2s', flexShrink: 0, fontWeight: 600,
    },

    inputRow: { display: 'flex', gap: '6px', alignItems: 'center' },
    input: {
      flex: 1, background: T.inputBg, border: `1px solid ${T.inputBorder}`,
      borderRadius: '4px', color: T.inputColor, fontSize: '11px',
      fontFamily: '"Noto Sans TC", sans-serif', padding: '5px 8px',
      outline: 'none',
    },
    addBtn: {
      width: '24px', height: '24px', flexShrink: 0,
      background: T.addBtnBg, border: `1px solid ${T.addBtnBorder}`,
      borderRadius: '4px', color: T.addBtnColor,
      cursor: 'pointer', fontSize: '16px', lineHeight: 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.15s',
    },
    addBtnActive: { background: '#f0a500', borderColor: '#f0a500', color: '#000' },
  }
}