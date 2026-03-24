import { useState } from 'react'

export default function TodoList({ todos = [], onChange, editMode, darkMode = true, noHeader = false }) {
  const [inputVal, setInputVal] = useState('')
  const [open, setOpen] = useState(false)

  const addTodo = () => {
    const text = inputVal.trim()
    if (!text) return
    onChange([...todos, { id: crypto.randomUUID(), text, done: false, createdAt: new Date().toISOString() }])
    setInputVal('')
  }

  const toggleTodo = (id) =>
    onChange(todos.map(t => t.id === id ? { ...t, done: !t.done } : t))

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

  const content = (
    <>
      {/* Todo items */}
      <div style={s.list}>
        {todos.map(t => (
          <div key={t.id} style={{ ...s.item, ...(t.done ? s.itemDone : {}) }}>
            <button style={{ ...s.checkbox, ...(t.done ? s.checkboxDone : {}) }} onClick={() => toggleTodo(t.id)}>
              {t.done && <span style={s.checkmark}>✓</span>}
            </button>
            <span style={{ ...s.itemText, ...(t.done ? s.itemTextDone : {}) }}>{t.text}</span>
            {editMode && (
              <button className="ogsm-remove-btn" style={s.removeBtn} onClick={() => removeTodo(t.id)}>✕</button>
            )}
          </div>
        ))}
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
          <button className="ogsm-add-btn" style={{ ...s.addBtn, ...(inputVal.trim() ? s.addBtnActive : {}) }} onClick={addTodo} disabled={!inputVal.trim()}>
            +
          </button>
        </div>
      )}
    </>
  )

  if (noHeader) {
    return <div style={s.wrap}>{content}</div>
  }

  return (
    <div style={s.wrap}>
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

    list: { display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '6px' },
    item: {
      display: 'flex', alignItems: 'center', gap: '7px',
      padding: '4px 4px',
      borderRadius: '4px',
      transition: 'background 0.12s',
    },
    itemDone: {},

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