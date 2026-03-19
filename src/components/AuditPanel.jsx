import { useState } from 'react'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

const STATUS_CONFIG = {
  NotStarted: { label: '未開始', color: '#a8b4c9' },
  InProgress:  { label: '進行中', color: '#3b9ede' },
  Completed:   { label: '已完成', color: '#4caf7d' },
  Overdue:     { label: '已逾期', color: '#e05252' },
}

function calcProgress(measures) {
  if (!measures.length) return 0
  return Math.round(measures.reduce((s, m) => s + (m.progress || 0), 0) / measures.length)
}

function progressColor(pct) {
  if (pct === 0)  return '#94a3b8'
  if (pct < 30)   return '#ef4444'
  if (pct < 60)   return '#f59e0b'
  if (pct < 100)  return '#3b82f6'
  return '#22c55e'
}

function statusCounts(measures) {
  const counts = { NotStarted: 0, InProgress: 0, Completed: 0, Overdue: 0 }
  measures.forEach(m => { counts[m.status] = (counts[m.status] || 0) + 1 })
  return counts
}

function calcTodos(goals) {
  const all = goals.flatMap(g => g.strategies.flatMap(s => s.todos || []))
  const done = all.filter(t => t.done).length
  return { total: all.length, done, pct: all.length ? Math.round((done / all.length) * 100) : 0 }
}

function ProgressBar({ value, color = '#f0a500', height = 6, trackColor = '#3a4357' }) {
  return (
    <div style={{ background: trackColor, borderRadius: 99, overflow: 'hidden', height }}>
      <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
    </div>
  )
}

function StatusDots({ counts, total }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {Object.entries(STATUS_CONFIG).map(([k, v]) => counts[k] > 0 && (
        <span key={k} style={{ fontSize: '10px', fontFamily: '"DM Mono", monospace', color: v.color, display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: v.color, display: 'inline-block' }} />
          {v.label} {counts[k]}
        </span>
      ))}
    </div>
  )
}

export default function AuditPanel({ project, onClose, darkMode = true }) {
  const [expandedGoals, setExpandedGoals] = useState(new Set())
  const [pdfLoading, setPdfLoading] = useState(false)
  
  if (!project) return null

  const toggleGoal = (index) => {
    setExpandedGoals(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const allMeasures   = project.goals.flatMap(g => g.strategies.flatMap(s => s.measures))
  const overall       = calcProgress(allMeasures)
  const totalCounts   = statusCounts(allMeasures)
  const completedPct  = allMeasures.length
    ? Math.round((totalCounts.Completed / allMeasures.length) * 100)
    : 0

  const overallColor = progressColor(overall)
  const todoStats    = calcTodos(project.goals)
  const s = buildAuditStyles(darkMode)
  const track = darkMode ? '#3a4357' : '#d9e4f2'

  const generatePDF = async () => {
    setPdfLoading(true)
    try {
      const container = document.createElement('div')
      container.style.cssText = `
        position: fixed; left: -9999px; top: 0;
        width: 794px; background: #ffffff;
        font-family: "Noto Sans TC", "Microsoft JhengHei", sans-serif;
        color: #1a1a2e; font-size: 13px; line-height: 1.6;
      `
    document.body.appendChild(container)

    const statusLabel = { NotStarted: '未開始', InProgress: '進行中', Completed: '已完成', Overdue: '已逾期' }
    const statusColor = { NotStarted: '#6b7280', InProgress: '#3b82f6', Completed: '#16a34a', Overdue: '#dc2626' }

    const renderPage = (html) => {
      return `<div style="width:794px;min-height:1123px;padding:48px;box-sizing:border-box;background:#fff;">${html}</div>`
    }

    const sectionTitle = (text) =>
      `<div style="font-size:11px;letter-spacing:1px;color:#9ca3af;text-transform:uppercase;font-weight:700;margin-bottom:6px;">${text}</div>`

    const divider = () => `<div style="border-top:1px solid #e5e7eb;margin:16px 0;"></div>`

    const progressBar = (val, color) => `
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;">
          <div style="width:${val}%;height:100%;background:${color};border-radius:4px;"></div>
        </div>
        <span style="font-size:12px;font-weight:700;color:${color};min-width:36px;">${val}%</span>
      </div>`

    // ── Page 1: Summary ──
    const summaryHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
        <div>
          <div style="font-size:11px;color:#9ca3af;letter-spacing:1px;font-weight:600;margin-bottom:4px;">OGSM AUDIT REPORT</div>
          <div style="font-size:26px;font-weight:800;color:#111827;line-height:1.2;">${project.title}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:56px;font-weight:800;color:${overallColor};line-height:1;">${overall}</div>
          <div style="font-size:14px;color:${overallColor};font-weight:600;">% 整體完成</div>
        </div>
      </div>
      ${divider()}
      <div style="margin-bottom:16px;">
        <div style="height:12px;background:#e5e7eb;border-radius:6px;overflow:hidden;">
          <div style="width:${overall}%;height:100%;background:${overallColor};border-radius:6px;"></div>
        </div>
      </div>
      
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
        ${[
          ['總指標', allMeasures.length, '#374151'],
          ['已完成', totalCounts.Completed, '#16a34a'],
          ['進行中', totalCounts.InProgress, '#3b82f6'],
          ['已逾期', totalCounts.Overdue, '#dc2626'],
        ].map(([label, val, color]) => `
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:${color};">${val}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;">${label}</div>
          </div>`).join('')}
      </div>
      
      ${sectionTitle('O — Objective')}
      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin-bottom:16px;font-size:13px;color:#374151;line-height:1.7;">
        ${project.objective || '（未填寫）'}
      </div>

      ${todoStats.total > 0 ? `
      ${sectionTitle('☑ 待辦事項完成率')}
      <div style="background:#fdf2f8;border:1px solid #f9a8d4;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="flex:1;height:10px;background:#fce7f3;border-radius:5px;overflow:hidden;">
            <div style="width:${todoStats.pct}%;height:100%;background:#f472b6;border-radius:5px;"></div>
          </div>
          <span style="font-size:16px;font-weight:800;color:#f472b6;min-width:44px;">${todoStats.pct}%</span>
        </div>
        <div style="font-size:11px;color:#6b7280;">已完成 ${todoStats.done} / ${todoStats.total} 項待辦</div>
      </div>` : ''}

      ${sectionTitle('Goals 總覽')}
      ${project.goals.map((goal, gi) => {
        const gm = goal.strategies.flatMap(s => s.measures)
        const gp = calcProgress(gm)
        const gc = statusCounts(gm)
        const gc2 = progressColor(gp)
        return `
          <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:10px;">
            <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
              <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700;color:#d97706;flex-shrink:0;">G${gi+1}</div>
              <div style="font-size:13px;font-weight:600;color:#111827;flex:1;">${goal.text || '（未命名）'}</div>
            </div>
            ${progressBar(gp, gc2)}
            <div style="display:flex;gap:12px;margin-top:8px;font-size:11px;">
              <span style="color:#16a34a;">✓ 已完成 ${gc.Completed}</span>
              <span style="color:#3b82f6;">▶ 進行中 ${gc.InProgress}</span>
              <span style="color:#6b7280;">○ 未開始 ${gc.NotStarted}</span>
              ${gc.Overdue > 0 ? `<span style="color:#dc2626;">⚠ 逾期 ${gc.Overdue}</span>` : ''}
            </div>
          </div>`
      }).join('')}
    `
    container.innerHTML = renderPage(summaryHTML)
    await new Promise(r => setTimeout(r, 100))

    const loadImageAsDataURL = async (url) => {
      const res = await fetch(url)
      const blob = await res.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    }
    const [frontCoverData, backCoverData] = await Promise.all([
      loadImageAsDataURL('/Front Cover.jpg'),
      loadImageAsDataURL('/Back Cover.jpg'),
    ])

    const doc = new jsPDF({ unit: 'px', format: 'a4', hotfixes: ['px_scaling'] })
    const pdfW = doc.internal.pageSize.getWidth()
    const pdfH = doc.internal.pageSize.getHeight()

    const captureAndAdd = async () => {
      const canvas = await html2canvas(container.firstChild, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false
      })
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      doc.addPage()
      doc.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH)
    }

    // Front cover with text overlay
    container.innerHTML = `<div style="width:794px;height:1123px;position:relative;overflow:hidden;font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif;"><img src="${frontCoverData}" style="width:794px;height:1123px;position:absolute;top:0;left:0;display:block;" /><div style="position:absolute;top:32%;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:20px;padding:0 60px;text-align:center;"><div style="font-size:48px;font-weight:900;color:#111111;letter-spacing:3px;">亞家科技股份有限公司</div><div style="font-size:30px;font-weight:700;color:#e07800;letter-spacing:1px;">${(project.title.endsWith('計畫') || project.title.endsWith('計劃')) ? project.title : project.title + '計畫'}</div><div style="font-size:22px;font-weight:600;color:#555555;letter-spacing:2px;">OGSM審計報告</div></div></div>`
    await new Promise(r => setTimeout(r, 100))
    {
      const frontCanvas = await html2canvas(container.firstChild, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false
      })
      doc.addImage(frontCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfW, pdfH)
    }

    // Summary page
    container.innerHTML = renderPage(summaryHTML)
    await new Promise(r => setTimeout(r, 100))
    await captureAndAdd()

    // ── Pages: Goals Detail ──
    for (let gi = 0; gi < project.goals.length; gi++) {
      const goal = project.goals[gi]
      const gm = goal.strategies.flatMap(s => s.measures)
      const gp = calcProgress(gm)
      const gc2 = progressColor(gp)

      const goalHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
          <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:4px 12px;font-size:13px;font-weight:800;color:#d97706;">G${gi+1}</div>
          <div style="font-size:20px;font-weight:800;color:#111827;flex:1;">${goal.text || '（未命名）'}</div>
          <div style="font-size:18px;font-weight:800;color:${gc2};">${gp}%</div>
        </div>
        <div style="margin-bottom:20px;">${progressBar(gp, gc2)}</div>
        
        ${goal.strategies.map((st, si) => {
          const sp = calcProgress(st.measures)
          const sc2 = progressColor(sp)
          return `
            <div style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
              <div style="background:#f9fafb;padding:12px 16px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:8px;">
                <span style="font-size:11px;font-weight:700;color:#6b7280;">S${gi+1}.${si+1}</span>
                <span style="font-size:13px;font-weight:600;color:#111827;flex:1;">${st.text || '（未命名）'}</span>
                <span style="font-size:12px;font-weight:700;color:${sc2};">${sp}%</span>
              </div>
              ${st.measures.length > 0 ? `
              <table style="width:100%;border-collapse:collapse;font-size:11px;">
                <thead>
                  <tr style="background:#f3f4f6;">
                    <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;width:35%;">KPI</th>
                    <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;width:15%;">目標值</th>
                    <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;width:15%;">實際值</th>
                    <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;width:15%;">狀態</th>
                    <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;width:20%;">進度</th>
                  </tr>
                </thead>
                <tbody>
                  ${st.measures.map((m, mi) => `
                    <tr style="border-bottom:1px solid #f3f4f6;background:${mi % 2 === 1 ? '#fafafa' : '#fff'};">
                      <td style="padding:8px 12px;color:#374151;">${m.kpi || '—'}</td>
                      <td style="padding:8px 12px;color:#374151;">${m.target || '—'}</td>
                      <td style="padding:8px 12px;color:#374151;">${m.actual || '—'}</td>
                      <td style="padding:8px 12px;text-align:center;">
                        <span style="background:${statusColor[m.status] || '#6b7280'}22;color:${statusColor[m.status] || '#6b7280'};border-radius:4px;padding:2px 6px;font-size:10px;font-weight:600;">
                          ${statusLabel[m.status] || m.status}
                        </span>
                      </td>
                      <td style="padding:8px 12px;">
                        <div style="display:flex;align-items:center;gap:6px;">
                          <div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
                            <div style="width:${m.progress||0}%;height:100%;background:${progressColor(m.progress||0)};border-radius:3px;"></div>
                          </div>
                          <span style="color:#374151;font-weight:600;min-width:28px;font-size:10px;">${m.progress||0}%</span>
                        </div>
                      </td>
                    </tr>`).join('')}
                </tbody>
              </table>` : `<div style="padding:12px 16px;color:#9ca3af;font-size:12px;">（無 Measures）</div>`}
              ${(st.todos || []).length > 0 ? `
              <div style="padding:10px 16px 12px;border-top:1px solid #e5e7eb;background:#fafafa;">
                <div style="font-size:10px;font-weight:700;color:#d97706;letter-spacing:0.8px;margin-bottom:6px;">☑ 待辦事項 ${(st.todos || []).filter(t => t.done).length}/${(st.todos || []).length}</div>
                ${(st.todos || []).map(t => `
                  <div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:4px;">
                    <span style="font-size:10px;color:${t.done ? '#16a34a' : '#9ca3af'};flex-shrink:0;margin-top:1px;font-weight:700;">${t.done ? '✓' : '○'}</span>
                    <span style="font-size:11px;color:${t.done ? '#6b7280' : '#374151'};text-decoration:${t.done ? 'line-through' : 'none'};line-height:1.5;">${t.text}</span>
                  </div>`).join('')}
              </div>` : ''}
            </div>`
        }).join('')}
      `
      container.innerHTML = renderPage(goalHTML)
      await new Promise(r => setTimeout(r, 100))
      await captureAndAdd()
    }

    // Back cover
    doc.addPage()
    doc.addImage(backCoverData, 'JPEG', 0, 0, pdfW, pdfH)

    document.body.removeChild(container)
    doc.save(`OGSM審計報告 - ${(project.title.endsWith('計畫') || project.title.endsWith('計劃')) ? project.title : project.title + '計畫'}.pdf`)
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .audit-pdf-btn:hover:not(:disabled) {
          background: rgba(240,165,0,0.22) !important;
          border-color: rgba(240,165,0,0.7) !important;
          box-shadow: 0 0 10px rgba(240,165,0,0.3);
          transform: translateY(-1px);
        }
        .audit-close-btn:hover {
          color: #e05252 !important;
          background: rgba(239,68,68,0.1) !important;
          border-radius: 4px;
        }
      `}</style>
      {/* Backdrop */}
      <div style={s.backdrop} onClick={onClose} />

      {/* Panel */}
      <div style={s.panel}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={s.headerTag}>📊 審計報告</div>
            <div style={s.headerTitle}>{project.title}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="audit-pdf-btn" style={{ ...s.pdfBtn, opacity: pdfLoading ? 0.6 : 1 }} onClick={generatePDF} disabled={pdfLoading} title="導出 PDF 報告">
              {pdfLoading ? '生成中…' : '📄 導出 PDF'}
            </button>
            <button className="audit-close-btn" style={s.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={s.body}>

          {/* ── 整體完成度 ── */}
          <div style={s.card}>
            <div style={s.cardTitle}>整體計畫完成度</div>
            <div style={s.bigPct} data-color={overallColor}>
              <span style={{ color: overallColor, fontSize: '48px', fontFamily: '"Syne", sans-serif', fontWeight: 800, lineHeight: 1 }}>{overall}</span>
              <span style={{ color: overallColor, fontSize: '20px', fontWeight: 700, alignSelf: 'flex-end', marginBottom: '6px' }}>%</span>
            </div>
            <ProgressBar value={overall} color={overallColor} height={8} trackColor={track} />
            <div style={{ marginTop: '12px' }}>
              <StatusDots counts={totalCounts} total={allMeasures.length} />
            </div>
            <div style={s.statsRow}>
              <div style={s.statBox}>
                <div style={s.statNum}>{allMeasures.length}</div>
                <div style={s.statLabel}>KPI 總數</div>
              </div>
              <div style={s.statBox}>
                <div style={{ ...s.statNum, color: '#4caf7d' }}>{totalCounts.Completed}</div>
                <div style={s.statLabel}>已完成</div>
              </div>
              <div style={s.statBox}>
                <div style={{ ...s.statNum, color: '#3b9ede' }}>{totalCounts.InProgress}</div>
                <div style={s.statLabel}>進行中</div>
              </div>
              <div style={s.statBox}>
                <div style={{ ...s.statNum, color: '#e05252' }}>{totalCounts.Overdue}</div>
                <div style={s.statLabel}>已逾期</div>
              </div>
            </div>
          </div>

          {/* ── Objective ── */}
          <div style={s.objectiveBox}>
            <span style={s.oTag}>Objective</span>
            <span style={s.oText}>{project.objective}</span>
          </div>

          {/* ── Todo 完成率 ── */}
          {todoStats.total > 0 && (
            <div style={{ ...s.card, padding: '16px 20px' }}>
              <div style={s.cardTitle}>☑ 待辦事項完成率</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <ProgressBar value={todoStats.pct} color='#f472b6' height={7} trackColor={track} />
                </div>
                <span style={{ fontSize: '14px', fontFamily: '"DM Mono", monospace', fontWeight: 700, color: '#f472b6', minWidth: '48px' }}>
                  {todoStats.pct}%
                </span>
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', fontFamily: '"DM Mono", monospace', color: '#8a95ae' }}>
                已完成 {todoStats.done} / {todoStats.total} 項待辦
              </div>
            </div>
          )}

          {/* ── 逐 Goal 分析 ── */}
          {project.goals.map((goal, gi) => {
            const goalMeasures = goal.strategies.flatMap(s => s.measures)
            const goalProgress = calcProgress(goalMeasures)
            const goalCounts   = statusCounts(goalMeasures)
            const goalColor    = progressColor(goalProgress)

            const isExpanded = expandedGoals.has(gi)
            
            return (
              <div key={goal.id ?? gi} style={s.goalCard}>
                {/* Goal header */}
                <div style={s.goalHeader} onClick={() => toggleGoal(gi)} data-role="goal-header">
                  <div style={s.goalBadge}>G{gi + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={s.goalText}>{goal.text || '(未命名)'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <div style={{ flex: 1 }}>
                        <ProgressBar value={goalProgress} color={goalColor} height={5} trackColor={track} />
                      </div>
                      <span style={{ fontSize: '12px', fontFamily: '"DM Mono", monospace', color: goalColor, minWidth: '34px' }}>
                        {goalProgress}%
                      </span>
                    </div>
                    <div style={{ marginTop: '5px' }}>
                      <StatusDots counts={goalCounts} />
                    </div>
                  </div>
                  <div 
                    style={s.expandBtn}
                    title={isExpanded ? '收起' : '展開'}
                  >
                    {isExpanded ? '▲' : '▼'}
                  </div>
                </div>

                {/* Strategies */}
                {isExpanded && goal.strategies.map((st, si) => {
                  const stProgress = calcProgress(st.measures)
                  const stColor    = stProgress >= 80 ? '#4caf7d' : stProgress >= 40 ? '#f0a500' : '#e05252'

                  return (
                    <div key={st.id ?? si} style={s.stratCard}>
                      <div style={s.stratHeader}>
                        <span style={s.stratBadge}>S{si + 1}</span>
                        <span style={s.stratText}>{st.text || '(未命名)'}</span>
                        <span style={{ fontSize: '11px', fontFamily: '"DM Mono", monospace', color: stColor, flexShrink: 0 }}>
                          {stProgress}%
                        </span>
                      </div>

                      {/* Measures table */}
                      {st.measures.length > 0 && (
                        <div style={s.measureTable}>
                          <div style={s.mTableHeader}>
                            <span style={{ ...s.mCol, flex: 2 }}>KPI</span>
                            <span style={{ ...s.mCol, flex: 1 }}>目標</span>
                            <span style={{ ...s.mCol, flex: 1 }}>實際</span>
                            <span style={{ ...s.mCol, width: '70px' }}>狀態</span>
                            <span style={{ ...s.mCol, width: '80px' }}>進度</span>
                          </div>
                          {st.measures.map((m, mi) => {
                            const sc = STATUS_CONFIG[m.status] || STATUS_CONFIG.NotStarted
                            return (
                              <div key={m.id ?? mi} style={s.mRow}>
                                <span style={{ ...s.mCell, flex: 2 }}>{m.kpi || '—'}</span>
                                <span style={{ ...s.mCell, flex: 1, color: '#f0a500', fontFamily: '"DM Mono", monospace' }}>{m.target || '—'}</span>
                                <span style={{ ...s.mCell, flex: 1, color: '#4caf7d', fontFamily: '"DM Mono", monospace' }}>{m.actual || '—'}</span>
                                <span style={{ ...s.mCell, width: '70px' }}>
                                  <span style={{ color: sc.color, fontSize: '10px' }}>● {sc.label}</span>
                                </span>
                                <span style={{ ...s.mCell, width: '80px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ flex: 1 }}>
                                      <ProgressBar value={m.progress || 0} color={sc.color} height={4} trackColor={track} />
                                    </div>
                                    <span style={{ fontSize: '10px', fontFamily: '"DM Mono", monospace', color: sc.color, minWidth: '26px' }}>
                                      {m.progress || 0}%
                                    </span>
                                  </div>
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {/* Todo items */}
                      {(st.todos || []).length > 0 && (
                        <div style={{ marginTop: '8px', padding: '8px 10px', background: 'rgba(240,165,0,0.03)', borderRadius: '4px', border: `1px dashed ${darkMode ? '#2a3347' : '#c8d4e8'}` }}>
                          <div style={{ fontSize: '9px', fontFamily: '"DM Mono", monospace', color: '#f0a500', letterSpacing: '0.8px', marginBottom: '6px' }}>
                            ☑ 待辦事項 {(st.todos || []).filter(t => t.done).length}/{(st.todos || []).length}
                          </div>
                          {(st.todos || []).map((t, ti) => (
                            <div key={t.id ?? ti} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '3px'}}>
                              <span style={{ fontSize: '10px', color: t.done ? '#4caf7d' : (darkMode ? '#334060' : '#6a7e98'), flexShrink: 0, marginTop: '1px' }}>{t.done ? '✓' : '○'}</span>
                              <span style={{ fontSize: '11px', color: t.done ? (darkMode ? '#8395b4' : '#9aabbd') : (darkMode ? '#b0bac9' : '#445069'), textDecoration: t.done ? 'line-through' : 'none', lineHeight: 1.4 }}>{t.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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

function buildAuditStyles(dark) {
  return {
    backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 400 },
    panel: {
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: '520px', maxWidth: '92vw',
      background: dark ? '#161b27' : '#ffffff',
      borderLeft: `1px solid ${dark ? '#2a3347' : '#d1d9e8'}`,
      display: 'flex', flexDirection: 'column',
      zIndex: 401,
      animation: 'slideInRight 0.25s ease',
      boxShadow: dark ? '-20px 0 60px rgba(0,0,0,0.4)' : '-20px 0 60px rgba(60,80,120,0.15)',
    },

    header: {
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      padding: '24px 24px 16px', borderBottom: `1px solid ${dark ? '#2a3347' : '#d1d9e8'}`, flexShrink: 0,
    },
    headerTag: { fontSize: '11px', fontFamily: '"DM Mono", monospace', color: '#d4a855', letterSpacing: '0.8px', marginBottom: '4px', fontWeight: 600 },
    headerTitle: { fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: '18px', color: dark ? '#e8ecf4' : '#1a2133' },
    closeBtn: { background: 'none', border: 'none', color: dark ? '#8a95ae' : '#6a7e98', cursor: 'pointer', fontSize: '16px', padding: '4px', lineHeight: 1, transition: 'color 0.2s' },
    pdfBtn: {
      background: 'rgba(240,165,0,0.1)',
      border: '1px solid rgba(240,165,0,0.3)',
      color: '#f0a500',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: 600,
      padding: '6px 12px',
      borderRadius: '6px',
      transition: 'all 0.2s',
      fontFamily: '"Noto Sans TC", sans-serif',
      whiteSpace: 'nowrap',
    },

    body: { flex: 1, overflowY: 'scroll', padding: '20px 24px 40px', display: 'flex', flexDirection: 'column', gap: '18px' },

    card: { background: dark ? '#1e2535' : '#f3f7fd', border: `1px solid ${dark ? '#2a3347' : '#d1d9e8'}`, borderRadius: '10px', padding: '20px' },
    cardTitle: { fontSize: '11px', fontFamily: '"DM Mono", monospace', color: '#d4a855', letterSpacing: '0.8px', marginBottom: '12px', textTransform: 'uppercase', fontWeight: 600 },
    bigPct: { display: 'flex', alignItems: 'flex-end', gap: '2px', marginBottom: '10px' },

    statsRow: { display: 'flex', gap: '8px', marginTop: '14px' },
    statBox: { flex: 1, background: dark ? '#161b27' : '#e8f0fa', borderRadius: '6px', padding: '10px 8px', textAlign: 'center' },
    statNum: { fontSize: '22px', fontFamily: '"Syne", sans-serif', fontWeight: 800, color: dark ? '#e8ecf4' : '#1a2133', lineHeight: 1 },
    statLabel: { fontSize: '10px', fontFamily: '"DM Mono", monospace', color: dark ? '#8a95ae' : '#7a8ca8', marginTop: '4px', letterSpacing: '0.5px' },

    objectiveBox: {
      display: 'flex', gap: '10px', alignItems: 'flex-start',
      background: 'rgba(240,165,0,0.05)', border: '1px solid rgba(240,165,0,0.2)',
      borderRadius: '8px', padding: '18px 16px',
    },
    oTag: { fontFamily: '"Syne", sans-serif', fontWeight: 650, color: '#f0a500', fontSize: '14px', flexShrink: 0, marginTop: '1px' },
    oText: { fontSize: '13px', color: dark ? '#e8ecf4' : '#1a2133', lineHeight: 1.7, wordBreak: 'break-word', flex: 1, whiteSpace: 'normal' },

    goalCard: { background: dark ? '#1e2535' : '#f3f7fd', border: `1px solid ${dark ? '#2a3347' : '#d1d9e8'}`, borderRadius: '8px', overflow: 'visible' },
    goalHeader: { display: 'flex', gap: '12px', padding: '18px', borderBottom: `1px solid ${dark ? '#2a3347' : '#d1d9e8'}`, alignItems: 'flex-start', cursor: 'pointer', transition: 'background 0.15s' },
    goalBadge: {
      width: '28px', height: '28px', background: 'rgba(240,165,0,0.15)',
      border: '1px solid rgba(240,165,0,0.3)', borderRadius: '4px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '10px', fontFamily: '"DM Mono", monospace', color: '#f0a500',
      flexShrink: 0,
    },
    goalText: { fontSize: '13px', fontWeight: 600, color: dark ? '#e8ecf4' : '#1a2133', lineHeight: 1.7, wordBreak: 'break-word', whiteSpace: 'normal' },

    stratCard: { padding: '16px 18px', borderBottom: `1px solid ${dark ? '#1a2133' : '#e4ecf7'}` },
    stratHeader: { display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' },
    stratBadge: { fontSize: '10px', fontFamily: '"DM Mono", monospace', color: dark ? '#b0bac9' : '#7a8ca8', flexShrink: 0, marginTop: '2px', fontWeight: 500 },
    stratText: { fontSize: '12px', color: dark ? '#d4dce8' : '#445069', flex: 1, lineHeight: 1.7, wordBreak: 'break-word', whiteSpace: 'normal' },

    measureTable: { marginTop: '10px' },
    mTableHeader: {
      display: 'flex', gap: '0', padding: '6px 8px',
      background: dark ? '#161b27' : '#e8f0fa', borderRadius: '4px 4px 0 0',
    },
    mCol: { fontSize: '9px', fontFamily: '"DM Mono", monospace', color: dark ? '#8a95ae' : '#7a8ca8', letterSpacing: '0.5px', textTransform: 'uppercase', padding: '0 4px', fontWeight: 600 },
    mRow: {
      display: 'flex', padding: '8px', alignItems: 'flex-start',
      borderTop: `1px solid ${dark ? '#1e2535' : '#edf2fa'}`, minHeight: '36px',
    },
    mCell: { fontSize: '11px', color: dark ? '#b0bac9' : '#445069', padding: '4px', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'normal' },

    expandBtn: {
      background: dark ? 'rgba(138,149,174,0.08)' : 'rgba(0,0,0,0.05)',
      border: `1px solid ${dark ? 'rgba(138,149,174,0.15)' : 'rgba(0,0,0,0.1)'}`,
      borderRadius: '4px',
      width: '28px',
      height: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: dark ? '#8a95ae' : '#6a7e98',
      fontSize: '10px',
      flexShrink: 0,
      pointerEvents: 'none',
    },
  }
}