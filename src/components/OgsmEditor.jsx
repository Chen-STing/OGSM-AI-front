import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import TodoList from './TodoList.jsx'
import TodoManagerPanel from './TodoManagerPanel.jsx'
import AiConfirmDialog from './AiConfirmDialog.jsx'
import { api } from '../services/api.js'

const emptyMeasure  = (type = 'MP') => ({ id: null, type, kpi: '', target: '', actual: '', progress: 0, status: 'NotStarted', deadline: '', todos: [], sortOrder: 0 })
const emptyStrategy = () => ({ id: null, text: '', sortOrder: 0, measures: [emptyMeasure()], todos: [] })
const emptyGoal     = () => ({ id: null, text: '', sortOrder: 0, strategies: [emptyStrategy()] })

const STATUS_CONFIG = {
  NotStarted: { label: '未開始', color: '#a8b4c9', bg: 'rgba(168,180,201,0.12)', border: '#a8b4c9' },
  InProgress:  { label: '進行中', color: '#3b9ede', bg: 'rgba(59,158,222,0.12)', border: '#3b9ede' },
  Completed:   { label: '已完成', color: '#4caf7d', bg: 'rgba(76,175,125,0.12)', border: '#4caf7d' },
  Overdue:     { label: '已逾期', color: '#e05252', bg: 'rgba(224,82,82,0.12)',  border: '#e05252' },
}

function autoStatus(m) {
  const pct = m.progress || 0
  if (pct >= 100) return 'Completed'
  if (pct > 0)    return 'InProgress'
  return 'NotStarted'
}

function applyOverdueStatus(d) {
  const today = new Date().toISOString().slice(0, 10)
  d.goals.forEach(g => g.strategies.forEach(s => s.measures.forEach(m => {
    if (m.deadline && m.deadline < today && m.status !== 'Completed') m.status = 'Overdue'
  })))
}

function progressColor(pct) {
  if (pct === 0)  return '#94a3b8'
  if (pct < 30)   return '#ef4444'
  if (pct < 60)   return '#f59e0b'
  if (pct < 100)  return '#3b82f6'
  return '#22c55e'
}

const autoResize = (e) => {
  const el = e.target
  el.style.height = '0px'
  el.style.height = el.scrollHeight + 'px'
  const row = el.closest('[data-measure-row]')
  if (row) {
    const siblings = row.querySelectorAll('textarea')
    const maxH = Math.max(...Array.from(siblings).map(t => { t.style.height = '0px'; return t.scrollHeight }))
    siblings.forEach(t => { t.style.height = maxH + 'px' })
  }
}
const initResize = (el) => { if (!el) return; el.style.height = '0px'; el.style.height = el.scrollHeight + 'px' }

export default function OgsmEditor({ project, onSave, onAudit, darkMode = true }) {
  const [draft, setDraft]   = useState(null)
  const [dirty, setDirty]   = useState(false)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showTodoPanel, setShowTodoPanel] = useState(false)
  const [aiDialog, setAiDialog] = useState(null)  // { type, gi, si, mi, currentText }
  const [aiLoading, setAiLoading] = useState(false)
  const [openTodos, setOpenTodos] = useState(new Set())
  const toggleTodoRow = (key) => setOpenTodos(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })
  const [dragMeasure, setDragMeasure] = useState(null)         // { gi, si, mi }
  const [dragOverMeasure, setDragOverMeasure] = useState(null)  // { gi, si, mi }
  const [dragGoal, setDragGoal] = useState(null)                // gi
  const [dragOverGoal, setDragOverGoal] = useState(null)        // gi
  const [dragStrategy, setDragStrategy] = useState(null)        // { gi, si }
  const [dragOverStrategy, setDragOverStrategy] = useState(null)// { gi, si }
  const scrollRef = useRef(null)
  const scrollRafRef = useRef(null)

  // Auto-scroll when dragging near top/bottom edge of the scroll container
  const handleScrollZoneDragOver = useCallback((e) => {
    const el = scrollRef.current
    if (!el) return
    const { top, bottom } = el.getBoundingClientRect()
    const zone = 80   // px from edge to trigger scroll
    const maxSpeed = 18
    const y = e.clientY
    let speed = 0
    if (y < top + zone)    speed = -maxSpeed * (1 - (y - top) / zone)
    else if (y > bottom - zone) speed =  maxSpeed * (1 - (bottom - y) / zone)
    if (scrollRafRef.current) { cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = null }
    if (speed !== 0) {
      const step = () => { el.scrollTop += speed; scrollRafRef.current = requestAnimationFrame(step) }
      scrollRafRef.current = requestAnimationFrame(step)
    }
  }, [])

  const handleScrollZoneDragEnd = useCallback(() => {
    if (scrollRafRef.current) { cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = null }
  }, [])

  useEffect(() => {
    if (openTodos.size === 0) return
    const handler = (e) => {
      if (!e.target.closest('[data-todo-zone]')) {
        setOpenTodos(new Set())
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openTodos])
  const typeW = editMode ? 130 : COL_TYPE
  const kpiW  = editMode ? 134 : COL_KPI
  const s = useMemo(() => buildStyles(darkMode), [darkMode])

  const allTodos = useMemo(() =>
    (draft?.goals || []).flatMap(g => g.strategies.flatMap(s => s.measures.flatMap(m => m.todos || []))),
    [draft]
  )
  const pendingTodos = allTodos.filter(t => !t.done).length

  useEffect(() => {
    const d = JSON.parse(JSON.stringify(project))
    applyOverdueStatus(d)
    setDraft(d)
    setDirty(false)
  }, [project])

  const update = useCallback((updater) => {
    setDraft(d => updater(JSON.parse(JSON.stringify(d))))
    setDirty(true)
  }, [])

  // When draft is replaced programmatically (e.g. AI insertion), textareas won't
  // receive input events — recalc heights for all autosize textareas here.
  useEffect(() => {
    if (!draft) return
    const els = document.querySelectorAll('textarea[data-ogsm-autoresize]')
    els.forEach(el => {
      try {
        el.style.height = '0px'
        el.style.height = el.scrollHeight + 'px'
      } catch (e) {}
    })
  }, [draft])

  const toggleTodoById = useCallback((gi, si, mi, todoId) => {
    update(d => {
      const todos = d.goals[gi].strategies[si].measures[mi].todos || []
      d.goals[gi].strategies[si].measures[mi].todos = todos.map(t =>
        t.id === todoId ? { ...t, done: !t.done } : t
      )
      const updated = d.goals[gi].strategies[si].measures[mi].todos
      const done = updated.filter(t => t.done).length
      d.goals[gi].strategies[si].measures[mi].progress = updated.length
        ? Math.round((done / updated.length) * 100) : 0
      // 根據 todos 完成比例自動更新 measure 狀態
      const today = new Date().toISOString().slice(0, 10)
      const deadline = d.goals[gi].strategies[si].measures[mi].deadline
      if (updated.length > 0 && done === updated.length) {
        d.goals[gi].strategies[si].measures[mi].status = 'Completed'
      } else if (done > 0) {
        d.goals[gi].strategies[si].measures[mi].status = 'InProgress'
      } else if (deadline && deadline < today) {
        d.goals[gi].strategies[si].measures[mi].status = 'Overdue'
      } else {
        d.goals[gi].strategies[si].measures[mi].status = 'NotStarted'
      }
      return d
    })
  }, [update])

  // ── AI 局部生成 ──────────────────────────────────────────
  const handleAiConfirm = useCallback(async (text) => {
    if (!aiDialog || !draft) return
    const { type, gi, si, mi } = aiDialog
    setAiLoading(true)

    // 共用：把 todos 陣列轉成物件
    const makeTodos = (arr) => (arr || []).map(t => ({
      id: crypto.randomUUID(), text: t, done: false, createdAt: new Date().toISOString()
    }))

    // 共用：建立 Measure 物件
    const makeMeasure = (m, mType, sortOrder) => ({
      id: null, type: mType, kpi: m.kpi || '', target: m.target || '',
      deadline: m.deadline || '', actual: '', progress: 0,
      status: 'NotStarted', sortOrder,
      todos: makeTodos(m.todos),
    })

    try {
      if (type === 'goal') {
        // ── Goal：清掉舊 Strategies，換成 AI 生成的 ──
        const existingGoals = draft.goals.map(g => g.text).filter(t => t.trim())
        const res = await api.generateForGoal({
          goalText: text, objective: draft.objective,
          deadline: draft.deadline || undefined, existingGoals,
        })
        update(d => {
          const goal = d.goals[gi]
          // 1. 填入 Goal 文字（優先用用戶輸入，其次用 AI 回傳）
          goal.text = text.trim() || res.goalText || goal.text || `Goal ${gi + 1}`
          // 2. 清掉全部舊 Strategies，換成新的
          goal.strategies = (res.strategies || []).map((s, idx) => ({
            id: null, text: s.text || '', sortOrder: idx, todos: [],
            measures: [
              ...(s.measuresProcess || []).map((m, mi) => makeMeasure(m, 'MP', mi)),
              ...(s.measuresData    || []).map((m, mi) => makeMeasure(m, 'MD', (s.measuresProcess || []).length + mi)),
            ],
          }))
          return d
        })

      } else if (type === 'strategy') {
        // ── Strategy：清掉舊 Measures，換成 AI 生成的；填入 Strategy 描述 ──
        const res = await api.generateForStrategy({
          strategyText: text, goalText: draft.goals[gi].text,
          objective: draft.objective, deadline: draft.deadline || undefined,
        })
        update(d => {
          const st = d.goals[gi].strategies[si]
          // 1. 填入 Strategy 文字
          st.text = text.trim() || res.strategyText || st.text || `Strategy ${si + 1}`
          // 2. 清掉全部舊 Measures，換成新的
          st.measures = [
            ...(res.measuresProcess || []).map((m, idx) => makeMeasure(m, 'MP', idx)),
            ...(res.measuresData    || []).map((m, idx) => makeMeasure(m, 'MD', (res.measuresProcess || []).length + idx)),
          ]
          return d
        })

      } else if (type === 'measure') {
        // ── Measure：清掉舊 Todos，換成 AI 生成的；填入 KPI 描述和 type ──
        const currentMeasure = draft.goals[gi].strategies[si].measures[mi]
        const res = await api.generateForMeasure({
          measureType:  currentMeasure.type || 'MP',
          kpiText:      text,
          strategyText: draft.goals[gi].strategies[si].text,
          objective:    draft.objective,
          deadline:     draft.deadline || undefined,
        })
        update(d => {
          const m = d.goals[gi].strategies[si].measures[mi]
          // 1. 填入 KPI 文字和 type
          m.kpi  = text.trim() || res.kpiText || m.kpi || ''
          m.type = res.type || m.type || 'MP'
          m.target = res.target || m.target || ''
          m.deadline = res.deadline || m.deadline || ''
          // 2. 清掉舊 Todos，換成新的
          m.todos = makeTodos(res.todos)
          return d
        })
      }
    } catch (e) {
      console.error('AI partial generation failed:', e)
      alert('AI 生成失敗：' + e.message)
    } finally {
      setAiLoading(false)
      setAiDialog(null)
    }
  }, [aiDialog, draft, update])

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(draft) } finally { setSaving(false) }
    setDirty(false)
  }

  if (!draft) return null

  const setField        = (f,v)         => update(d => { d[f] = v; return d })
  const setGoalText     = (gi,v)        => update(d => { d.goals[gi].text = v; return d })
  const addGoal         = ()            => update(d => { d.goals.push(emptyGoal()); return d })
  const removeGoal      = (gi)          => update(d => { d.goals.splice(gi,1); return d })
  const setStratText    = (gi,si,v)     => update(d => { d.goals[gi].strategies[si].text = v; return d })
  const addStrategy     = (gi)          => update(d => { d.goals[gi].strategies.push(emptyStrategy()); return d })
  const removeStrategy  = (gi,si)       => update(d => { d.goals[gi].strategies.splice(si,1); return d })
  const setMField       = (gi,si,mi,f,v)=> update(d => {
    d.goals[gi].strategies[si].measures[mi][f] = v
    const m = d.goals[gi].strategies[si].measures[mi]
    const today = new Date().toISOString().slice(0, 10)
    if (f === 'deadline') {
      if (m.deadline && m.deadline < today && m.status !== 'Completed') m.status = 'Overdue'
      else if ((!m.deadline || m.deadline >= today) && m.status === 'Overdue') m.status = autoStatus(m)
    }
    if (f === 'progress') {
      const isOverdue = m.deadline && m.deadline < today
      if (isOverdue && v < 100) m.status = 'Overdue'
      else m.status = autoStatus(m)
    }
    return d
  })
  const addMeasure      = (gi,si)       => update(d => { d.goals[gi].strategies[si].measures.push(emptyMeasure()); return d })
  const removeMeasure   = (gi,si,mi)    => update(d => { d.goals[gi].strategies[si].measures.splice(mi,1); return d })
  const setTodos        = (gi,si,todos) => update(d => { d.goals[gi].strategies[si].todos = todos; return d })

  const setMTodos = (gi,si,mi,todos) => update(d => {
    d.goals[gi].strategies[si].measures[mi].todos = todos
    const done = todos.filter(t => t.done).length
    const pct = todos.length ? Math.round((done / todos.length) * 100) : 0
    d.goals[gi].strategies[si].measures[mi].progress = pct
    const m = d.goals[gi].strategies[si].measures[mi]
    const today = new Date().toISOString().slice(0, 10)
    const isOverdue = m.deadline && m.deadline < today
    if (isOverdue && pct < 100) m.status = 'Overdue'
    else m.status = autoStatus(m)
    return d
  })

  const handleMeasureDragStart = (e, gi, si, mi) => {
    const tag = e.target.tagName.toLowerCase()
    if (['textarea', 'input', 'select', 'button'].includes(tag)) { e.preventDefault(); return }
    e.stopPropagation()
    setDragMeasure({ gi, si, mi })
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleMeasureDragOver = (e, gi, si, mi) => {
    e.preventDefault()
    e.stopPropagation()
    if (!dragMeasure || dragMeasure.gi !== gi || dragMeasure.si !== si) return
    e.dataTransfer.dropEffect = 'move'
    if (dragOverMeasure?.mi !== mi) setDragOverMeasure({ gi, si, mi })
  }
  const handleMeasureDrop = (e, gi, si, mi) => {
    e.preventDefault()
    e.stopPropagation()
    if (!dragMeasure || dragMeasure.gi !== gi || dragMeasure.si !== si || dragMeasure.mi === mi) {
      setDragMeasure(null); setDragOverMeasure(null); return
    }
    update(d => {
      const measures = d.goals[gi].strategies[si].measures
      const [removed] = measures.splice(dragMeasure.mi, 1)
      measures.splice(mi, 0, removed)
      return d
    })
    setDragMeasure(null)
    setDragOverMeasure(null)
  }
  const handleMeasureDragEnd = () => { setDragMeasure(null); setDragOverMeasure(null) }

  const handleGoalDragStart = (e, gi) => {
    const tag = e.target.tagName.toLowerCase()
    if (['textarea', 'input', 'select', 'button'].includes(tag)) { e.preventDefault(); return }
    setDragGoal(gi)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleGoalDragOver = (e, gi) => {
    e.preventDefault()
    if (dragGoal == null) return
    e.dataTransfer.dropEffect = 'move'
    if (dragOverGoal !== gi) setDragOverGoal(gi)
  }
  const handleGoalDrop = (e, gi) => {
    e.preventDefault()
    if (dragGoal == null || dragGoal === gi) { setDragGoal(null); setDragOverGoal(null); return }
    update(d => {
      const [removed] = d.goals.splice(dragGoal, 1)
      d.goals.splice(gi, 0, removed)
      return d
    })
    setDragGoal(null)
    setDragOverGoal(null)
  }
  const handleGoalDragEnd = () => { setDragGoal(null); setDragOverGoal(null) }

  const handleStrategyDragStart = (e, gi, si) => {
    const tag = e.target.tagName.toLowerCase()
    if (['textarea', 'input', 'select', 'button'].includes(tag)) { e.preventDefault(); return }
    e.stopPropagation()
    setDragStrategy({ gi, si })
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleStrategyDragOver = (e, gi, si) => {
    e.preventDefault()
    e.stopPropagation()
    if (!dragStrategy || dragStrategy.gi !== gi) return
    e.dataTransfer.dropEffect = 'move'
    if (dragOverStrategy?.si !== si) setDragOverStrategy({ gi, si })
  }
  const handleStrategyDrop = (e, gi, si) => {
    e.preventDefault()
    e.stopPropagation()
    if (!dragStrategy || dragStrategy.gi !== gi || dragStrategy.si === si) { setDragStrategy(null); setDragOverStrategy(null); return }
    update(d => {
      const strategies = d.goals[gi].strategies
      const [removed] = strategies.splice(dragStrategy.si, 1)
      strategies.splice(si, 0, removed)
      return d
    })
    setDragStrategy(null)
    setDragOverStrategy(null)
  }
  const handleStrategyDragEnd = () => { setDragStrategy(null); setDragOverStrategy(null) }

  // 計算整體進度（用於頂部進度條）
  const allMeasures = draft.goals.flatMap(g => g.strategies.flatMap(s => s.measures))
  const overallProgress = allMeasures.length
    ? Math.round(allMeasures.reduce((sum, m) => sum + (m.progress || 0), 0) / allMeasures.length)
    : 0

  return (
    <div style={s.wrap}>
      <style>{`
        .ogsm-remove-btn:hover {
          background: rgba(239,68,68,0.35) !important;
          border-color: rgba(239,68,68,0.7) !important;
          color: #fff !important;
          transform: scale(1.1);
          box-shadow: 0 0 8px rgba(239,68,68,0.5);
        }
        .ogsm-add-btn:hover {
          color: #f0a500 !important;
          background: rgba(240,165,0,0.07) !important;
        }
        .ogsm-audit-btn:hover {
          background: rgba(212,168,85,0.12) !important;
          border-color: #d4a855 !important;
          color: #d4a855 !important;
          box-shadow: 0 0 8px rgba(212,168,85,0.25);
          transform: translateY(-1px);
        }
        .ogsm-edit-btn:hover {
          background: rgba(138,149,174,0.15) !important;
          border-color: rgba(138,149,174,0.6) !important;
          transform: translateY(-1px);
        }
        .ogsm-save-btn:hover:not(:disabled) {
          background: #ffc233 !important;
          box-shadow: 0 4px 12px rgba(240,165,0,0.4);
          transform: translateY(-1px);
        }
        .ogsm-progress-wrap:focus-within {
          border-color: rgba(240,165,0,0.75) !important;
          box-shadow: 0 0 0 2.5px rgba(240,165,0,0.18), 0 0 8px rgba(240,165,0,0.12) !important;
          background: rgba(240,165,0,0.06) !important;
        }
        .ogsm-ai-btn:hover {
          background: rgba(240,165,0,0.22) !important;
          border-color: rgba(240,165,0,0.7) !important;
          color: #f0a500 !important;
          box-shadow: 0 0 8px rgba(240,165,0,0.35);
          transform: scale(1.12);
        }
        .ogsm-todo-btn:hover {
          background: rgba(76,175,125,0.12) !important;
          border-color: #4caf7d !important;
          color: #4caf7d !important;
          box-shadow: 0 0 8px rgba(76,175,125,0.25);
          transform: translateY(-1px);
        }
        .ogsm-actual-input::placeholder {
          color: ${darkMode ? 'rgba(205, 199, 199, 0.45)' : 'rgba(133, 129, 129, 0.45)'};
        }
        .ogsm-measure-drag-row {
          transition: filter 0.15s, opacity 0.15s;
        }
        .ogsm-measure-drag-row[data-dragging='true'] {
          opacity: 0.5 !important;
          filter: blur(2px) !important;
        }
        .ogsm-measure-drag-row[data-dragover='true'] {
          outline: 2px solid #f0a500;
          outline-offset: -1px;
          border-radius: 3px;
        }
        .ogsm-goal-drag-block {
          transition: filter 0.15s, opacity 0.15s;
        }
        .ogsm-goal-drag-block[data-dragging='true'] {
          opacity: 0.5 !important;
          filter: blur(2px) !important;
        }
        .ogsm-goal-drag-block[data-dragover='true'] {
          outline: 2px solid #f0a500;
          outline-offset: -1px;
        }
        .ogsm-strategy-drag-block {
          transition: filter 0.15s, opacity 0.15s;
        }
        .ogsm-strategy-drag-block[data-dragging='true'] {
          opacity: 0.5 !important;
          filter: blur(2px) !important;
        }
        .ogsm-strategy-drag-block[data-dragover='true'] {
          outline: 2px solid #f0a500;
          outline-offset: -1px;
          border-radius: 2px;
        }
      `}</style>

      {/* ── Top bar ── */}
      <div style={s.topBar}>
        <div style={s.topLeft}>
          {overallProgress >= 100
            ? <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, color: '#4caf7d', background: 'rgba(76,175,125,0.12)', border: '1px solid rgba(76,175,125,0.35)', borderRadius: '4px', padding: '2px 7px', marginBottom: '4px', letterSpacing: '0.4px' }}>✓ 計畫已完成</span>
            : draft.deadline && draft.deadline < new Date().toISOString().slice(0, 10) && (
              <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '4px', padding: '2px 7px', marginBottom: '4px', letterSpacing: '0.4px' }}>⚠ 計畫已逾期</span>
            )
          }
          <input style={s.titleInput} value={draft.title} onChange={e => setField('title', e.target.value)} placeholder="專案標題" />
          <div style={s.metaRow}>
            <span style={s.metaBadge}>OGSM</span>
            <span style={s.metaDate}>更新：{new Date(draft.updatedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</span>
          </div>
        </div>
        <div style={s.topActions}>
          {/* 整體進度 */}
          <div style={s.overallWrap}>
            <span style={s.overallLabel}>整體進度</span>
            <div style={s.overallBarTrack}>
              <div style={{ ...s.overallBarFill, width: `${overallProgress}%` }} />
            </div>
            <span style={s.overallPct}>{overallProgress}%</span>
          </div>
          {/* 審計按鈕 */}
          <button className="ogsm-audit-btn" style={s.auditBtn} onClick={() => onAudit(draft)} title="查看審計報告">
            📊 審計報告
          </button>
          {/* 待辦管理按鈕 */}
          <button
            className="ogsm-todo-btn"
            style={{ ...s.auditBtn, position: 'relative' }}
            onClick={() => setShowTodoPanel(true)}
            title="待辦事項管理"
          >
            ☑ 待辦事項
            {pendingTodos > 0 && (
              <span style={{ position: 'absolute', top: '-6px', right: '-6px', minWidth: '17px', height: '17px', background: '#e05252', color: '#fff', fontSize: '9px', fontFamily: '"DM Mono", monospace', fontWeight: 700, borderRadius: '99px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                {pendingTodos > 99 ? '99+' : pendingTodos}
              </span>
            )}
          </button>
          {/* 編輯按鈕 */}
          <button
            className="ogsm-edit-btn"
            style={{ ...s.editBtn, ...(editMode ? s.editBtnActive : {}) }}
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? '✓ 完成編輯' : '✏️ 編輯'}
          </button>
          {/* 儲存按鈕 */}
          <button
            className="ogsm-save-btn"
            style={{ ...s.saveBtn, ...(saving || !dirty ? s.saveBtnDim : {}) }}
            onClick={handleSave} disabled={saving || !dirty}
          >
            {saving ? '儲存中…' : dirty ? '💾 儲存' : '✓ 已儲存'}
          </button>
        </div>
      </div>

      {/* ── Objective ── */}
      <div style={s.objectiveWrap}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={s.sectionTag}>O — Objective</div>
            <textarea style={s.objectiveArea} value={draft.objective} onChange={e => setField('objective', e.target.value)} placeholder="輸入核心目標…" rows={2} />
          </div>
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', paddingTop: '2px' }}>
            <div style={{ fontSize: '10px', color: darkMode ? '#8a95ae' : '#7a8ca8', fontFamily: '"DM Mono", monospace', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600 }}>計畫期限</div>
            <input type="date" style={s.projectDeadlineInput} value={draft.deadline || ''} onChange={e => setField('deadline', e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div
        ref={scrollRef}
        style={s.tableScroll}
        onDragOver={handleScrollZoneDragOver}
        onDragEnd={handleScrollZoneDragEnd}
        onDrop={handleScrollZoneDragEnd}
      >
        <div style={{ ...s.tableWrap, minWidth: COL_G + COL_S + typeW + kpiW + COL_VALT + COL_VALP + COL_DL + COL_STATUS + COL_PROG + COL_ACT }}>

          {/* Header */}
          <div style={s.tableHeader}>
            {[
              { label: 'G — Goals',      w: COL_G      },
              { label: 'S — Strategies', w: COL_S      },
              { label: '類型',            w: typeW      },
              { label: 'KPI',            w: kpiW       },
              { label: '目標值',          w: COL_VALT    },
              { label: '實際值',          w: COL_VALP    },
              { label: '期限',            w: COL_DL     },
              { label: '狀態',            w: COL_STATUS },
              { label: '進度',            w: COL_PROG   },
              { label: '待辦事項',        w: COL_ACT    },
            ].map((col, i) => (
              <div key={i} style={{ ...s.colHead, width: col.w, ...(i >= 6 ? { borderRight: 'none' } : {}) }}>
                {col.label}
              </div>
            ))}
          </div>

          {draft.goals.length === 0 && (
            <div style={s.emptyTable}>尚無 Goals，點擊下方「+ 新增 Goal」</div>
          )}

          {draft.goals.map((goal, gi) => {
            const isGDragging = dragGoal === gi
            const isGDragOver = dragOverGoal === gi && dragGoal !== gi
            return (
            <div
              key={goal.id ?? `g-${gi}`}
              className="ogsm-goal-drag-block"
              data-dragging={isGDragging ? 'true' : 'false'}
              data-dragover={isGDragOver ? 'true' : 'false'}
              style={{ ...s.goalSection, ...(gi % 2 === 1 ? s.goalSectionAlt : {}), cursor: editMode ? 'grab' : 'default' }}
              draggable={editMode}
              onDragStart={editMode ? e => handleGoalDragStart(e, gi) : undefined}
              onDragOver={editMode ? e => handleGoalDragOver(e, gi) : undefined}
              onDrop={editMode ? e => handleGoalDrop(e, gi) : undefined}
              onDragEnd={editMode ? handleGoalDragEnd : undefined}
            >
              <div style={s.goalRow}>

                {/* Goal */}
                <div style={{ ...s.goalCell, width: COL_G }}>
                  <div style={s.goalIndex}>G{gi + 1}</div>
                  <textarea data-ogsm-autoresize style={{ ...s.measureText, ...s.goalText }} value={goal.text} onChange={e => setGoalText(gi, e.target.value)} onInput={autoResize} ref={initResize} placeholder="Goal 描述…" rows={3} />
                  {editMode && (
                    <div style={{ display: 'flex', gap: '4px', alignSelf: 'flex-end' }}>
                      {goal.id == null && <button style={s.aiBtnSmall} title="AI 生成 Strategies" onClick={() => setAiDialog({ type: 'goal', gi, si: null, mi: null, currentText: goal.text })}>⚡</button>}
                      <button className="ogsm-remove-btn" style={{ ...s.iconBtn, alignSelf: 'flex-end' }} onClick={() => removeGoal(gi)}>✕</button>
                    </div>
                  )}
                </div>

                {/* Strategies */}
                <div style={s.strategiesWrap}>
                  {goal.strategies.map((st, si) => {
                    const isSDragging = dragStrategy?.gi === gi && dragStrategy?.si === si
                    const isSDragOver = dragOverStrategy?.gi === gi && dragOverStrategy?.si === si && !isSDragging
                    return (
                    <div
                      key={st.id ?? `s-${si}`}
                      className="ogsm-strategy-drag-block"
                      data-dragging={isSDragging ? 'true' : 'false'}
                      data-dragover={isSDragOver ? 'true' : 'false'}
                      style={{ ...s.strategyBlock, cursor: editMode ? 'grab' : 'default' }}
                      draggable={editMode}
                      onDragStart={editMode ? e => handleStrategyDragStart(e, gi, si) : undefined}
                      onDragOver={editMode ? e => handleStrategyDragOver(e, gi, si) : undefined}
                      onDrop={editMode ? e => handleStrategyDrop(e, gi, si) : undefined}
                      onDragEnd={editMode ? handleStrategyDragEnd : undefined}
                    >
                      <div style={s.strategyRow}>

                        {/* Strategy */}
                        <div style={{ ...s.stratCell, width: COL_S }}>
                          <div style={s.stratIndex}>S{si + 1}</div>
                          <textarea data-ogsm-autoresize style={s.measureText} value={st.text} onChange={e => setStratText(gi, si, e.target.value)} onInput={autoResize} ref={initResize} placeholder="Strategy 描述…" rows={2} />
                          {editMode && (
                            <div style={{ display: 'flex', gap: '4px', alignSelf: 'flex-end' }}>
                              {st.id == null && <button style={s.aiBtnSmall} title="AI 生成 Measures" onClick={() => setAiDialog({ type: 'strategy', gi, si, mi: null, currentText: st.text })}>⚡</button>}
                              <button className="ogsm-remove-btn" style={{ ...s.iconBtn, alignSelf: 'flex-end' }} onClick={() => removeStrategy(gi, si)}>✕</button>
                            </div>
                          )}
                        </div>

                        {/* Measures */}
                        <div style={s.measuresCol}>
                          {st.measures.map((m, mi) => {
                            const sc = STATUS_CONFIG[m.status] || STATUS_CONFIG.NotStarted
                            const isMDragging = dragMeasure?.gi === gi && dragMeasure?.si === si && dragMeasure?.mi === mi
                            const isMDragOver = dragOverMeasure?.gi === gi && dragOverMeasure?.si === si && dragOverMeasure?.mi === mi && !isMDragging
                            return (
                              <div
                                key={m.id ?? `m-${mi}`}
                                className="ogsm-measure-drag-row"
                                data-dragging={isMDragging ? 'true' : 'false'}
                                data-dragover={isMDragOver ? 'true' : 'false'}
                                draggable={editMode}
                                onDragStart={editMode ? e => handleMeasureDragStart(e, gi, si, mi) : undefined}
                                onDragOver={editMode ? e => handleMeasureDragOver(e, gi, si, mi) : undefined}
                                onDrop={editMode ? e => handleMeasureDrop(e, gi, si, mi) : undefined}
                                onDragEnd={editMode ? handleMeasureDragEnd : undefined}
                              >
                              <div style={{ ...s.measureRow, cursor: editMode ? 'grab' : 'default' }} data-measure-row="1">
                                {/* 類型標籤 */}
                                <div style={{ ...s.measureCell, width: typeW, justifyContent: editMode ? 'flex-start' : 'center', gap: '4px', padding: editMode ? '8px 6px' : '8px 10px' }}>
                                  {editMode ? (
                                    <>
                                      {m.id == null && <button style={{ ...s.aiBtnSmall, flexShrink: 0 }} title="AI 生成待辦事項" onClick={() => setAiDialog({ type: 'measure', gi, si, mi, currentText: m.kpi })}>⚡</button>}
                                      <button className="ogsm-remove-btn" style={{ ...s.iconBtn, flexShrink: 0 }} onClick={() => removeMeasure(gi,si,mi)}>✕</button>
                                      <select style={{ ...(m.type === 'MP' ? s.typeBadgeMP : s.typeBadgeMD), flex: 1, maxWidth: '60px', width: 'auto' }} value={m.type || 'MP'} onChange={e => setMField(gi,si,mi,'type',e.target.value)}>
                                        <option value="MP">MP</option>
                                        <option value="MD">MD</option>
                                      </select>
                                    </>
                                  ) : (
                                    <span style={m.type === 'MP' ? s.typeBadgeMP : s.typeBadgeMD}>{m.type || 'MP'}</span>
                                  )}
                                </div>
                                <div style={{ ...s.measureCell, width: kpiW, alignItems: 'flex-start', display: 'flex', gap: '6px' }}>
                                  <textarea data-ogsm-autoresize style={s.measureText} value={m.kpi} onChange={e => setMField(gi,si,mi,'kpi',e.target.value)} onInput={autoResize} ref={initResize} placeholder="KPI 名稱" rows={1} />
                                </div>
                                <div style={{ ...s.measureCell, width: COL_VALT, alignItems: 'flex-start' }}>
                                  <textarea data-ogsm-autoresize style={{ ...s.measureText, ...s.targetInput }} value={m.target} onChange={e => setMField(gi,si,mi,'target',e.target.value)} onInput={autoResize} ref={initResize} placeholder="目標" rows={1} />
                                </div>
                                <div style={{ ...s.measureCell, width: COL_VALP, alignItems: 'flex-start' }}>
                                  <textarea data-ogsm-autoresize className="ogsm-actual-input" style={{ ...s.measureText, ...s.actualInput }} value={m.actual} onChange={e => setMField(gi,si,mi,'actual',e.target.value)} onInput={autoResize} ref={initResize} placeholder="實際" rows={1} />
                                </div>

                                {/* 期限 */}
                                <div style={{ ...s.measureCell, width: COL_DL }}>
                                  <input type="date" style={s.deadlineInput} value={m.deadline || ''} onChange={e => setMField(gi,si,mi,'deadline',e.target.value)} />
                                </div>

                                {/* 狀態選單 */}
                                <div style={{ ...s.measureCell, width: COL_STATUS }}>
                                  <select
                                    style={{ ...s.statusSelect, color: sc.color, borderColor: sc.border, background: sc.bg }}
                                    value={m.status}
                                    onChange={e => setMField(gi,si,mi,'status',e.target.value)}
                                  >
                                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                      <option key={k} value={k}>{v.label}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* 進度 */}
                                {(() => { const todoKey = `${gi}-${si}-${mi}`; const todoOpen = openTodos.has(todoKey); const todos = m.todos || []; const doneCount = todos.filter(t => t.done).length;
                                const todoProgressColor = !todos.length ? (darkMode ? '#6e7d94' : '#8a9ab8') : doneCount === 0 ? (darkMode ? '#8a96a8' : '#9aaaba') : doneCount === todos.length ? (darkMode ? '#4caf7d' : '#2a9060') : (darkMode ? '#3b9ede' : '#1a7bbf'); return (
                                <>
                                <div style={{ ...s.measureCell, width: COL_PROG, flexDirection: 'column', gap: '4px', alignItems: 'stretch', justifyContent: 'center', padding: '8px 12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '18px', fontFamily: '"DM Mono", monospace', fontWeight: 700, color: progressColor(m.progress) }}>{m.progress}%</span>
                                  </div>
                                  <div style={s.miniBarTrack}>
                                    <div style={{ ...s.miniBarFill, width: `${m.progress}%`, background: progressColor(m.progress) }} />
                                  </div>
                                </div>
                                {/* 待辦展開按鈕 */}
                                <div data-todo-zone style={{ ...s.measureCell, width: COL_ACT, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '2px', borderRight: 'none', padding: '4px 2px' }}>
                                  <button
                                    onClick={() => toggleTodoRow(todoKey)}
                                    title="展開/收起待辦事項"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: todoOpen ? '#f0a500' : todoProgressColor, padding: '2px 4px', lineHeight: 1, transition: 'color 0.15s', borderRadius: '3px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                                  >
                                    <span style={{ fontSize: '23px', lineHeight: 1 }}>{todoOpen ? '▾' : '▸'}</span>
                                    {todos.length > 0 && <span style={{ fontSize: '9px', fontFamily: '"DM Mono", monospace', lineHeight: 1, color: todoProgressColor }}>{doneCount}/{todos.length} 已完成</span>}
                                  </button>
                                </div>
                                </>
                                )})()} 
                              </div>
                              {/* 此 KPI 的待辦事項 */}
                              {openTodos.has(`${gi}-${si}-${mi}`) && (
                              <div data-todo-zone style={{ ...s.measureTodoWrap, borderLeft: `3px solid ${m.type === 'MD' ? 'rgba(240,165,0,0.3)' : 'rgba(59,158,222,0.3)'}` }}>
                                <TodoList
                                  todos={m.todos || []}
                                  onChange={todos => setMTodos(gi, si, mi, todos)}
                                  editMode={editMode}
                                  darkMode={darkMode}
                                  noHeader
                                />
                              </div>
                              )}
                              </div>
                            )
                          })}
                          {editMode && <button className="ogsm-add-btn" style={s.addMiniBtn} onClick={() => addMeasure(gi, si)}>+ Measure</button>}
                        </div>
                      </div>



                    </div>
                  )})}
                  {editMode && <button className="ogsm-add-btn" style={s.addStratBtn} onClick={() => addStrategy(gi)}>+ 新增 Strategy</button>}
                </div>

              </div>
            </div>
          )})}

          {editMode && (
            <div style={s.addGoalRow}>
              <button className="ogsm-add-btn" style={s.addGoalBtn} onClick={addGoal}>+ 新增 Goal</button>
            </div>
          )}

        </div>
      </div>

      {/* ── AI Refill Modal ── */}

      {/* ── AI Loading overlay ── */}
      {aiLoading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid #2a3347', borderTopColor: '#f0a500', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <div style={{ color: '#f0a500', fontFamily: '"DM Mono", monospace', fontSize: '13px' }}>AI 生成中…</div>
        </div>
      )}

      {/* ── AI Confirm Dialog ── */}
      {aiDialog && !aiLoading && (
        <AiConfirmDialog
          type={aiDialog.type}
          currentText={aiDialog.currentText}
          onConfirm={handleAiConfirm}
          onCancel={() => setAiDialog(null)}
          darkMode={darkMode}
        />
      )}

      {/* ── Todo Manager Panel ── */}
      {showTodoPanel && draft && (
        <TodoManagerPanel
          project={draft}
          onClose={() => setShowTodoPanel(false)}
          onToggleTodo={toggleTodoById}
          darkMode={darkMode}
        />
      )}
    </div>
  )
}

const COL_G      = 200
const COL_S      = 200
const COL_TYPE   = 90
const COL_KPI    = 170
const COL_VALT   = 130
const COL_VALP   = 75
const COL_DL     = 110
const COL_STATUS = 96
const COL_PROG   = 165
const COL_ACT    = 68



function buildStyles(dark) {
  const T = dark ? {
    border:        '#2a3347',
    borderAlt:     '#161b27',
    headerBg:      '#1e2535',
    altRowBg:      '#0c1018',
    text:          '#e8ecf4',
    textSec:       '#8a95ae',
    textMut:       '#4a5568',
    barTrack:      '#3a4357',
    progressBg:    '#1e2535',
    progressBorder:'#2a3347',
    objAreaBg:     'rgba(240,165,0,0.04)',
    objAreaBorder: 'rgba(240,165,0,0.2)',
    saveDimBg:     '#1e2535',
    saveDimColor:  '#4a5568',
    editBg:        '#2a3347',
    editColor:     '#8a95ae',
    editBorder:    '#3a4357',
    auditBorder:   '#334060',
    auditColor:    '#8a95ae',
    metaDate:      '#b0bac9',
    dashedBorder:  '#1e2535',
    addBtnColor:   '#4a5568',
    targetColor:   '#f0a500',
    actualColor:   '#4caf7d',
  } : {
    border:        '#c8d4e8',
    borderAlt:     '#dde8f2',
    headerBg:      '#e8f0fa',
    altRowBg:      '#f4f7fd',
    text:          '#1a2133',
    textSec:       '#5a6e88',
    textMut:       '#8a9ab8',
    barTrack:      '#d4dde8',
    progressBg:    '#eaf0f8',
    progressBorder:'#c8d4e8',
    objAreaBg:     'rgba(204,119,0,0.04)',
    objAreaBorder: 'rgba(204,119,0,0.28)',
    saveDimBg:     '#eaf0f8',
    saveDimColor:  '#8a9ab8',
    editBg:        '#eaf0f8',
    editColor:     '#5a6e88',
    editBorder:    '#c8d4e8',
    auditBorder:   '#c8d4e8',
    auditColor:    '#6a7e98',
    metaDate:      '#7a8fa8',
    dashedBorder:  '#c8d4e8',
    addBtnColor:   '#8a9ab8',
    targetColor:   '#b86800',
    actualColor:   '#1d8054',
  }
  return {
    wrap: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },

    topBar: {
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      padding: '20px 28px 14px', borderBottom: `1px solid ${T.border}`, gap: '16px', flexShrink: 0,
    },
    topLeft: { flex: 1, minWidth: 0 },
    titleInput: {
      background: 'none', border: 'none', fontFamily: '"Syne", sans-serif',
      fontSize: '22px', fontWeight: 800, color: T.text, width: '100%', outline: 'none', marginBottom: '5px',
    },
    metaRow: { display: 'flex', alignItems: 'center', gap: '10px' },
    metaBadge: {
      fontSize: '10px', fontFamily: '"DM Mono", monospace',
      background: 'rgba(240,165,0,0.1)', border: '1px solid rgba(240,165,0,0.3)',
      color: '#f0a500', padding: '2px 7px', borderRadius: '3px', letterSpacing: '0.8px',
    },
    metaDate: { fontSize: '11px', fontFamily: '"DM Mono", monospace', color: T.metaDate, fontWeight: 500 },

    topActions: { display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' },

    overallWrap: { display: 'flex', alignItems: 'center', gap: '10px' },
    overallLabel: { fontSize: '12px', fontFamily: '"DM Mono", monospace', color: '#d4a855', whiteSpace: 'nowrap', fontWeight: 600 },
    overallBarTrack: { width: '100px', height: '7px', background: T.barTrack, borderRadius: '4px', overflow: 'hidden' },
    overallBarFill: { height: '100%', background: 'linear-gradient(90deg, #f0a500, #4caf7d)', borderRadius: '4px', transition: 'width 0.4s ease', boxShadow: '0 0 6px rgba(240,165,0,0.5)' },
    overallPct: { fontSize: '13px', fontFamily: '"DM Mono", monospace', color: '#f0a500', minWidth: '42px', fontWeight: 700 },

    auditBtn: {
      padding: '8px 14px', background: 'transparent',
      border: `1px solid ${T.auditBorder}`, borderRadius: '6px',
      color: T.auditColor, cursor: 'pointer', fontSize: '12px',
      fontFamily: '"Noto Sans TC", sans-serif', fontWeight: 600,
      transition: 'all 0.15s', whiteSpace: 'nowrap',
    },
    editBtn: {
      padding: '8px 16px', background: T.editBg, color: T.editColor,
      border: `1px solid ${T.editBorder}`, borderRadius: '6px', fontWeight: 600, fontSize: '12px',
      cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
      fontFamily: '"Noto Sans TC", sans-serif', whiteSpace: 'nowrap',
    },
    editBtnActive: {
      background: 'rgba(76,175,125,0.15)',
      color: '#4caf7d',
      borderColor: 'rgba(76,175,125,0.3)',
    },
    saveBtn: {
      padding: '8px 18px', background: '#f0a500', color: '#000',
      border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '13px',
      cursor: 'pointer', transition: 'all 0.15s', fontFamily: '"Noto Sans TC", sans-serif', whiteSpace: 'nowrap',
    },
    saveBtnDim: { background: T.saveDimBg, color: T.saveDimColor, cursor: 'default' },

    objectiveWrap: { padding: '14px 28px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 },
    sectionTag: { fontSize: '10px', fontFamily: '"DM Mono", monospace', color: '#f0a500', letterSpacing: '1px', marginBottom: '7px' },
    objectiveArea: {
      width: '100%', background: T.objAreaBg, border: `1px solid ${T.objAreaBorder}`,
      borderRadius: '6px', padding: '10px 14px', color: T.text, fontSize: '14px',
      fontFamily: '"Noto Sans TC", sans-serif', lineHeight: 1.6, resize: 'vertical', outline: 'none',
    },

    tableScroll: { flex: 1, overflow: 'auto', padding: '20px 28px 40px' },
    tableWrap: {
      minWidth: COL_G + COL_S + COL_TYPE + COL_KPI + COL_VALT + COL_VALP + COL_DL + COL_STATUS + COL_PROG + COL_ACT, // preview min; edit-mode override applied inline
      width: 'max-content',
      border: `1px solid ${T.border}`, borderRadius: '8px', overflow: 'hidden',
    },

    tableHeader: { display: 'flex', background: T.headerBg, borderBottom: `1px solid ${T.border}` },
    colHead: {
      padding: '10px 12px', flexShrink: 0,
      fontSize: '10px', fontFamily: '"DM Mono", monospace',
      color: '#d4a855', letterSpacing: '0.8px', textTransform: 'uppercase',
      borderRight: `1px solid ${T.border}`,
      fontWeight: 600,
    },

    goalSection:    { borderBottom: `1px solid ${T.border}` },
    goalSectionAlt: { background: T.altRowBg },
    goalRow:        { display: 'flex' },
    goalCell: {
      flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '6px',
      padding: '12px', borderRight: `1px solid ${T.border}`,
    },
    goalIndex: { fontSize: '10px', fontFamily: '"DM Mono", monospace', color: '#f0a500', letterSpacing: '0.8px' },
    goalText:  { minHeight: '56px', fontWeight: 600, fontSize: '13px' },

    strategiesWrap: { flex: 1, display: 'flex', flexDirection: 'column' },
    strategyBlock:  { borderBottom: `2px solid ${T.border}` },
    strategyRow:    { display: 'flex' },
    stratCell: {
      flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px',
      padding: '10px 12px', borderRight: `1px solid ${T.border}`,
    },
    stratIndex: { fontSize: '10px', fontFamily: '"DM Mono", monospace', color: T.textSec, letterSpacing: '0.8px' },

    measuresCol: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
    measureRow: { display: 'flex', alignItems: 'stretch', borderBottom: `1px solid ${T.borderAlt}`, minHeight: '44px' },
    measureCell: {
      flexShrink: 0, padding: '8px 10px',
      borderRight: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', alignSelf: 'stretch',
    },

    cellText: {
      background: 'none', border: 'none', color: T.text,
      fontSize: '13px', fontFamily: '"Noto Sans TC", sans-serif',
      outline: 'none', resize: 'none', width: '100%', lineHeight: 1.5,
    },
    measureText: {
      background: 'none', border: 'none', color: T.text,
      fontSize: '12px', fontFamily: '"Noto Sans TC", sans-serif',
      outline: 'none', width: '100%', resize: 'none', lineHeight: 1.5,
      overflowY: 'hidden', wordBreak: 'break-word', whiteSpace: 'pre-wrap',
      minHeight: '22px', height: 'auto', display: 'block',
    },
    targetInput: { color: T.targetColor, fontFamily: '"DM Mono", monospace' },
    actualInput: { color: T.actualColor, fontFamily: '"DM Mono", monospace' },

    // 狀態選單
    statusSelect: {
      width: '100%', background: dark ? 'rgba(74,85,104,0.15)' : 'rgba(100,120,160,0.08)',
      border: `1px solid ${dark ? '#4a5568' : '#c8d4e8'}`, borderRadius: '4px',
      fontSize: '11px', fontFamily: '"Noto Sans TC", sans-serif',
      padding: '3px 4px', outline: 'none', cursor: 'pointer',
      transition: 'all 0.15s',
    },

    // 進度
    progressRow: { display: 'flex', alignItems: 'center', gap: '5px' },
    slider: { flex: 1, height: '3px', cursor: 'pointer', accentColor: '#f0a500' },
    progressNumWrap: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      background: T.progressBg,
      border: `1px solid ${T.progressBorder}`,
      borderRadius: '3px',
      padding: '1px 3px',
      marginRight: '15px',
    },
    progressNum: {
      width: '32px',
      background: 'none',
      border: 'none',
      color: '#f0a500',
      fontSize: '11px',
      fontFamily: '"DM Mono", monospace',
      outline: 'none',
      textAlign: 'right',
      padding: 0,
    },
    progressPercent: {
      color: '#f0a500',
      fontSize: '11px',
      fontFamily: '"DM Mono", monospace',
      marginLeft: '1px',
    },
    miniBarTrack: {
      height: '5px',
      background: T.barTrack,
      borderRadius: '3px',
      overflow: 'hidden',
      width: '100%',
    },
    miniBarFill: {
      height: '100%',
      borderRadius: '3px',
      transition: 'width 0.2s ease, background 0.2s',
      boxShadow: '0 0 4px currentColor',
    },
    removeBtn: {
      background: 'rgba(239,68,68,0.15)',
      border: '1px solid rgba(239,68,68,0.3)',
      color: '#ef4444',
      cursor: 'pointer',
      fontSize: '11px',
      padding: '3px 6px',
      borderRadius: '3px',
      alignSelf: 'flex-end',
      transition: 'all 0.2s',
      fontWeight: 600,
    },
    iconBtn: {
      background: 'rgba(239,68,68,0.15)',
      border: '1px solid rgba(239,68,68,0.3)',
      color: '#ef4444',
      cursor: 'pointer',
      fontSize: '11px',
      padding: '4px 7px',
      borderRadius: '3px',
      transition: 'all 0.2s',
      fontWeight: 600,
    },
    addMiniBtn: { background: 'none', border: 'none', color: T.addBtnColor, cursor: 'pointer', fontSize: '11px', fontFamily: '"DM Mono", monospace', padding: '6px 12px', textAlign: 'left', transition: 'color 0.15s' },
    addStratBtn: { background: 'none', border: 'none', color: T.addBtnColor, cursor: 'pointer', fontSize: '12px', fontFamily: '"DM Mono", monospace', padding: '10px 12px', textAlign: 'left', borderTop: `1px dashed ${T.dashedBorder}`, width: '100%', transition: 'color 0.15s' },
    addGoalRow: { borderTop: `1px dashed ${T.dashedBorder}` },
    addGoalBtn: { width: '100%', background: 'none', border: 'none', color: T.addBtnColor, cursor: 'pointer', fontSize: '12px', fontFamily: '"DM Mono", monospace', padding: '12px', textAlign: 'left', transition: 'color 0.15s' },
    measureTodoWrap: {
      borderTop: '1px dashed #1e2535',
      background: 'rgba(0,0,0,0.1)',
    },
    typeBadgeMP: {
      fontSize: '10px', fontFamily: '"DM Mono", monospace', fontWeight: 700,
      padding: '2px 5px', borderRadius: '3px', letterSpacing: '0.5px',
      background: 'rgba(59,158,222,0.15)', color: '#3b9ede',
      border: '1px solid rgba(59,158,222,0.35)',
      cursor: 'pointer', outline: 'none', width: '100%', textAlign: 'center',
    },
    typeBadgeMD: {
      fontSize: '10px', fontFamily: '"DM Mono", monospace', fontWeight: 700,
      padding: '2px 5px', borderRadius: '3px', letterSpacing: '0.5px',
      background: 'rgba(240,165,0,0.15)', color: '#f0a500',
      border: '1px solid rgba(240,165,0,0.35)',
      cursor: 'pointer', outline: 'none', width: '100%', textAlign: 'center',
    },
    deadlineInput: {
      background: 'none', border: 'none', color: dark ? '#8a95ae' : '#445069',
      fontSize: '10px', fontFamily: '"DM Mono", monospace',
      outline: 'none', width: '100%', colorScheme: dark ? 'dark' : 'light', cursor: 'pointer',
    },
    projectDeadlineInput: {
      background: dark ? '#1e2535' : '#f3f7fd', border: `1px solid ${dark ? '#2a3347' : '#d1d9e8'}`, borderRadius: '5px',
      color: dark ? '#e8ecf4' : '#1a2133', fontSize: '13px', fontFamily: '"DM Mono", monospace',
      padding: '7px 10px', outline: 'none', colorScheme: dark ? 'dark' : 'light',
    },
    addMpBtn: { color: '#3b9ede' },
    addMdBtn: { color: '#f0a500' },
    aiBtnSmall: {
      background: 'rgba(240,165,0,0.12)',
      border: '1px solid rgba(240,165,0,0.3)',
      color: '#f0a500',
      cursor: 'pointer',
      fontSize: '11px',
      padding: '4px 7px',
      borderRadius: '3px',
      transition: 'all 0.15s',
      fontWeight: 700,
    },
    emptyTable: { padding: '32px', textAlign: 'center', color: T.addBtnColor, fontFamily: '"DM Mono", monospace', fontSize: '12px' },
  }
}