import { useState, useEffect, useCallback, useMemo } from 'react'
import TodoList from './TodoList.jsx'

const emptyMeasure  = () => ({ id: null, kpi: '', target: '', actual: '', progress: 0, status: 'NotStarted', sortOrder: 0 })
const emptyStrategy = () => ({ id: null, text: '', sortOrder: 0, measures: [emptyMeasure()], todos: [] })
const emptyGoal     = () => ({ id: null, text: '', sortOrder: 0, strategies: [emptyStrategy()] })

const STATUS_CONFIG = {
  NotStarted: { label: '未開始', color: '#a8b4c9', bg: 'rgba(168,180,201,0.12)', border: '#a8b4c9' },
  InProgress:  { label: '進行中', color: '#3b9ede', bg: 'rgba(59,158,222,0.12)', border: '#3b9ede' },
  Completed:   { label: '已完成', color: '#4caf7d', bg: 'rgba(76,175,125,0.12)', border: '#4caf7d' },
  Overdue:     { label: '已逾期', color: '#e05252', bg: 'rgba(224,82,82,0.12)',  border: '#e05252' },
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
  const s = useMemo(() => buildStyles(darkMode), [darkMode])

  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(project)))
    setDirty(false)
  }, [project])

  const update = useCallback((updater) => {
    setDraft(d => updater(JSON.parse(JSON.stringify(d))))
    setDirty(true)
  }, [])

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
  const setMField       = (gi,si,mi,f,v)=> update(d => { d.goals[gi].strategies[si].measures[mi][f] = v; return d })
  const addMeasure      = (gi,si)       => update(d => { d.goals[gi].strategies[si].measures.push(emptyMeasure()); return d })
  const removeMeasure   = (gi,si,mi)    => update(d => { d.goals[gi].strategies[si].measures.splice(mi,1); return d })
  const setTodos        = (gi,si,todos) => update(d => { d.goals[gi].strategies[si].todos = todos; return d })

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
        .ogsm-actual-input::placeholder {
          color: ${darkMode ? 'rgba(205, 199, 199, 0.45)' : 'rgba(133, 129, 129, 0.45)'};
        }
      `}</style>

      {/* ── Top bar ── */}
      <div style={s.topBar}>
        <div style={s.topLeft}>
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
        <div style={s.sectionTag}>O — Objective</div>
        <textarea style={s.objectiveArea} value={draft.objective} onChange={e => setField('objective', e.target.value)} placeholder="輸入核心目標…" rows={2} />
      </div>

      {/* ── Table ── */}
      <div style={s.tableScroll}>
        <div style={s.tableWrap}>

          {/* Header */}
          <div style={s.tableHeader}>
            {[
              { label: 'G — Goals',     w: COL_G   },
              { label: 'S — Strategies',w: COL_S   },
              { label: 'KPI',           w: COL_KPI },
              { label: '目標值',         w: COL_VAL },
              { label: '實際值',         w: COL_VAL },
              { label: '狀態',           w: COL_STATUS },
              { label: '進度',           w: COL_PROG },
            ].map((col, i) => (
              <div key={i} style={{ ...s.colHead, width: col.w, ...(i >= 6 ? { borderRight: 'none' } : {}) }}>
                {col.label}
              </div>
            ))}
          </div>

          {draft.goals.length === 0 && (
            <div style={s.emptyTable}>尚無 Goals，點擊下方「+ 新增 Goal」</div>
          )}

          {draft.goals.map((goal, gi) => (
            <div key={goal.id ?? `g-${gi}`} style={{ ...s.goalSection, ...(gi % 2 === 1 ? s.goalSectionAlt : {}) }}>
              <div style={s.goalRow}>

                {/* Goal */}
                <div style={{ ...s.goalCell, width: COL_G }}>
                  <div style={s.goalIndex}>G{gi + 1}</div>
                  <textarea style={{ ...s.cellText, ...s.goalText }} value={goal.text} onChange={e => setGoalText(gi, e.target.value)} placeholder="Goal 描述…" rows={3} />
                  {editMode && <button className="ogsm-remove-btn" style={s.removeBtn} onClick={() => removeGoal(gi)}>✕</button>}
                </div>

                {/* Strategies */}
                <div style={s.strategiesWrap}>
                  {goal.strategies.map((st, si) => (
                    <div key={st.id ?? `s-${si}`} style={s.strategyBlock}>
                      <div style={s.strategyRow}>

                        {/* Strategy */}
                        <div style={{ ...s.stratCell, width: COL_S }}>
                          <div style={s.stratIndex}>S{si + 1}</div>
                          <textarea style={s.cellText} value={st.text} onChange={e => setStratText(gi, si, e.target.value)} placeholder="Strategy 描述…" rows={2} />
                          {editMode && <button className="ogsm-remove-btn" style={s.removeBtn} onClick={() => removeStrategy(gi, si)}>✕</button>}
                        </div>

                        {/* Measures */}
                        <div style={s.measuresCol}>
                          {st.measures.map((m, mi) => {
                            const sc = STATUS_CONFIG[m.status] || STATUS_CONFIG.NotStarted
                            return (
                              <div key={m.id ?? `m-${mi}`} style={s.measureRow} data-measure-row="1">
                                <div style={{ ...s.measureCell, width: COL_KPI, alignItems: 'flex-start', display: 'flex', gap: '6px' }}>
                                  {editMode && <button className="ogsm-remove-btn" style={{ ...s.iconBtn, flexShrink: 0 }} onClick={() => removeMeasure(gi,si,mi)}>✕</button>}
                                  <textarea style={s.measureText} value={m.kpi} onChange={e => setMField(gi,si,mi,'kpi',e.target.value)} onInput={autoResize} ref={initResize} placeholder="KPI 名稱" rows={1} />
                                </div>
                                <div style={{ ...s.measureCell, width: COL_VAL, alignItems: 'flex-start' }}>
                                  <textarea style={{ ...s.measureText, ...s.targetInput }} value={m.target} onChange={e => setMField(gi,si,mi,'target',e.target.value)} onInput={autoResize} ref={initResize} placeholder="目標" rows={1} />
                                </div>
                                <div style={{ ...s.measureCell, width: COL_VAL, alignItems: 'flex-start' }}>
                                  <textarea className="ogsm-actual-input" style={{ ...s.measureText, ...s.actualInput }} value={m.actual} onChange={e => setMField(gi,si,mi,'actual',e.target.value)} onInput={autoResize} ref={initResize} placeholder="實際" rows={1} />
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

                                {/* 進度：滑桿 + 數字 */}
                                <div style={{ ...s.measureCell, width: COL_PROG, flexDirection: 'column', gap: '3px', alignItems: 'stretch', justifyContent: 'center', borderRight: 'none', padding: '8px 0' }}>
                                  <div style={{ ...s.progressRow, padding: '0 20px 0 10px' }}>
                                    <input
                                      type="range" min="0" max="100" step="5"
                                      value={m.progress}
                                      onChange={e => setMField(gi,si,mi,'progress', Number(e.target.value))}
                                      style={{ ...s.slider, accentColor: progressColor(m.progress) }}
                                    />
                                    <div className="ogsm-progress-wrap" style={s.progressNumWrap}>
                                      <input
                                        type="number" min="0" max="100"
                                        value={m.progress || ''}
                                        onChange={e => setMField(gi,si,mi,'progress', e.target.value === '' ? 0 : Math.min(100, Math.max(0, Number(e.target.value))))}
                                        style={{ ...s.progressNum, color: progressColor(m.progress) }}
                                        placeholder="0"
                                      />
                                      <span style={{ ...s.progressPercent, color: progressColor(m.progress) }}>%</span>
                                    </div>
                                  </div>
                                  {/* 進度條 */}
                                  <div style={{ width: '100%', padding: '0 20px 0 10px' }}>
                                    <div style={s.miniBarTrack}>
                                      <div style={{ ...s.miniBarFill, width: `${m.progress}%`, background: progressColor(m.progress) }} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          {editMode && <button className="ogsm-add-btn" style={s.addMiniBtn} onClick={() => addMeasure(gi, si)}>+ Measure</button>}
                        </div>
                      </div>

                      {/* Todos */}
                      <TodoList
                        todos={st.todos || []}
                        onChange={todos => setTodos(gi, si, todos)}
                        editMode={editMode}
                        darkMode={darkMode}
                      />

                    </div>
                  ))}
                  {editMode && <button className="ogsm-add-btn" style={s.addStratBtn} onClick={() => addStrategy(gi)}>+ 新增 Strategy</button>}
                </div>

              </div>
            </div>
          ))}

          {editMode && (
            <div style={s.addGoalRow}>
              <button className="ogsm-add-btn" style={s.addGoalBtn} onClick={addGoal}>+ 新增 Goal</button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

const COL_G      = 200
const COL_S      = 200
const COL_KPI    = 180
const COL_VAL    = 110
const COL_STATUS = 100
const COL_PROG   = 160
const COL_ACT    = 36

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
      minWidth: COL_G + COL_S + COL_KPI + COL_VAL*2 + COL_STATUS + COL_PROG + COL_ACT,
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
    emptyTable: { padding: '32px', textAlign: 'center', color: T.addBtnColor, fontFamily: '"DM Mono", monospace', fontSize: '12px' },
  }
}