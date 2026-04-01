import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import TodoManagerPanel from './TodoManagerPanel.jsx'
import AiConfirmDialog from './AiConfirmDialog.jsx'
import BrutalistSelect from './BrutalistSelect.jsx'
import { api } from '../services/api.js'

const emptyMeasure  = () => ({ id: null, kpi: '', target: '', actual: '', progress: 0, status: 'NotStarted', deadline: '', assignee: '', todos: [], sortOrder: 0 })
const emptyStrategy = () => ({ id: null, text: '', sortOrder: 0, measures: [emptyMeasure()], todos: [] })
const emptyGoal     = () => ({ id: null, text: '', sortOrder: 0, strategies: [emptyStrategy()] })

const STATUS_CONFIG = {
  NotStarted: { label: '未開始', color: '#a8b4c9', bg: 'rgba(168,180,201,0.12)', border: '#a8b4c9' },
  InProgress: { label: '進行中', color: '#3b9ede', bg: 'rgba(59,158,222,0.12)', border: '#3b9ede' },
  Completed:  { label: '已完成', color: '#4caf7d', bg: 'rgba(76,175,125,0.12)', border: '#4caf7d' },
  Overdue:    { label: '已逾期', color: '#e05252', bg: 'rgba(224,82,82,0.12)',  border: '#e05252' },
}

const B_YELLOW = '#aeae20ff'
const B_BLUE   = '#0000FF'
const B_PINK   = 'rgb(255, 15, 15)'
const B_GREEN  = '#16ca16ff'

const COL_G      = 200
const COL_S      = 200
const COL_KPI    = 200
const COL_VALT   = 120
const COL_VALP   = 85
const COL_OWNER  = 120
const COL_DL     = 120
const COL_STATUS = 100
const COL_PROG   = 150
const COL_ACT    = 100

function autoStatus(m) {
  const pct = m.progress || 0
  if (pct >= 100) return 'Completed'
  if (pct > 0)    return 'InProgress'
  return 'NotStarted'
}

function applyOverdueStatus(d) {
  const today = (() => { const _n = new Date(); return `${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}-${String(_n.getDate()).padStart(2,'0')}` })()
  d.goals.forEach(g => g.strategies.forEach(s => s.measures.forEach(m => {
    if (m.deadline && m.deadline < today && m.status !== 'Completed') m.status = 'Overdue'
  })))
}

function progressColor(pct) {
  if (pct === 0)  return '#94a3b8'
  if (pct < 30)   return B_PINK
  if (pct < 60)   return B_YELLOW
  if (pct < 100)  return B_BLUE
  return B_GREEN
}

const autoResize = (e) => {
  const el = e.target
  // 找到最近的 scroll container，儲存 scrollTop 避免跳位
  const scrollContainer = el.closest('.custom-scrollbar') || el.closest('[data-scroll-container]')
  const savedScrollTop = scrollContainer ? scrollContainer.scrollTop : null

  el.style.height = '0px'
  el.style.height = el.scrollHeight + 'px'
  const row = el.closest('[data-measure-row]')
  if (row) {
    const siblings = row.querySelectorAll('textarea')
    const maxH = Math.max(...Array.from(siblings).map(t => { t.style.height = '0px'; return t.scrollHeight }))
    siblings.forEach(t => { t.style.height = maxH + 'px' })
  }

  // 還原 scrollTop，避免因高度重算而跳到頂端
  if (scrollContainer && savedScrollTop !== null) {
    scrollContainer.scrollTop = savedScrollTop
  }
}
const initResize = (el) => { if (!el) return; el.style.height = '0px'; el.style.height = el.scrollHeight + 'px' }

const Icons = {
  FileText: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  CheckCircle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  Edit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  Calendar: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Zap: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10"/></svg>,
  More: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>,
  X: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  ArrowRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
}

// ─── SLIDE PANEL WRAPPER ─────────────────────────────────────────────────────
function SlidePanel({ title, icon, onClose, children, dark, width = "480px", originRect = null, showHeader = true }) {
  const vw = window.innerWidth
  const panelW = parseInt(width)
  const originX = originRect
    ? `${Math.max(0, originRect.left + originRect.width / 2 - (vw - panelW))}px`
    : `${panelW}px`
  const originY = originRect
    ? `${originRect.top + originRect.height / 2}px`
    : '50px'

  return (
    <>
      <div className="ogsm-slide-overlay" onClick={onClose} />
      {/* 動畫層：只負責 scale 動畫，不設 overflow */}
      <div
        className="ogsm-slide-panel ogsm-slide-panel-morph"
        style={{
          width,
          maxWidth: '92vw',
          transformOrigin: `${originX} ${originY}`,
        }}
      >
        {/* 佈局層：負責實際佈局和 overflow，不參與動畫 */}
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          background: 'transparent',
          borderLeft: `2px solid ${dark ? 'rgba(255,255,255,0.15)' : '#000'}`,
          overflow: 'hidden',
        }}>
          {showHeader && (
            <div style={{ padding: '24px 32px', borderBottom: `2px solid ${dark ? 'rgba(255,255,255,0.1)' : '#000'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: dark ? '#1a1a1a' : '#fff', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: B_YELLOW, color: '#000', padding: '8px', borderRadius: '2px' }}>
                  {icon}
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', margin: 0, letterSpacing: '-0.02em', color: dark ? '#fff' : '#000' }}>
                  {title}
                </h3>
              </div>
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', cursor: 'pointer', padding: '8px', transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color = B_PINK} onMouseLeave={e => e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}>
                <Icons.X />
              </button>
            </div>
          )}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', width: '100%' }}>
            {children}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── TRANSPARENT DRAG IMAGE SINGLETON (canvas-based, always ready) ──────────
let _dragCanvas = null
function getDragImg() {
  if (!_dragCanvas) {
    _dragCanvas = document.createElement('canvas')
    _dragCanvas.width = 1
    _dragCanvas.height = 1
    _dragCanvas.style.position = 'fixed'
    _dragCanvas.style.top = '-10px'
    _dragCanvas.style.pointerEvents = 'none'
    document.body.appendChild(_dragCanvas)
  }
  return _dragCanvas
}

// ─── MAIN EDITOR COMPONENT ───────────────────────────────────────────────────
export default function OgsmEditor({ project, onSave, onAudit, members = [], darkMode = true, sidebarOpen, aiConfirmShapeConfig }) {
  const [draft, setDraft]   = useState(null)
  const [dirty, setDirty]   = useState(false)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  
  const [showTodoPanel, setShowTodoPanel] = useState(false)
  const [todoPanelOrigin, setTodoPanelOrigin] = useState(null)
  const [auditOrigin, setAuditOrigin] = useState(null)

  const [aiDialog, setAiDialog] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  
  const [openTodos, setOpenTodos] = useState(new Set())
  const toggleTodoRow = (key) => setOpenTodos(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })
  
  const [dragMeasure, setDragMeasure] = useState(null); const [dragOverMeasure, setDragOverMeasure] = useState(null)
  const [dragTodo, setDragTodo] = useState(null); const [dragOverTodo, setDragOverTodo] = useState(null)
  const [dragGoal, setDragGoal] = useState(null); const [dragOverGoal, setDragOverGoal] = useState(null)
  const [dragStrategy, setDragStrategy] = useState(null); const [dragOverStrategy, setDragOverStrategy] = useState(null)
  const scrollRef = useRef(null); const scrollRafRef = useRef(null)
  const dragMouseDownRef = useRef(null)

  const handleScrollZoneDragOver = useCallback((e) => {
    const el = scrollRef.current; if (!el) return
    const { top, bottom } = el.getBoundingClientRect(); const zone = 80, maxSpeed = 18; const y = e.clientY; let speed = 0
    if (y < top + zone) speed = -maxSpeed * (1 - (y - top) / zone)
    else if (y > bottom - zone) speed = maxSpeed * (1 - (bottom - y) / zone)
    if (scrollRafRef.current) { cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = null }
    if (speed !== 0) { const step = () => { el.scrollTop += speed; scrollRafRef.current = requestAnimationFrame(step) }; scrollRafRef.current = requestAnimationFrame(step) }
  }, [])
  const handleScrollZoneDragEnd = useCallback(() => { if (scrollRafRef.current) { cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = null } }, [])

  useEffect(() => {
    if (openTodos.size === 0) return
    const handler = (e) => {
      // 點 todo 區、header 按鈕、sidebar toggle、dark mode toggle 時不收起
      if (
        e.target.closest('[data-todo-zone]') ||
        e.target.closest('.b-action-btn') ||
        e.target.closest('.b-header-btn') ||
        e.target.closest('[data-sidebar-toggle]')
      ) return
      setOpenTodos(new Set())
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openTodos])

  const s = useMemo(() => buildStyles(darkMode), [darkMode])
  const allTodos = useMemo(() => (draft?.goals || []).flatMap(g => g.strategies.flatMap(s => s.measures.flatMap(m => m.todos || []))), [draft])
  const pendingTodos = allTodos.filter(t => !t.done).length

  useEffect(() => {
    const d = JSON.parse(JSON.stringify(project))
    applyOverdueStatus(d)
    setDraft(d)
    setDirty(false)
  }, [project])

  const update = useCallback((updater) => { setDraft(d => updater(JSON.parse(JSON.stringify(d)))); setDirty(true) }, [])

  useEffect(() => {
    if (!draft) return
    const els = document.querySelectorAll('textarea[data-ogsm-autoresize]')
    els.forEach(el => { try { el.style.height = '0px'; el.style.height = el.scrollHeight + 'px' } catch (e) {} })
  }, [draft])

  // ─── DYNAMIC WIDTH CALCULATION ───
  const baseKpiW = editMode ? 220 : COL_KPI
  const baseTotalW = COL_G + COL_S + baseKpiW + COL_VALT + COL_VALP + COL_OWNER + COL_DL + COL_STATUS + COL_PROG + COL_ACT

  const baseTotalWRef = useRef(baseTotalW)
  useEffect(() => { baseTotalWRef.current = baseTotalW }, [baseTotalW])



  const [extraW, setExtraW] = useState(0)

  // 重算 extraW 的通用函式，直接讀 ref 取得最新 baseTotalW
  const recalcExtraW = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const width = el.getBoundingClientRect().width
    const base = baseTotalWRef.current
    setExtraW(width > base + 2 ? Math.floor(width - base - 2) : 0)
  }, [])

  // ResizeObserver：只建立一次，callback 透過 ref 拿最新 baseTotalW
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const observer = new ResizeObserver(() => recalcExtraW())
    observer.observe(el)
    return () => observer.disconnect()
  }, [recalcExtraW])

  // sidebarOpen 改變時，等 CSS transition (300ms) 結束後強制重算
  useEffect(() => {
    const timer = setTimeout(recalcExtraW, 320)
    return () => clearTimeout(timer)
  }, [sidebarOpen, recalcExtraW])

  // baseTotalW 改變時（editMode 切換）也立即重算
  useEffect(() => {
    recalcExtraW()
  }, [baseTotalW, recalcExtraW])

  // 分配剩餘寬度: S(40%), MD 定量指標(30%), 目標值(20%), 實際值(10%)
  const dynS = Math.floor(COL_S + extraW * 0.40)
  const dynKpi = Math.floor(baseKpiW + extraW * 0.3)
  const dynValP = Math.floor(COL_VALP + extraW * 0.10)
  const dynTarget = COL_VALT + extraW - Math.floor(extraW * 0.40) - Math.floor(extraW * 0.3) - Math.floor(extraW * 0.10)

  const toggleTodoById = useCallback((gi, si, mi, todoId) => {
    update(d => {
      const todos = d.goals[gi].strategies[si].measures[mi].todos || []
      d.goals[gi].strategies[si].measures[mi].todos = todos.map(t => t.id === todoId ? { ...t, done: !t.done } : t)
      const updated = d.goals[gi].strategies[si].measures[mi].todos
      const done = updated.filter(t => t.done).length
      d.goals[gi].strategies[si].measures[mi].progress = updated.length ? Math.round((done / updated.length) * 100) : 0
      const today = (() => { const _n = new Date(); return `${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}-${String(_n.getDate()).padStart(2,'0')}` })()
      const isOverdue = d.goals[gi].strategies[si].measures[mi].deadline && d.goals[gi].strategies[si].measures[mi].deadline < today
      if (updated.length > 0 && done === updated.length) d.goals[gi].strategies[si].measures[mi].status = 'Completed'
      else if (isOverdue) d.goals[gi].strategies[si].measures[mi].status = 'Overdue'
      else if (done > 0) d.goals[gi].strategies[si].measures[mi].status = 'InProgress'
      else d.goals[gi].strategies[si].measures[mi].status = 'NotStarted'
      return d
    })
  }, [update])

  const updateTodoById = useCallback((gi, si, mi, todoId, field, value) => {
    update(d => {
      const todos = d.goals[gi].strategies[si].measures[mi].todos || []
      d.goals[gi].strategies[si].measures[mi].todos = todos.map(t => t.id === todoId ? { ...t, [field]: value } : t)
      return d
    })
  }, [update])

  const handleAiConfirm = useCallback(async (text) => {
    if (!aiDialog || !draft) return
    const { type, gi, si, mi } = aiDialog
    setAiLoading(true)

    const makeTodos = (arr) => (arr || []).map(t => ({ id: crypto.randomUUID(), text: typeof t === 'string' ? t : (t.text || ''), done: false, assignee: typeof t === 'object' ? (t.assignee || '') : '', deadline: typeof t === 'object' ? (t.deadline || '') : '', createdAt: new Date().toISOString() }))
    const makeMeasure = (m, sortOrder) => ({ id: null, kpi: m.kpi || '', target: m.target || '', deadline: m.deadline || '', assignee: '', actual: '', progress: 0, status: 'NotStarted', sortOrder, todos: makeTodos(m.todos) })

    try {
      if (type === 'goal') {
        const existingGoals = draft.goals.map(g => g.text).filter(t => t.trim())
        const res = await api.generateForGoal({ goalText: text, objective: draft.objective, deadline: draft.deadline || undefined, existingGoals })
        update(d => {
          const goal = d.goals[gi]
          goal.text = text.trim() || res.goalText || goal.text || `Goal ${gi + 1}`
          goal.strategies = (res.strategies || []).map((s, idx) => ({ id: null, text: s.text || '', sortOrder: idx, todos: [], measures: (s.measures || []).map((m, mi) => makeMeasure(m, mi)) }))
          return d
        })
      } else if (type === 'strategy') {
        const res = await api.generateForStrategy({ strategyText: text, goalText: draft.goals[gi].text, objective: draft.objective, deadline: draft.deadline || undefined })
        update(d => {
          const st = d.goals[gi].strategies[si]
          st.text = text.trim() || res.strategyText || st.text || `Strategy ${si + 1}`
          st.measures = (res.measures || []).map((m, idx) => makeMeasure(m, idx))
          return d
        })
      } else if (type === 'measure') {
        const res = await api.generateForMeasure({ kpiText: text, strategyText: draft.goals[gi].strategies[si].text, objective: draft.objective, deadline: draft.deadline || undefined })
        update(d => {
          const m = d.goals[gi].strategies[si].measures[mi]
          m.kpi = text.trim() || res.kpiText || m.kpi || ''; m.target = res.target || m.target || ''; m.deadline = res.deadline || m.deadline || ''; m.todos = makeTodos(res.todos)
          return d
        })
      }
    } catch (e) { alert('AI 生成失敗：' + e.message) } finally { setAiLoading(false); setAiDialog(null) }
  }, [aiDialog, draft, update])

  const handleSave = async () => { setSaving(true); try { await onSave(draft) } finally { setSaving(false) }; setDirty(false) }

  if (!draft) return null

  // CRUD helpers
  const setField       = (f,v)          => update(d => { d[f] = v; return d })
  const setGoalText    = (gi,v)          => update(d => { d.goals[gi].text = v; return d })
  const addGoal        = ()              => update(d => { d.goals.push(emptyGoal()); return d })
  const removeGoal     = (gi)            => update(d => { d.goals.splice(gi,1); return d })
  const setStratText   = (gi,si,v)       => update(d => { d.goals[gi].strategies[si].text = v; return d })
  const addStrategy    = (gi)            => update(d => { d.goals[gi].strategies.push(emptyStrategy()); return d })
  const removeStrategy = (gi,si)         => update(d => { d.goals[gi].strategies.splice(si,1); return d })
  const setMField      = (gi,si,mi,f,v)  => update(d => {
    d.goals[gi].strategies[si].measures[mi][f] = v; const m = d.goals[gi].strategies[si].measures[mi]; const today = (() => { const _n = new Date(); return `${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}-${String(_n.getDate()).padStart(2,'0')}` })()
    if (f === 'deadline') {
      if (m.deadline && m.deadline < today && m.status !== 'Completed') m.status = 'Overdue'
      else if ((!m.deadline || m.deadline >= today) && m.status === 'Overdue') m.status = autoStatus(m)
    }
    if (f === 'progress') {
      if (m.deadline && m.deadline < today && v < 100) m.status = 'Overdue'; else m.status = autoStatus(m)
    }
    return d
  })
  const addMeasure     = (gi,si)         => update(d => { d.goals[gi].strategies[si].measures.push(emptyMeasure()); return d })
  const removeMeasure  = (gi,si,mi)      => update(d => { d.goals[gi].strategies[si].measures.splice(mi,1); return d })
  const setMTodos      = (gi,si,mi,todos) => update(d => {
    d.goals[gi].strategies[si].measures[mi].todos = todos; const done = todos.filter(t => t.done).length; const pct = todos.length ? Math.round((done / todos.length) * 100) : 0
    d.goals[gi].strategies[si].measures[mi].progress = pct; const m = d.goals[gi].strategies[si].measures[mi]; const today = (() => { const _n = new Date(); return `${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}-${String(_n.getDate()).padStart(2,'0')}` })()
    if (m.deadline && m.deadline < today && pct < 100) m.status = 'Overdue'; else m.status = autoStatus(m)
    return d
  })


  const handleMeasureDragStart = (e, gi, si, mi) => { if (['textarea','input','select','button'].includes(dragMouseDownRef.current)) { e.preventDefault(); return } e.stopPropagation(); setDragMeasure({ gi, si, mi }); e.dataTransfer.effectAllowed = 'move' }
  const handleMeasureDragOver  = (e, gi, si, mi) => { e.preventDefault(); e.stopPropagation(); if (!dragMeasure || dragMeasure.gi !== gi || dragMeasure.si !== si) return; e.dataTransfer.dropEffect = 'move'; if (dragOverMeasure?.mi !== mi) setDragOverMeasure({ gi, si, mi }) }
  const handleMeasureDrop      = (e, gi, si, mi) => { e.preventDefault(); e.stopPropagation(); if (!dragMeasure || dragMeasure.gi !== gi || dragMeasure.si !== si || dragMeasure.mi === mi) { setDragMeasure(null); setDragOverMeasure(null); return } update(d => { const measures = d.goals[gi].strategies[si].measures; const [removed] = measures.splice(dragMeasure.mi, 1); measures.splice(mi, 0, removed); return d }); setDragMeasure(null); setDragOverMeasure(null) }
  const handleMeasureDragEnd   = () => { setDragMeasure(null); setDragOverMeasure(null) }
  const handleTodoDragStart = (e, gi, si, mi, ti) => { if (['textarea','input','select','button'].includes(dragMouseDownRef.current)) { e.preventDefault(); return } e.stopPropagation(); setDragTodo({ gi, si, mi, ti }); e.dataTransfer.effectAllowed = 'move' }
  const handleTodoDragOver  = (e, gi, si, mi, ti) => { e.preventDefault(); e.stopPropagation(); if (!dragTodo || dragTodo.gi !== gi || dragTodo.si !== si || dragTodo.mi !== mi) return; e.dataTransfer.dropEffect = 'move'; if (dragOverTodo?.ti !== ti) setDragOverTodo({ gi, si, mi, ti }) }
  const handleTodoDrop      = (e, gi, si, mi, ti) => { e.preventDefault(); e.stopPropagation(); if (!dragTodo || dragTodo.gi !== gi || dragTodo.si !== si || dragTodo.mi !== mi || dragTodo.ti === ti) { setDragTodo(null); setDragOverTodo(null); return } const todos = [...(draft.goals[gi].strategies[si].measures[mi].todos || [])]; const [removed] = todos.splice(dragTodo.ti, 1); todos.splice(ti, 0, removed); setMTodos(gi, si, mi, todos); setDragTodo(null); setDragOverTodo(null) }
  const handleTodoDragEnd   = () => { setDragTodo(null); setDragOverTodo(null) }
  const handleGoalDragStart = (e, gi) => { if (['textarea','input','select','button'].includes(dragMouseDownRef.current)) { e.preventDefault(); return } setDragGoal(gi); e.dataTransfer.effectAllowed = 'move' }
  const handleGoalDragOver  = (e, gi) => { e.preventDefault(); if (dragGoal == null) return; e.dataTransfer.dropEffect = 'move'; if (dragOverGoal !== gi) setDragOverGoal(gi) }
  const handleGoalDrop      = (e, gi) => { e.preventDefault(); if (dragGoal == null || dragGoal === gi) { setDragGoal(null); setDragOverGoal(null); return } update(d => { const [r] = d.goals.splice(dragGoal, 1); d.goals.splice(gi, 0, r); return d }); setDragGoal(null); setDragOverGoal(null) }
  const handleGoalDragEnd   = () => { setDragGoal(null); setDragOverGoal(null) }
  const handleStrategyDragStart = (e, gi, si) => { if (['textarea','input','select','button'].includes(dragMouseDownRef.current)) { e.preventDefault(); return } e.stopPropagation(); setDragStrategy({ gi, si }); e.dataTransfer.effectAllowed = 'move' }
  const handleStrategyDragOver  = (e, gi, si) => { e.preventDefault(); e.stopPropagation(); if (!dragStrategy || dragStrategy.gi !== gi) return; e.dataTransfer.dropEffect = 'move'; if (dragOverStrategy?.si !== si) setDragOverStrategy({ gi, si }) }
  const handleStrategyDrop      = (e, gi, si) => { e.preventDefault(); e.stopPropagation(); if (!dragStrategy || dragStrategy.gi !== gi || dragStrategy.si === si) { setDragStrategy(null); setDragOverStrategy(null); return } update(d => { const strategies = d.goals[gi].strategies; const [r] = strategies.splice(dragStrategy.si, 1); strategies.splice(si, 0, r); return d }); setDragStrategy(null); setDragOverStrategy(null) }
  const handleStrategyDragEnd   = () => { setDragStrategy(null); setDragOverStrategy(null) }

  const allMeasures = draft.goals.flatMap(g => g.strategies.flatMap(s => s.measures))
  const overallProgress = allMeasures.length ? Math.round(allMeasures.reduce((sum, m) => sum + (m.progress || 0), 0) / allMeasures.length) : 0
  const isCompleted = allMeasures.length > 0 && overallProgress >= 100
  const isProjectOverdue = draft.deadline && draft.deadline < (() => { const _n = new Date(); return `${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}-${String(_n.getDate()).padStart(2,'0')}` })() && !isCompleted
  const dark = darkMode

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'transparent', position: 'relative' }}>

      <style>{`
        @keyframes b-spin { to { transform: rotate(360deg); } }
        @keyframes ogsm-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }

        .ogsm-slide-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 9998; animation: ogsm-fade-in 0.2s ease-out forwards; }
        .ogsm-slide-panel { position: fixed; top: 0; right: 0; bottom: 0; z-index: 9999; box-shadow: -10px 0 40px rgba(0,0,0,0.4); display: flex; flex-direction: column; height: 100%; }
        .ogsm-slide-panel-morph {
          animation: slidePanelMorph 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes slidePanelMorph {
          0%   { transform: scale(0.08); opacity: 0.6; }
          100% { transform: scale(1);    opacity: 1; }
        }
        
        .b-header-btn { border: 2px solid #000; box-shadow: 2px 2px 0 rgba(0,0,0,1); transition: transform 0.1s, box-shadow 0.1s, background 0.15s, color 0.15s; cursor: pointer; display: flex; alignItems: center; gap: 8px; font-weight: 900; text-transform: uppercase; font-size: 11px; font-family: "Space Grotesk", sans-serif; letter-spacing: 0.04em; }
        .dark .b-header-btn { border-color: rgba(255,255,255,0.2); box-shadow: 2px 2px 0 rgba(255,255,255,0.1); }
        .b-header-btn:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0 rgba(0,0,0,1); }
        .dark .b-header-btn:active { box-shadow: 1px 1px 0 rgba(255,255,255,0.1); }
        
        .ogsm-table-row { transition: background 0.15s; }
        .ogsm-table-row:hover { background: ${dark ? 'rgba(0,0,255,0.04)' : 'rgba(0,0,255,0.02)'}; }

        .ogsm-remove-btn:hover { background: ${B_PINK} !important; border-color: rgba(0,0,0,0.35) !important; color: #000 !important; transform: scale(1.05); box-shadow: 2px 2px 0 rgba(80,80,80,0.5); }
        .ogsm-add-btn:hover { color: ${B_YELLOW} !important; }
        .ogsm-ai-btn:hover { background: ${B_YELLOW} !important; border-color: #000 !important; color: #000 !important; box-shadow: 2px 2px 0 #000; transform: scale(1.05); }
        .ogsm-measure-drag-row[data-dragging='true'], .ogsm-goal-drag-block[data-dragging='true'], .ogsm-strategy-drag-block[data-dragging='true'] { opacity: 0.5 !important; filter: blur(2px) !important; }
        .ogsm-measure-drag-row[data-dragover='true'], .ogsm-goal-drag-block[data-dragover='true'], .ogsm-strategy-drag-block[data-dragover='true'] { outline: 2px solid ${B_YELLOW}; outline-offset: -1px; }
        
        /* 改為取消文字選中或聚焦時的藍色外框 */
        textarea:focus, input:focus, select:focus { outline: none !important; box-shadow: none !important; }
        ::selection { background: ${B_YELLOW}; color: #000; }
        .ogsm-date::-webkit-calendar-picker-indicator { cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M14 6 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%23000000" /><path d="M10 2 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%23FF00FF" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></svg>') 10 2, pointer !important; }
        .ogsm-date-overdue::-webkit-calendar-picker-indicator { filter: brightness(0) saturate(100%) invert(12%) sepia(90%) saturate(6000%) hue-rotate(0deg) brightness(85%); cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M14 6 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%23000000" /><path d="M10 2 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%23FF00FF" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></svg>') 10 2, pointer !important; }
      `}</style>

      {/* ── Top Header ── */}
      <div style={{ padding: sidebarOpen ? '12px 24px' : '12px 24px 12px 84px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 20, background: 'transparent', flexShrink: 0, transition: 'padding 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0, marginRight: '16px' }}>

          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>
            <input
              type="text"
              style={{ background: 'transparent', border: 'none', color: dark ? '#fff' : '#000', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '24px', letterSpacing: '-0.02em', textTransform: 'uppercase', fontStyle: 'italic', outline: 'none', width: '100%', marginBottom: '4px', lineHeight: 1 }}
              value={draft.title}
              onChange={e => setField('title', e.target.value)}
              placeholder="專案標題"
              readOnly={!editMode}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: dark ? B_BLUE : '#000', color: dark ? '#fff' : B_YELLOW, fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 6px' }}>OGSM</span>
              {isCompleted && (
                <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', background: B_GREEN, color: '#000', padding: '2px 8px', border: '1.5px solid rgba(0,0,0,0.25)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                  計畫已完成
                </span>
              )}
              {isProjectOverdue && (
                <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', background: B_PINK, color: '#fff', padding: '2px 8px', border: '1.5px solid rgba(0,0,0,0.25)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  計畫已逾期
                </span>
              )}
              <span style={{ fontSize: '9px', fontWeight: 700, color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', textTransform: 'uppercase' }}>更新：{new Date(draft.updatedAt).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.4, color: dark ? '#fff' : '#000' }}>整體進度</span>
              <div style={{ width: '100px', height: '6px', background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: '99px', overflow: 'hidden', border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                <div style={{ height: '100%', width: `${overallProgress}%`, background: `linear-gradient(90deg, ${B_YELLOW}, ${B_GREEN})`, transition: 'width 0.4s' }} />
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 900, fontStyle: 'italic', color: dark ? '#fff' : '#000' }}>{overallProgress}%</span>
            </div>
          </div>

          <button className="b-header-btn b-action-btn" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setAuditOrigin(r); onAudit(draft, r); }} style={{ padding: '6px 12px', background: dark ? '#2a2a2a' : '#fff', color: dark ? '#fff' : '#000' }} onMouseEnter={e => { e.currentTarget.style.background = dark ? '#ffee59' : '#ffee59'; e.currentTarget.style.color = dark ? '#000' : '#000' }} onMouseLeave={e => { e.currentTarget.style.background = dark ? '#2a2a2a' : '#fff'; e.currentTarget.style.color = dark ? '#fff' : '#000' }}>
            <Icons.FileText /> 審計報告
          </button>
          
          <button className="b-header-btn b-action-btn" onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setTodoPanelOrigin(r); setShowTodoPanel(true); }} style={{ padding: '6px 12px', background: dark ? '#2a2a2a' : '#fff', color: dark ? '#fff' : '#000', position: 'relative' }} onMouseEnter={e => { e.currentTarget.style.background = dark ? '#ffee59' : '#ffee59'; e.currentTarget.style.color = dark ? '#000' : '#000' }} onMouseLeave={e => { e.currentTarget.style.background = dark ? '#2a2a2a' : '#fff'; e.currentTarget.style.color = dark ? '#fff' : '#000' }}>
            <Icons.CheckCircle /> MP 總覽
            {pendingTodos > 0 && <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: B_PINK, color: '#fff', fontSize: '9px', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: `1px solid ${dark ? '#2a2a2a' : '#fff'}` }}>{pendingTodos > 99 ? '99' : pendingTodos}</span>}
          </button>

          <button className="b-header-btn b-action-btn" onClick={() => setEditMode(!editMode)} style={{ padding: '6px 12px', background: editMode ? (dark ? '#fff' : '#000') : (dark ? 'rgba(0,0,255,0.2)' : 'rgba(0,0,255,0.1)'), color: editMode ? (dark ? '#000' : '#fff') : '#5d90d8' }} onMouseEnter={e => { e.currentTarget.style.background = B_BLUE; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = editMode ? (dark ? '#fff' : '#000') : (dark ? 'rgba(0,0,255,0.2)' : 'rgba(0,0,255,0.1)'); e.currentTarget.style.color = editMode ? (dark ? '#000' : '#fff') : '#5d90d8' }}>
            <Icons.Edit /> {editMode ? '停止編輯' : '編輯'}
          </button>
          
          <button className="b-header-btn b-action-btn" onClick={handleSave} disabled={saving || !dirty} style={{ padding: '6px 12px', background: dirty && !saving ? B_GREEN : (dark ? '#2a2a2a' : '#f3f4f6'), color: dirty && !saving ? '#000' : (dark ? 'rgba(255,255,255,0.4)' : '#9ca3af'), cursor: dirty && !saving ? 'pointer' : 'not-allowed' }} onMouseEnter={e => { if(dirty && !saving) e.currentTarget.style.background = '#fff' }} onMouseLeave={e => { if(dirty && !saving) e.currentTarget.style.background = B_GREEN }}>
            <Icons.Check /> {saving ? '儲存中' : dirty ? '儲存' : '已儲存'}
          </button>
        </div>
      </div>

      {/* ── Objective & Deadline ── */}
      <div style={{ padding: '6px 24px 0 24px', flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '12px' }}>
          <div style={{ padding: '12px 16px', border: `2px solid ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`, background: dark ? 'rgba(20,20,20,0.4)' : 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', color: B_YELLOW, marginBottom: '4px' }}>O - Objective</div>
            <textarea
              style={{ width: '100%', background: 'transparent', border: 'none', color: dark ? '#fff' : '#000', fontFamily: 'inherit', fontWeight: 700, fontSize: '14px', lineHeight: 1.4, resize: 'none', outline: 'none' }}
              value={draft.objective}
              onChange={e => setField('objective', e.target.value)}
              placeholder="輸入核心目標…"
              rows={1}
              readOnly={!editMode}
            />
          </div>
          <div style={{ padding: '12px 16px', border: `2px solid ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`, background: dark ? 'rgba(20,20,20,0.4)' : 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <label style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5, marginBottom: '4px', color: dark ? '#fff' : '#000' }}>計畫截止期限</label>
            <input
              type="date"
              className="ogsm-date"
              style={{ background: 'transparent', border: 'none', color: dark ? '#fff' : '#000', fontSize: '14px', fontFamily: 'monospace', fontWeight: 900, outline: 'none', colorScheme: dark ? 'dark' : 'light', width: '100%', cursor: editMode ? 'text' : 'default' }}
              value={draft.deadline || ''}
              onChange={e => setField('deadline', e.target.value)}
              readOnly={!editMode}
            />
          </div>
        </div>
      </div>

      {/* ── Table (利用 100% 寬度與 ResizeObserver 動態分配比例) ── */}
      <div style={{ flex: 1, minHeight: 0, padding: '12px 24px 24px 24px', display: 'flex', flexDirection: 'column' }}>
        <div ref={scrollRef} data-scroll-container="" style={{ flex: 1, overflow: 'auto', background: dark ? 'rgba(10,10,10,0.35)' : 'rgba(255,255,255,0.35)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `2px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`, boxShadow: `4px 4px 0 ${dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }} className="custom-scrollbar" onDragOver={handleScrollZoneDragOver} onDragEnd={handleScrollZoneDragEnd} onDrop={handleScrollZoneDragEnd}>
          <div style={{ width: '100%', minWidth: `${baseTotalW}px` }}>
            
            {/* Table Header (Sticky) */}
            <div style={{ display: 'flex', background: dark ? 'rgba(20,20,20,0.85)' : 'rgba(243,244,246,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: `2px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, position: 'sticky', top: 0, zIndex: 10 }}>
              {[
                { label: 'G - Goals',      w: COL_G      },
                { label: 'S - Strategies', w: dynS       },
                { label: 'MD 定量指標',    w: dynKpi     },
                { label: '目標值',          w: dynTarget  },
                { label: '實際值',          w: dynValP    },
                { label: '負責人',          w: COL_OWNER  },
                { label: '期限',            w: COL_DL     },
                { label: '狀態',            w: COL_STATUS },
                { label: '進度',            w: COL_PROG   },
                { label: 'MP 檢核指標',      w: COL_ACT    },
              ].map((col, i) => (
                <div key={i} style={{ width: col.w, minWidth: col.w, padding: '12px 16px', fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', borderRight: i < 9 ? `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` : 'none', flexShrink: 0 }}>
                  {col.label}
                </div>
              ))}
            </div>

            {/* Table Content */}
            {draft.goals.length === 0 && (
              <div style={{ padding: '64px', textAlign: 'center', color: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                尚無 Goals，點擊下方「+ 新增 Goal」
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {draft.goals.map((goal, gi) => {
                const isGDragging = dragGoal === gi
                const isGDragOver = dragOverGoal === gi && dragGoal !== gi
                return (
                  <div key={goal.id ?? `g-${gi}`} className="ogsm-goal-drag-block" data-dragging={isGDragging ? 'true' : 'false'} data-dragover={isGDragOver ? 'true' : 'false'} style={{ display: 'flex', borderBottom: `2px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, cursor: editMode ? 'grab' : 'default' }} draggable={editMode} onMouseDown={e => { dragMouseDownRef.current = e.target.tagName.toLowerCase() }} onDragStart={editMode ? e => handleGoalDragStart(e, gi) : undefined} onDragOver={editMode ? e => handleGoalDragOver(e, gi) : undefined} onDrop={editMode ? e => handleGoalDrop(e, gi) : undefined} onDragEnd={editMode ? handleGoalDragEnd : undefined}>
                    
                    {/* Goal cell */}
                    <div style={{ width: COL_G, minWidth: COL_G, flexShrink: 0, padding: '16px', borderRight: `2px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, position: 'relative' }}>
                      {editMode && <div style={{ position: 'absolute', left: '4px', top: '16px', color: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', fontSize: '13px', cursor: 'grab', userSelect: 'none' }}>⠿</div>}
                      <div style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: B_YELLOW, marginBottom: '6px' }}>G{gi + 1}</div>
                      <textarea data-ogsm-autoresize style={{ ...s.measureText, fontWeight: 900, fontSize: '13px', textTransform: 'uppercase', paddingLeft: editMode ? '12px' : '0' }} value={goal.text} onChange={e => setGoalText(gi, e.target.value)} onInput={autoResize} ref={initResize} placeholder="Goal 描述…" rows={3} readOnly={!editMode} />
                      {editMode && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                          {goal.id == null && <button style={s.aiBtnSmall} title="AI 生成 Strategies" className="ogsm-ai-btn" onClick={() => setAiDialog({ type: 'goal', gi, si: null, mi: null, currentText: goal.text })}>⚡</button>}
                          <button className="ogsm-remove-btn" style={s.iconBtn} onClick={() => removeGoal(gi)}>✕</button>
                        </div>
                      )}
                    </div>

                    {/* Strategies wrapper */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      {goal.strategies.map((st, si) => {
                        const isSDragging = dragStrategy?.gi === gi && dragStrategy?.si === si
                        const isSDragOver = dragOverStrategy?.gi === gi && dragOverStrategy?.si === si && !isSDragging
                        return (
                          <div key={st.id ?? `s-${si}`} className="ogsm-strategy-drag-block" data-dragging={isSDragging ? 'true' : 'false'} data-dragover={isSDragOver ? 'true' : 'false'} style={{ display: 'flex', borderBottom: si < goal.strategies.length - 1 ? `2px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` : 'none' }} draggable={editMode} onMouseDown={e => { dragMouseDownRef.current = e.target.tagName.toLowerCase() }} onDragStart={editMode ? e => handleStrategyDragStart(e, gi, si) : undefined} onDragOver={editMode ? e => handleStrategyDragOver(e, gi, si) : undefined} onDrop={editMode ? e => handleStrategyDrop(e, gi, si) : undefined} onDragEnd={editMode ? handleStrategyDragEnd : undefined}>
                            
                            {/* Strategy cell */}
                            <div style={{ width: dynS, minWidth: dynS, flexShrink: 0, padding: '16px', borderRight: `2px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, position: 'relative' }}>
                              {editMode && <div style={{ position: 'absolute', left: '4px', top: '16px', color: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', fontSize: '13px', cursor: 'grab', userSelect: 'none' }}>⠿</div>}
                              <div style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', marginBottom: '6px' }}>S{gi + 1}.{si + 1}</div>
                              <textarea data-ogsm-autoresize style={{ ...s.measureText, paddingLeft: editMode ? '12px' : '0' }} value={st.text} onChange={e => setStratText(gi, si, e.target.value)} onInput={autoResize} ref={initResize} placeholder="Strategy 描述…" rows={2} readOnly={!editMode} />
                              {editMode && (
                                <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                                  {st.id == null && <button style={s.aiBtnSmall} title="AI 生成 Measures" className="ogsm-ai-btn" onClick={() => setAiDialog({ type: 'strategy', gi, si, mi: null, currentText: st.text })}>⚡</button>}
                                  <button className="ogsm-remove-btn" style={s.iconBtn} onClick={() => removeStrategy(gi, si)}>✕</button>
                                </div>
                              )}
                            </div>

                            {/* Measures wrapper */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                              {st.measures.map((m, mi) => {
                                const sc = STATUS_CONFIG[m.status] || STATUS_CONFIG.NotStarted
                                const isMDragging = dragMeasure?.gi === gi && dragMeasure?.si === si && dragMeasure?.mi === mi
                                const isMDragOver = dragOverMeasure?.gi === gi && dragOverMeasure?.si === si && dragOverMeasure?.mi === mi && !isMDragging
                                
                                const todoKey = `${gi}-${si}-${mi}`
                                const todoOpen = openTodos.has(todoKey)
                                const todos = m.todos || []
                                const doneCount = todos.filter(t => t.done).length

                                return (
                                  <div key={m.id ?? `m-${mi}`} className="ogsm-measure-drag-row ogsm-table-row" data-dragging={isMDragging ? 'true' : 'false'} data-dragover={isMDragOver ? 'true' : 'false'} draggable={editMode} onMouseDown={e => { dragMouseDownRef.current = e.target.tagName.toLowerCase() }} onDragStart={editMode ? e => handleMeasureDragStart(e, gi, si, mi) : undefined} onDragOver={editMode ? e => handleMeasureDragOver(e, gi, si, mi) : undefined} onDrop={editMode ? e => handleMeasureDrop(e, gi, si, mi) : undefined} onDragEnd={editMode ? handleMeasureDragEnd : undefined}>
                                    <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: mi < st.measures.length - 1 ? `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` : 'none', minHeight: '64px' }}>
                                      
                                      {/* KPI */}
                                      <div style={{ width: dynKpi, minWidth: dynKpi, padding: '12px 16px', borderRight: `2px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, flexShrink: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignSelf: 'stretch' }}>
                                        {editMode && <div style={{ position: 'absolute', left: '4px', top: '12px', color: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', fontSize: '13px', cursor: 'grab', userSelect: 'none' }}>⠿</div>}
                                        <div style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', marginBottom: '6px', paddingLeft: editMode ? '12px' : '0' }}>D{gi+1}.{si+1}.{mi+1}</div>
                                        <textarea data-ogsm-autoresize style={{ ...s.measureText, paddingLeft: editMode ? '12px' : '0', color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }} value={m.kpi} onChange={e => setMField(gi,si,mi,'kpi',e.target.value)} onInput={autoResize} ref={initResize} placeholder="MD 定量指標名稱" rows={1} readOnly={!editMode} />
                                        {editMode && (
                                          <div style={{ display: 'flex', gap: '4px', marginTop: '8px', paddingLeft: '12px' }}>
                                            {m.id == null && <button className="ogsm-ai-btn" style={s.aiBtnSmall} title="AI 生成 MP 檢核指標" onClick={() => setAiDialog({ type: 'measure', gi, si, mi, currentText: m.kpi })}>⚡</button>}
                                            <button className="ogsm-remove-btn" style={s.iconBtn} onClick={() => removeMeasure(gi, si, mi)}>✕</button>
                                          </div>
                                        )}
                                      </div>

                                      {/* Target */}
                                      <div style={{ width: dynTarget, minWidth: dynTarget, padding: '12px 16px', borderRight: `2px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                        <textarea data-ogsm-autoresize style={{ ...s.measureText, color: B_YELLOW, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '13px', fontStyle: 'italic' }} value={m.target} onChange={e => setMField(gi,si,mi,'target',e.target.value)} onInput={autoResize} ref={initResize} placeholder="目標" rows={1} readOnly={!editMode} />
                                      </div>

                                      {/* Actual */}
                                      <div style={{ width: dynValP, minWidth: dynValP, padding: '12px 16px', borderRight: `2px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                        {editMode ? (
                                          <textarea data-ogsm-autoresize className="ogsm-actual-input" style={{ ...s.measureText, color: B_GREEN, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '13px', fontStyle: 'italic' }} value={m.actual} onChange={e => setMField(gi,si,mi,'actual',e.target.value)} onInput={autoResize} ref={initResize} placeholder="實際" rows={1} />
                                        ) : (
                                          <span style={{ color: (m.actual && m.actual.trim()) ? B_GREEN : (dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'), fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '13px', fontStyle: 'italic' }}>{(m.actual && m.actual.trim()) ? m.actual : '—'}</span>
                                        )}
                                      </div>

                                      {/* Assignee */}
                                      <div style={{ width: COL_OWNER, minWidth: COL_OWNER, padding: '12px 16px', borderRight: `2px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                        {editMode ? (
                                          <BrutalistSelect
                                            multiple
                                            value={Array.isArray(m.assignee) ? m.assignee : (m.assignee ? [m.assignee] : [])}
                                            onChange={v => setMField(gi,si,mi,'assignee',v)}
                                            options={members.map(mb => ({ value: mb, label: mb }))}
                                            darkMode={dark}
                                            style={{ width: '100%', fontSize: '11px', fontWeight: 700, minHeight: '22px', boxSizing: 'border-box' }}
                                          />
                                        ) : (
                                          <span style={{ fontSize: '11px', fontWeight: 700, color: dark ? '#a0b8ff' : '#000' }}>{Array.isArray(m.assignee) ? (m.assignee.length ? m.assignee.join(', ') : '—') : (m.assignee || '—')}</span>
                                        )}
                                      </div>

                                      {/* Deadline */}
                                      <div style={{ width: COL_DL, minWidth: COL_DL, padding: '12px 16px', borderRight: `2px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                        {editMode ? (
                                          <input type="date" className="ogsm-date" style={{ background: 'none', border: 'none', color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontSize: '10px', fontFamily: 'monospace', outline: 'none', width: '100%', colorScheme: dark ? 'dark' : 'light' }} value={m.deadline || ''} onChange={e => setMField(gi,si,mi,'deadline',e.target.value)} />
                                        ) : (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, opacity: 0.6, color: dark ? '#fff' : '#000' }}>
                                            {m.deadline || '—'}
                                          </div>
                                        )}
                                      </div>

                                      {/* Status */}
                                      <div style={{ width: COL_STATUS, minWidth: COL_STATUS, padding: '12px 16px', borderRight: `2px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                        {editMode ? (
                                          <BrutalistSelect
                                            value={m.status || 'NotStarted'}
                                            onChange={v => setMField(gi,si,mi,'status',v)}
                                            options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
                                            darkMode={dark}
                                            style={{ width: '100%', fontSize: '12px', fontWeight: 900, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, minHeight: '22px', boxSizing: 'border-box' }}
                                          />
                                        ) : (
                                          <span style={{ fontSize: '10px', fontWeight: 900, color: sc.color }}>{sc.label}</span>
                                        )}
                                      </div>

                                      {/* Progress */}
                                      <div style={{ width: COL_PROG, minWidth: COL_PROG, padding: '12px 16px', borderRight: `2px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '13px', fontStyle: 'italic', color: dark ? '#fff' : '#000' }}>{m.progress}%</span>
                                        </div>
                                        <div style={{ height: '4px', background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                                          <div style={{ height: '100%', width: `${m.progress}%`, background: m.progress >= 100 ? B_GREEN : m.progress >= 60 ? B_BLUE : m.progress >= 30 ? B_YELLOW : B_PINK, transition: 'width 0.3s, background 0.3s' }} />
                                        </div>
                                      </div>

                                      {/* MP Column */}
                                      <div data-todo-zone style={{ width: COL_ACT, minWidth: COL_ACT, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <button onClick={() => toggleTodoRow(todoKey)} title="展開/收起 MP 檢核步驟" style={{ background: 'none', border: 'none', color: todoOpen ? '#ff9d00' : B_BLUE, cursor: 'pointer', transition: 'transform 0.15s', fontSize: '16px', fontWeight: 900 }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                            {todoOpen ? '▾' : '▸'}
                                          </button>
                                          <span onClick={() => toggleTodoRow(todoKey)} title="展開/收起 MP 檢核步驟" style={{ fontSize: '10px', fontWeight: 700, opacity: 0.4, cursor: 'pointer', color: dark ? '#fff' : '#000' }}>{doneCount}/{todos.length} 完成</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* MP 檢核步驟展開列 */}
                                    {openTodos.has(todoKey) && (() => {
                                      const now = new Date(); const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
                                      const updateTodo = (tid, field, val) => setMTodos(gi, si, mi, (m.todos || []).map(t => t.id === tid ? { ...t, [field]: val } : t))
                                      const removeTodo = (tid) => setMTodos(gi, si, mi, (m.todos || []).filter(t => t.id !== tid))
                                      const addTodo = () => setMTodos(gi, si, mi, [...(m.todos || []), { id: crypto.randomUUID(), text: '', done: false, assignee: '', deadline: '', createdAt: new Date().toISOString() }])
                                      return (
                                        <div data-todo-zone style={{ borderTop: `1px dashed ${dark ? 'rgba(0,0,255,0.3)' : 'rgba(0,0,255,0.2)'}`, padding: '6px 10px 6px 10px', borderLeft: `3px solid ${B_BLUE}`, background: dark ? 'rgba(0,0,255,0.03)' : 'rgba(0,0,255,0.025)', width: dynKpi + dynTarget + dynValP + COL_OWNER + COL_DL + COL_STATUS + COL_PROG + COL_ACT, boxSizing: 'border-box' }}>
                                          {(m.todos || []).length === 0 && !editMode ? null : (m.todos || []).map((t, ti) => {
                                            const tOverdue = t.deadline && t.deadline < today && !t.done
                                            const isTDragging = dragTodo?.gi === gi && dragTodo?.si === si && dragTodo?.mi === mi && dragTodo?.ti === ti
                                            const isTDragOver = dragOverTodo?.gi === gi && dragOverTodo?.si === si && dragOverTodo?.mi === mi && dragOverTodo?.ti === ti && !isTDragging
                                            return (
                                              <div key={t.id ?? ti} draggable={editMode} onDragStart={editMode ? e => handleTodoDragStart(e, gi, si, mi, ti) : undefined} onDragOver={editMode ? e => handleTodoDragOver(e, gi, si, mi, ti) : undefined} onDrop={editMode ? e => handleTodoDrop(e, gi, si, mi, ti) : undefined} onDragEnd={editMode ? handleTodoDragEnd : undefined}
                                                style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', marginBottom: '1px', minHeight: '16px', opacity: isTDragging ? 0.35 : 1, borderTop: isTDragOver ? `2px solid ${B_BLUE}` : '2px solid transparent', transition: 'border-color 0.1s, opacity 0.15s' }}
                                                onMouseDown={e => { dragMouseDownRef.current = e.target.tagName.toLowerCase() }}>
                                                {editMode && <span style={{ fontSize: '11px', color: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', cursor: 'grab', flexShrink: 0, marginTop: '4px', lineHeight: 1.5, userSelect: 'none' }}>⠿</span>}
                                                <button style={{ width: '10px', height: '10px', flexShrink: 0, border: `2px solid ${t.done ? B_GREEN : (dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')}`, borderRadius: 0, background: t.done ? B_GREEN : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, outline: 'none', alignSelf: 'flex-start', marginTop: '3px' }} onClick={() => updateTodo(t.id, 'done', !t.done)}>
                                                  {t.done && <span style={{ fontSize: '10px', color: '#000', fontWeight: 900 }}><Icons.Check /></span>}
                                                </button>
                                                {editMode ? (
                                                  <>
                                                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: B_BLUE, flexShrink: 0, marginTop: '3px', lineHeight: 1.5, fontWeight: 700 }}>P{gi+1}.{si+1}.{mi+1}.{ti+1}</span>
                                                    <textarea style={{ flex: 1, background: 'none', border: 'none', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)'}`, color: t.done ? (dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)') : (dark ? '#fff' : '#000'), fontSize: '11px', fontFamily: 'inherit', fontWeight: 700, outline: 'none', padding: '1px 0', textDecoration: t.done ? 'line-through' : 'none', minWidth: 0, resize: 'none', overflow: 'hidden', lineHeight: 1.5, wordBreak: 'break-word' }} value={t.text} rows={1} onChange={e => { updateTodo(t.id, 'text', e.target.value); e.target.style.height = '0px'; e.target.style.height = e.target.scrollHeight + 'px' }} onFocus={e => { e.target.style.height = '0px'; e.target.style.height = e.target.scrollHeight + 'px' }} placeholder="輸入檢核步驟…" />
                                                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center', alignSelf: 'flex-start', marginTop: '2px' }}>
                                                      <BrutalistSelect
                                                        multiple
                                                        tagLayout="wrap"
                                                        maxTagCols={3}
                                                        value={Array.isArray(t.assignee) ? t.assignee : (t.assignee ? [t.assignee] : [])}
                                                        onChange={v => updateTodo(t.id, 'assignee', v)}
                                                        options={members.map(mb => ({ value: mb, label: mb }))}
                                                        darkMode={dark}
                                                        overdue={tOverdue}
                                                        style={{ width: '200px', fontSize: '11px', fontWeight: 700, minHeight: '22px', boxSizing: 'border-box' }}
                                                      />
                                                      <div style={{ display: 'flex', alignItems: 'center', height: '22px', boxSizing: 'border-box', border: `1px solid ${tOverdue ? '#cc0000' : (dark ? 'rgba(255,255,255,0.2)' : '#000')}`, background: dark ? '#222' : '#f0f0f0', padding: '0 4px' }}>
                                                        <input type="date" className={`ogsm-date${tOverdue ? ' ogsm-date-overdue' : ''}`} style={{ width: '96px', background: 'none', border: 'none', color: tOverdue ? '#cc0000' : (dark ? '#fff' : '#000'), fontSize: '11px', fontFamily: 'monospace', padding: 0, outline: 'none', colorScheme: dark ? 'dark' : 'light', height: '20px' }} value={t.deadline || ''} max={m.deadline || undefined} onChange={e => updateTodo(t.id, 'deadline', e.target.value)} />
                                                      </div>
                                                      <button className="ogsm-remove-btn" style={{ background: 'rgba(255,0,255,0.12)', border: '1px solid rgba(255,0,255,0.4)', color: B_PINK, cursor: 'pointer', padding: 0, width: '22px', height: '22px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={() => removeTodo(t.id)}><Icons.X /></button>
                                                    </div>
                                                  </>
                                                ) : (
                                                  <>
                                                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: B_BLUE, flexShrink: 0, marginTop: '3px', lineHeight: 1.5, fontWeight: 700 }}>P{gi+1}.{si+1}.{mi+1}.{ti+1}</span>
                                                    <span style={{ fontSize: '11px', lineHeight: 1.5, color: t.done ? (dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)') : (dark ? '#fff' : '#000'), textDecoration: t.done ? 'line-through' : 'none', cursor: 'pointer', flex: 1, wordBreak: 'break-word', fontWeight: 700 }} onClick={() => updateTodo(t.id, 'done', !t.done)}>{t.text}</span>
                                                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center', alignSelf: 'flex-start', marginTop: '2px' }}>
                                                      {(Array.isArray(t.assignee) ? t.assignee.length > 0 : !!t.assignee) && <span style={{ fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, color: dark ? '#ffffff' : '#000', background: dark ? 'rgba(80,110,255,0.35)' : 'rgba(0,0,0,0.06)', border: `1px solid ${dark ? 'rgba(140,170,255,0.6)' : 'rgba(0,0,0,0.2)'}`, padding: '2px 6px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>{Array.isArray(t.assignee) ? t.assignee.join(', ') : t.assignee}</span>}
                                                      {t.deadline && <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, color: tOverdue ? '#cc0000' : (dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'), background: tOverdue ? 'rgba(204,0,0,0.08)' : 'transparent', border: `1px solid ${tOverdue ? '#cc0000' : (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)')}`, padding: '2px 6px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>{tOverdue ? <span style={{ fontSize: '11px' }}>⚠</span> : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}{t.deadline}</span>}
                                                    </div>
                                                  </>
                                                )}
                                              </div>
                                            )
                                          })}
                                          {editMode && (
                                            <button className="ogsm-add-btn" style={{ background: 'none', border: 'none', borderTop: `2px dashed ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, color: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)', cursor: 'pointer', fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, padding: '5px 0 0 0', marginTop: '4px', width: '100%', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }} onClick={addTodo}>+ 新增檢核步驟</button>
                                          )}
                                        </div>
                                      )
                                    })()}
                                  </div>
                                )
                              })}
                              {editMode && (
                                <button className="ogsm-add-btn" style={{ background: 'none', border: 'none', borderTop: `2px dashed ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, color: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)', cursor: 'pointer', fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, padding: '12px 16px', textAlign: 'left', width: '100%', textTransform: 'uppercase', letterSpacing: '0.06em' }} onClick={() => addMeasure(gi, si)}>+ MD 定量指標</button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      {editMode && (
                        <button className="ogsm-add-btn" style={{ background: 'none', border: 'none', color: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)', cursor: 'pointer', fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, padding: '12px', textAlign: 'left', borderTop: `2px dashed ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, width: '100%', textTransform: 'uppercase', letterSpacing: '0.06em' }} onClick={() => addStrategy(gi)}>+ 新增 Strategy</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {editMode && (
              <div style={{ borderTop: `2px dashed ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                <button className="ogsm-add-btn" style={{ width: '100%', background: 'none', border: 'none', color: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)', cursor: 'pointer', fontSize: '11px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, padding: '20px 16px', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }} onClick={addGoal}>+ 新增 Goal</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showTodoPanel && draft && (
        <TodoManagerPanel project={draft} onClose={() => setShowTodoPanel(false)} onToggleTodo={toggleTodoById} onUpdateTodo={updateTodoById} members={members} darkMode={darkMode} originRect={todoPanelOrigin} />
      )}

      {/* AI Loading & Dialog */}
      {aiLoading && (
        <div className="ogsm-ai-loading-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
          <div style={{ width: '48px', height: '48px', border: `6px solid rgba(255,255,255,0.1)`, borderTopColor: B_YELLOW, animation: 'b-spin 0.7s linear infinite' }} />
          <div style={{ color: B_YELLOW, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI 生成中…</div>
        </div>
      )}

      {aiDialog && !aiLoading && (
        <AiConfirmDialog type={aiDialog.type} currentText={aiDialog.currentText} onConfirm={handleAiConfirm} onCancel={() => setAiDialog(null)} darkMode={darkMode} shapeConfig={aiConfirmShapeConfig} />
      )}
    </div>
  )
}

function buildStyles(dark) {
  return {
    measureText: {
      background: 'none', border: 'none', color: dark ? '#fff' : '#000',
      fontSize: '12px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
      outline: 'none', width: '100%', resize: 'none', lineHeight: 1.5,
      overflowY: 'hidden', wordBreak: 'break-word', whiteSpace: 'pre-wrap',
      minHeight: '22px', height: 'auto', display: 'block',
    },
    iconBtn: {
      background: 'rgba(255,0,255,0.12)', border: `1px solid ${dark ? 'rgba(255,0,255,0.4)' : 'rgba(255,0,255,0.2)'}`,
      color: '#ff0000', cursor: 'pointer', fontSize: '9px', padding: '3px 7px',
      fontWeight: 900, transition: 'all 0.15s',
    },
    aiBtnSmall: {
      background: 'rgba(255,255,0,0.12)', border: `1px solid ${dark ? 'rgba(255,255,0,0.4)' : 'rgba(255,255,0,0.2)'}`, color: '#FFFF00',
      cursor: 'pointer', fontSize: '10px', padding: '3px 7px',
      transition: 'all 0.15s', fontWeight: 900,
    },
  }
}