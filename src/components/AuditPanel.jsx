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
  const all = goals.flatMap(g => g.strategies.flatMap(s => s.measures.flatMap(m => m.todos || [])))
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
  const [expandedMeasureTodos, setExpandedMeasureTodos] = useState(new Set())
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pptLoading, setPptLoading] = useState(false)

  if (!project) return null

  const toggleGoal = (index) => {
    setExpandedGoals(prev => {
      if (prev.has(index)) return new Set()
      return new Set([index])
    })
  }

  const toggleMeasureTodo = (key) => {
    setExpandedMeasureTodos(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
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

    // ── Pages: Goals Detail (one page per strategy) ──
    // ── Pages: Goals Detail (flow-based, new page only on overflow) ──
    const PAGE_CONTENT_H = 1027 // 1123px A4 - 48px*2 padding
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;left:-9999px;top:0;width:698px;background:#fff;font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif;font-size:13px;line-height:1.6;'
    document.body.appendChild(probe)
    const measureHTML = async (html) => {
      probe.innerHTML = '<div>' + html + '</div>'
      await new Promise(r => setTimeout(r, 30))
      return probe.firstChild.scrollHeight
    }

    for (let gi = 0; gi < project.goals.length; gi++) {
      const goal = project.goals[gi]
      const gm = goal.strategies.flatMap(s => s.measures)
      const gp = calcProgress(gm)
      const gc2 = progressColor(gp)

      const goalHeaderHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
          <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:4px 12px;font-size:13px;font-weight:800;color:#d97706;">G${gi+1}</div>
          <div style="font-size:20px;font-weight:800;color:#111827;flex:1;">${goal.text || '（未命名）'}</div>
          <div style="font-size:18px;font-weight:800;color:${gc2};">${gp}%</div>
        </div>
        <div style="margin-bottom:20px;">${progressBar(gp, gc2)}</div>
      `

      const goalContinuationHTML = `
        <div style="display:flex;align-items:center;justify-content:flex-end;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e5e7eb;">
          <div style="font-size:12px;font-weight:600;color:#9ca3af;">（續）</div>
        </div>
      `

      let currentPageHTML = goalHeaderHTML
      let currentPageH = await measureHTML(goalHeaderHTML)

      for (let si = 0; si < goal.strategies.length; si++) {
        const st = goal.strategies[si]
        const sp = calcProgress(st.measures)
        const sc2 = progressColor(sp)

        const strategyHTML = `
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
                  <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">MD 定量指標</th>
                  <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;width:13%;">目標值</th>
                  <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;width:13%;">實際值</th>
                  <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;width:70px;">負責人</th>
                  <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;width:80px;">期限</th>
                  <th style="padding:8px 10px;text-align:center;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;width:82px;">狀態</th>
                  <th style="padding:8px 10px;text-align:center;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;width:100px;">進度</th>
                </tr>
              </thead>
              <tbody>
                ${st.measures.map((m, mi) => `
                  <tr style="border-bottom:1px solid #f3f4f6;background:${mi % 2 === 1 ? '#fafafa' : '#fff'};">
                    <td style="padding:8px 10px;color:#374151;">${m.kpi || '—'}</td>
                    <td style="padding:8px 10px;color:#d97706;font-family:monospace;">${m.target || '—'}</td>
                    <td style="padding:8px 10px;color:#16a34a;font-family:monospace;">${m.actual || '—'}</td>
                    <td style="padding:8px 10px;color:#6b7280;font-size:10px;">${m.assignee || '—'}</td>
                    <td style="padding:8px 10px;color:#6b7280;font-family:monospace;font-size:10px;">${m.deadline || '—'}</td>
                    <td style="padding:8px 10px;text-align:center;">
                      <span style="background:${statusColor[m.status] || '#6b7280'}22;color:${statusColor[m.status] || '#6b7280'};border-radius:4px;padding:2px 8px;font-size:10px;font-weight:600;white-space:nowrap;">
                        ${statusLabel[m.status] || m.status}
                      </span>
                    </td>
                    <td style="padding:8px 10px;">
                      <div style="display:flex;align-items:center;gap:6px;">
                        <div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
                          <div style="width:${m.progress||0}%;height:100%;background:${progressColor(m.progress||0)};border-radius:3px;"></div>
                        </div>
                        <span style="color:${progressColor(m.progress||0)};font-weight:600;min-width:28px;font-size:10px;">${m.progress||0}%</span>
                      </div>
                    </td>
                  </tr>
                  ${(m.todos || []).length > 0 ? `
                  <tr style="background:#f8faff;">
                    <td colspan="7" style="padding:6px 10px 10px 20px;border-bottom:1px solid #f3f4f6;border-left:3px solid rgba(59,158,222,0.4);">
                      <div style="font-size:9px;font-weight:700;color:#3b9ede;letter-spacing:0.5px;margin-bottom:5px;">☑ MP 檢核步驟 ${(m.todos || []).filter(t => t.done).length}/${(m.todos || []).length}</div>
                      ${(m.todos || []).map(t => `
                        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
                          <span style="font-size:10px;color:${t.done ? '#16a34a' : '#9ca3af'};flex-shrink:0;font-weight:700;align-self:flex-start;line-height:1.5;">${t.done ? '✓' : '○'}</span>
                          <span style="font-size:10px;flex:1;color:${t.done ? '#9ca3af' : '#374151'};text-decoration:${t.done ? 'line-through' : 'none'};line-height:1.5;word-break:break-word;">${t.text}</span>
                          ${(t.assignee || t.deadline) ? `<div style="display:flex;gap:4px;flex-shrink:0;align-items:center;align-self:center;">${t.assignee ? `<span style="font-size:9px;color:#6b7280;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:3px;padding:1px 5px;white-space:nowrap;">👤 ${t.assignee}</span>` : ''}${t.deadline ? `<span style="font-size:9px;color:#6b7280;font-family:monospace;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:3px;padding:1px 5px;white-space:nowrap;">📅 ${t.deadline}</span>` : ''}</div>` : ''}
                        </div>`).join('')}
                    </td>
                  </tr>` : ''}
                  `).join('')}
              </tbody>
            </table>` : `<div style="padding:12px 16px;color:#9ca3af;font-size:12px;">（無 Measures）</div>`}
            ${(st.todos || []).length > 0 ? `
            <div style="padding:10px 16px 12px;border-top:1px solid #e5e7eb;background:#fafafa;">
              <div style="font-size:10px;font-weight:700;color:#d97706;letter-spacing:0.8px;margin-bottom:6px;">☑ Strategy 待辦事項 ${(st.todos || []).filter(t => t.done).length}/${(st.todos || []).length}</div>
              ${(st.todos || []).map(t => `
                <div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:4px;">
                  <span style="font-size:10px;color:${t.done ? '#16a34a' : '#9ca3af'};flex-shrink:0;margin-top:1px;font-weight:700;">${t.done ? '✓' : '○'}</span>
                  <span style="font-size:11px;color:${t.done ? '#6b7280' : '#374151'};text-decoration:${t.done ? 'line-through' : 'none'};line-height:1.5;">${t.text}</span>
                </div>`).join('')}
            </div>` : ''}
          </div>
        `

        const stratH = await measureHTML(strategyHTML)
        if (currentPageH + stratH > PAGE_CONTENT_H) {
          container.innerHTML = renderPage(currentPageHTML)
          await new Promise(r => setTimeout(r, 100))
          await captureAndAdd()
          currentPageHTML = goalContinuationHTML
          currentPageH = await measureHTML(goalContinuationHTML)
        }
        currentPageHTML += strategyHTML
        currentPageH += stratH
      }
      // Flush last page of this goal
      container.innerHTML = renderPage(currentPageHTML)
      await new Promise(r => setTimeout(r, 100))
      await captureAndAdd()
    }
    document.body.removeChild(probe)

    // Back cover
    doc.addPage()
    doc.addImage(backCoverData, 'JPEG', 0, 0, pdfW, pdfH)

    document.body.removeChild(container)
    doc.save(`OGSM審計報告 - ${(project.title.endsWith('計畫') || project.title.endsWith('計劃')) ? project.title : project.title + '計畫'}.pdf`)
    } finally {
      setPdfLoading(false)
    }
  }

  const generatePPT = async () => {
    setPptLoading(true)
    try {
      // Dynamically load PptxGenJS from CDN
      await new Promise((resolve, reject) => {
        if (window.PptxGenJS) return resolve()
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })

      const pres = new window.PptxGenJS()
      pres.layout = 'LAYOUT_WIDE' // 13.3" × 7.5"
      pres.title = project.title + ' OGSM'

      // ── Colours ──────────────────────────────────────────────────────────────
      const HDR_BG  = 'F5DEB3'   // wheat – header row fill (matches screenshot)
      const HDR_BD  = '8B6914'   // dark gold – header border
      const OBJ_BG  = 'FEFDF5'   // near-white with warm tint – objective body
      const CELL_WH = 'FFFFFF'   // white body cell
      const CELL_AL = 'FAFAFA'   // very light grey alt row
      const CELL_MD = 'FFFEF8'   // warm tint for MD col alt row
      const CELL_MP = 'F5FFF8'   // cool tint for MP col alt row
      const BD      = '999999'   // normal border
      const TXT     = '1A1A2E'   // body text
      const MUT     = '555566'   // muted / label text
      const TODO_OK = '888888'   // done todo
      const TODO_ND = '2C3E6B'   // open todo

      // fresh border helper (avoids PptxGenJS in-place mutation)
      const b  = (c = BD, pt = 0.75) => ({ pt, color: c })
      const bH = (pt = 1.2)          => ({ pt, color: HDR_BD })

      // ── Load cover images ────────────────────────────────────────────────────
      const loadCoverImage = async (url) => {
        const res = await fetch(url)
        const blob = await res.blob()
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target.result)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
      }
      const [pptFrontData, pptBackData] = await Promise.all([
        loadCoverImage('/PPT Front Cover.png'),
        loadCoverImage('/PPT Back Cover.png'),
      ])

      // ── Front cover slide ────────────────────────────────────────────────────
      const frontSlide = pres.addSlide()
      frontSlide.addImage({ data: pptFrontData, x: 0, y: 0, w: 13.3, h: 7.5 })
      frontSlide.addText('亞家科技股份有限公司', {
        x: 2.3, y: 2.8, w: 8.6, h: 0.9,
        fontSize: 45, fontFace: 'DFKai-SB', color: '1A1A2E',
        bold: true, align: 'left', valign: 'middle',
      })
      frontSlide.addText(`${project.title}`, {
        x: 2.4, y: 3.7, w: 7.5, h: 0.65,
        fontSize: 24, fontFace: 'DFKai-SB', color: 'E70012',
        bold: true, align: 'left', valign: 'middle',
      })
      frontSlide.addText(`OGSM 策略報告`, {
        x: 2.45, y: 4.3, w: 5, h: 0.6,
        fontSize: 17, fontFace: 'DFKai-SB', color: 'E07800',
        align: 'left', valign: 'middle',
      })

      // ── Per-goal slides ───────────────────────────────────────────────────────
      for (let gi = 0; gi < project.goals.length; gi++) {
        const goal       = project.goals[gi]
        const strategies = goal.strategies || []

        // Flatten: each measure = one body row
        // { strat, si, measure|null, mi, stratRowCount }
        const rows = []
        strategies.forEach((strat, si) => {
          const ms = strat.measures || []
          if (ms.length === 0) {
            rows.push({ strat, si, measure: null, mi: 0, stratRowCount: 1 })
          } else {
            ms.forEach((m, mi) =>
              rows.push({ strat, si, measure: m, mi, stratRowCount: ms.length })
            )
          }
        })
        const totalRows = Math.max(rows.length, 1)

        // ── Slide ──────────────────────────────────────────────────────────────
        const sl = pres.addSlide()
        sl.background = { color: 'FFFFFF' }

        // ── Layout constants (all in inches) ───────────────────────────────────
        const MG  = 0.18                // left/right margin
        const TW  = 13.3 - MG * 2      // total table width  ≈ 12.94"
        const TX  = MG

        // Column widths (proportional – matches screenshot aspect)
        const GW  = TW * 0.152
        const SW  = TW * 0.218
        const MDW = TW * 0.315
        const MPW = TW - GW - SW - MDW
        const GX  = TX
        const SX  = GX + GW
        const MDX = SX + SW
        const MPX = MDX + MDW

        // Row Y positions
        const OBJ_Y  = 0.10
        const OBJ_H  = 0.50           // Objective row (single)

        // Header: G and S span TWO sub-rows; M has row-1 + row-2
        const HR1_Y  = OBJ_Y + OBJ_H  // header row 1
        const HR1_H  = 0.28
        const HR2_Y  = HR1_Y + HR1_H  // header row 2 (MD/MP labels)
        const HR2_H  = 0.26
        const HDR_TOTAL = HR1_H + HR2_H  // G & S cells span this full height

        const BODY_Y = HR2_Y + HR2_H
        const BODY_AVAIL = 7.5 - BODY_Y - 0.10
        const RH = Math.max(BODY_AVAIL / totalRows, 0.52)  // row height

        // ── Objective row ──────────────────────────────────────────────────────
        // Header strip (wheat, same as G/S/M headers)
        sl.addShape(pres.shapes.RECTANGLE, {
          x: TX, y: OBJ_Y, w: TW, h: 0.22,
          fill: { color: HDR_BG }, line: bH()
        })
        sl.addText('O：Objective（目標）', {
          x: TX + 0.08, y: OBJ_Y, w: TW - 0.16, h: 0.22,
          fontSize: 11, fontFace: 'Microsoft JhengHei', color: '000000',
          bold: true, align: 'left', valign: 'middle', margin: 0
        })
        // Content area (warm near-white)
        sl.addShape(pres.shapes.RECTANGLE, {
          x: TX, y: OBJ_Y + 0.22, w: TW, h: OBJ_H - 0.22,
          fill: { color: OBJ_BG }, line: bH()
        })
        sl.addText(`${project.objective || ''}`, {
          x: TX + 0.08, y: OBJ_Y + 0.22, w: TW - 0.16, h: OBJ_H - 0.24,
          fontSize: 11, fontFace: 'Microsoft JhengHei', color: TXT,
          align: 'left', valign: 'middle', margin: 0
        })

        // ── Header rows ────────────────────────────────────────────────────────
        // G column: spans HR1+HR2 (HDR_TOTAL height), text vertically centred
        sl.addShape(pres.shapes.RECTANGLE, {
          x: GX, y: HR1_Y, w: GW, h: HDR_TOTAL,
          fill: { color: HDR_BG }, line: bH()
        })
        sl.addText('G：Goals（具體目標）', {
          x: GX + 0.06, y: HR1_Y, w: GW - 0.08, h: HDR_TOTAL,
          fontSize: 10.5, fontFace: 'Microsoft JhengHei', color: '000000',
          bold: true, align: 'left', valign: 'middle', margin: 0
        })

        // S column: spans HR1+HR2 (HDR_TOTAL height), text vertically centred
        sl.addShape(pres.shapes.RECTANGLE, {
          x: SX, y: HR1_Y, w: SW, h: HDR_TOTAL,
          fill: { color: HDR_BG }, line: bH()
        })
        sl.addText('S：Strategies（策略）', {
          x: SX + 0.06, y: HR1_Y, w: SW - 0.08, h: HDR_TOTAL,
          fontSize: 10.5, fontFace: 'Microsoft JhengHei', color: '000000',
          bold: true, align: 'left', valign: 'middle', margin: 0
        })

        // M header row 1: "M：Measures（衡量指標）" spans MD+MP
        sl.addShape(pres.shapes.RECTANGLE, {
          x: MDX, y: HR1_Y, w: MDW + MPW, h: HR1_H,
          fill: { color: HDR_BG }, line: bH()
        })
        sl.addText('M：Measures（衡量指標）', {
          x: MDX + 0.06, y: HR1_Y, w: MDW + MPW - 0.08, h: HR1_H,
          fontSize: 10.5, fontFace: 'Microsoft JhengHei', color: '000000',
          bold: true, align: 'left', valign: 'middle', margin: 0
        })

        // M header row 2: MD label | MP label
        ;[
          { x: MDX, w: MDW, label: 'MD（定量指標）' },
          { x: MPX, w: MPW, label: 'MP（檢核指標）' },
        ].forEach(({ x, w, label }) => {
          sl.addShape(pres.shapes.RECTANGLE, {
            x, y: HR2_Y, w, h: HR2_H,
            fill: { color: HDR_BG }, line: bH()
          })
          sl.addText(label, {
            x: x + 0.06, y: HR2_Y, w: w - 0.08, h: HR2_H,
            fontSize: 10, fontFace: 'Microsoft JhengHei', color: '000000',
            bold: true, align: 'left', valign: 'middle', margin: 0
          })
        })

        // ── Goal body cell (spans all rows) ────────────────────────────────────
        const goalBodyH = RH * totalRows
        sl.addShape(pres.shapes.RECTANGLE, {
          x: GX, y: BODY_Y, w: GW, h: goalBodyH,
          fill: { color: CELL_WH }, line: b()
        })
        // "G1" number prefix + goal text, vertically centred in full span
        sl.addText([
          { text: `G${gi + 1}\n`, options: { bold: true, color: '7A4F00', fontSize: 12, breakLine: true } },
          { text: goal.text || '', options: { bold: true, color: TXT, fontSize: 14 } },
        ], {
          x: GX + 0.07, y: BODY_Y + 0.06, w: GW - 0.12, h: goalBodyH - 0.1,
          fontFace: 'Microsoft JhengHei', align: 'left', valign: 'middle', margin: 0
        })

        // ── Pre-compute strategy spans ─────────────────────────────────────────
        const stratSpans = []
        let rIdx = 0
        strategies.forEach((strat, si) => {
          const cnt = Math.max((strat.measures || []).length, 1)
          stratSpans.push({ startRow: rIdx, rowCount: cnt })
          rIdx += cnt
        })

        // ── Collect MD items (定量指標 KPI names) and MP items (MP 檢核步驟 todos) ──
        // MD 編碼：D{gi+1}.{si+1}.{mi+1}        e.g. D1.1.1, D1.1.2
        // MP 編碼：P{gi+1}.{si+1}.{mi+1}.{ti+1} e.g. P1.1.1.1, P1.1.1.2, P1.1.2.1
        const mdItems = []  // { num, text }
        const mpItems = []  // { num, text, done }

        strategies.forEach((strat, si) => {
          ;(strat.measures || []).forEach((m, mi) => {
            // MD 欄：每個定量指標的 KPI 名稱
            mdItems.push({
              num:      `D${gi + 1}.${si + 1}.${mi + 1}`,
              text:     m.kpi || '—',
              deadline: m.deadline || '',
              assignee: m.assignee || '',
            })
            // MP 欄：該定量指標底下所有 todos（MP 檢核步驟）
            ;(m.todos || []).forEach((t, ti) => {
              mpItems.push({
                num:      `P${gi + 1}.${si + 1}.${mi + 1}.${ti + 1}`,
                text:     t.text,
                done:     t.done,
                deadline: t.deadline || '',
                assignee: t.assignee || '',
              })
            })
          })
        })

        // ── S column: single spanning rect, MD-style parts array ─────────────
        const sParts = []
        strategies.forEach((strat, si) => {
          const isLast = si === strategies.length - 1
          sParts.push({ text: `S${gi + 1}.${si + 1} `, options: { bold: true, color: '1A4A8A', fontSize: 12 } })
          sParts.push({
            text: strat.text || '',
            options: { color: TXT, fontSize: 13, breakLine: true, paraSpaceAfter: 0 }
          })
          // Blank spacer line — same pattern as MD, but larger gap
          sParts.push({
            text: ' ',
            options: { color: TXT, fontSize: 9, breakLine: !isLast, paraSpaceAfter: isLast ? 0 : 30 }
          })
        })
        sl.addShape(pres.shapes.RECTANGLE, {
          x: SX, y: BODY_Y, w: SW, h: goalBodyH,
          fill: { color: CELL_AL }, line: b()
        })
        if (sParts.length > 0) {
          sl.addText(sParts, {
            x: SX + 0.07, y: BODY_Y + 0.08, w: SW - 0.12, h: goalBodyH - 0.14,
            fontFace: 'Microsoft JhengHei', align: 'left', valign: 'middle', margin: 0,
            lineSpacingMultiple: 1.3,
          })
        }

        // ── MD column: one single spanning cell, no inner row borders ─────────
        // Only left/top/bottom border; right border shared with MP
        sl.addShape(pres.shapes.RECTANGLE, {
          x: MDX, y: BODY_Y, w: MDW, h: goalBodyH,
          fill: { color: CELL_MD },
          line: b()
        })

        const mdParts = []
        mdItems.forEach((item, idx) => {
          const isLast = idx === mdItems.length - 1
          const hasMeta = item.deadline || item.assignee
          const fmtDate = item.deadline ? item.deadline.replace(/-/g, '/') : ''
          const metaLine = [fmtDate ? `[期限 ${fmtDate}]` : '', item.assignee ? `負責人員: ${item.assignee}` : ''].filter(Boolean).join('  ')
          mdParts.push({ text: item.num + ' ', options: { bold: true, color: '7A4000', fontSize: 10 } })
          mdParts.push({
            text: item.text,
            options: { color: '000000', fontSize: 11, breakLine: true, paraSpaceAfter: 0 }
          })
          // Always emit meta line slot (blank if none) for consistent inter-item spacing
          mdParts.push({
            text: hasMeta ? metaLine : ' ',
            options: { color: '7A6030', fontSize: 9, breakLine: !isLast, paraSpaceAfter: isLast ? 0 : 15 }
          })
        })
        if (mdParts.length > 0) {
          sl.addText(mdParts, {
            x: MDX + 0.08, y: BODY_Y + 0.08, w: MDW - 0.14, h: goalBodyH - 0.14,
            fontFace: 'Microsoft JhengHei', align: 'left', valign: 'middle', margin: 0,
            lineSpacingMultiple: 1.2,
          })
        }

        // ── MP column: overflow-aware rendering ───────────────────────────────
        // Estimate height per item to detect overflow and paginate
        const MP_ITEM_H   = 0.28   // approx text line height (inches, fontSize 11)
        const MP_META_H   = 0.20   // extra for meta line (fontSize 9)
        const MP_GAP_H    = 0.08   // paraSpaceAfter 6pt ≈ 0.08" between items
        const mpAvailH    = goalBodyH - 0.20

        // Fixed height per item (meta-line slot always counted for consistent spacing)
        const itemSlotH = MP_ITEM_H + MP_META_H + MP_GAP_H

        // Split into chunks that fit within available height
        const mpChunks = [[]]
        let mpChunkH = 0
        mpItems.forEach(item => {
          const h = itemSlotH
          if (mpChunkH + h > mpAvailH && mpChunks[mpChunks.length - 1].length > 0) {
            mpChunks.push([])
            mpChunkH = 0
          }
          mpChunks[mpChunks.length - 1].push(item)
          mpChunkH += h
        })

        // Helper: build pptx text parts from a chunk of mpItems
        // Always emits a meta-line run (even if blank) so every item occupies
        // the same vertical slot → consistent inter-item spacing
        const buildMpParts = (chunk) => {
          const parts = []
          chunk.forEach((item, idx) => {
            const isLast = idx === chunk.length - 1
            const fmtDate = item.deadline ? item.deadline.replace(/-/g, '/') : ''
            const metaLineText = [
              fmtDate ? `[期限 ${fmtDate}]` : '',
              item.assignee ? `負責人員: ${item.assignee}` : '',
            ].filter(Boolean).join('  ')
            parts.push({ text: item.num + ' ', options: { bold: true, color: '1A4A2E', fontSize: 10 } })
            parts.push({
              text: item.text,
              options: { color: '000000', fontSize: 11, breakLine: true, paraSpaceAfter: 0 }
            })
            // Always emit meta line (or blank space) to keep consistent item height
            parts.push({
              text: metaLineText || ' ',
              options: { color: '1A4A2E', fontSize: 9, breakLine: !isLast, paraSpaceAfter: isLast ? 0 : 4 },
            })
          })
          return parts
        }

        // First-page MP cell
        // Reduce padding dynamically: more items → less whitespace
        const mpPadY = mpItems.length > 8 ? 0.02 : mpItems.length > 4 ? 0.04 : 0.08
        sl.addShape(pres.shapes.RECTANGLE, {
          x: MPX, y: BODY_Y, w: MPW, h: goalBodyH,
          fill: { color: CELL_MP }, line: b()
        })
        if (mpChunks[0].length > 0) {
          sl.addText(buildMpParts(mpChunks[0]), {
            x: MPX + 0.08, y: BODY_Y + mpPadY, w: MPW - 0.12, h: goalBodyH - mpPadY * 2,
            fontFace: 'Microsoft JhengHei', align: 'left', valign: 'middle', margin: 0,
            lineSpacingMultiple: 1.1,
          })
        }

        // ── Outer border overlay ───────────────────────────────────────────────
        sl.addShape(pres.shapes.RECTANGLE, {
          x: TX, y: OBJ_Y,
          w: TW,
          h: OBJ_H + HDR_TOTAL + RH * totalRows,
          fill: { type: 'none' }, line: { color: HDR_BD, pt: 1.8 }
        })

        // ── Footer ────────────────────────────────────────────────────────────
        sl.addText(`${project.title}　·　G${gi + 1} / ${project.goals.length}`, {
          x: MG, y: 7.36, w: TW, h: 0.16,
          fontSize: 9, fontFace: 'Microsoft JhengHei', color: 'AAAAAA',
          align: 'left', valign: 'middle', margin: 0
        })

        // ── MP overflow continuation slides (full OGSM format) ────────────────
        for (let ci = 1; ci < mpChunks.length; ci++) {
          const ovSl = pres.addSlide()
          ovSl.background = { color: 'FFFFFF' }

          // Objective row
          ovSl.addShape(pres.shapes.RECTANGLE, { x: TX, y: OBJ_Y, w: TW, h: 0.22, fill: { color: HDR_BG }, line: bH() })
          ovSl.addText('O：Objective（目標）', { x: TX + 0.08, y: OBJ_Y, w: TW - 0.16, h: 0.22, fontSize: 11, fontFace: 'Microsoft JhengHei', color: '000000', bold: true, align: 'left', valign: 'middle', margin: 0 })
          ovSl.addShape(pres.shapes.RECTANGLE, { x: TX, y: OBJ_Y + 0.22, w: TW, h: OBJ_H - 0.22, fill: { color: OBJ_BG }, line: bH() })
          ovSl.addText(`${project.objective || ''}`, { x: TX + 0.08, y: OBJ_Y + 0.22, w: TW - 0.16, h: OBJ_H - 0.24, fontSize: 11, fontFace: 'Microsoft JhengHei', color: TXT, align: 'left', valign: 'middle', margin: 0 })

          // Header rows
          ovSl.addShape(pres.shapes.RECTANGLE, { x: GX, y: HR1_Y, w: GW, h: HDR_TOTAL, fill: { color: HDR_BG }, line: bH() })
          ovSl.addText('G：Goals（具體目標）', { x: GX + 0.06, y: HR1_Y, w: GW - 0.08, h: HDR_TOTAL, fontSize: 10.5, fontFace: 'Microsoft JhengHei', color: '000000', bold: true, align: 'left', valign: 'middle', margin: 0 })
          ovSl.addShape(pres.shapes.RECTANGLE, { x: SX, y: HR1_Y, w: SW, h: HDR_TOTAL, fill: { color: HDR_BG }, line: bH() })
          ovSl.addText('S：Strategies（策略）', { x: SX + 0.06, y: HR1_Y, w: SW - 0.08, h: HDR_TOTAL, fontSize: 10.5, fontFace: 'Microsoft JhengHei', color: '000000', bold: true, align: 'left', valign: 'middle', margin: 0 })
          ovSl.addShape(pres.shapes.RECTANGLE, { x: MDX, y: HR1_Y, w: MDW + MPW, h: HR1_H, fill: { color: HDR_BG }, line: bH() })
          ovSl.addText('M：Measures（衡量指標）', { x: MDX + 0.06, y: HR1_Y, w: MDW + MPW - 0.08, h: HR1_H, fontSize: 10.5, fontFace: 'Microsoft JhengHei', color: '000000', bold: true, align: 'left', valign: 'middle', margin: 0 })
          ;[
            { x: MDX, w: MDW, label: 'MD（定量指標）' },
            { x: MPX, w: MPW, label: 'MP（檢核指標）（續）' },
          ].forEach(({ x, w, label }) => {
            ovSl.addShape(pres.shapes.RECTANGLE, { x, y: HR2_Y, w, h: HR2_H, fill: { color: HDR_BG }, line: bH() })
            ovSl.addText(label, { x: x + 0.06, y: HR2_Y, w: w - 0.08, h: HR2_H, fontSize: 10, fontFace: 'Microsoft JhengHei', color: '000000', bold: true, align: 'left', valign: 'middle', margin: 0 })
          })

          // G column body
          ovSl.addShape(pres.shapes.RECTANGLE, { x: GX, y: BODY_Y, w: GW, h: goalBodyH, fill: { color: CELL_WH }, line: b() })
          ovSl.addText([
            { text: `G${gi + 1}\n`, options: { bold: true, color: '7A4F00', fontSize: 12, breakLine: true } },
            { text: goal.text || '', options: { bold: true, color: TXT, fontSize: 14 } },
          ], { x: GX + 0.07, y: BODY_Y + 0.06, w: GW - 0.12, h: goalBodyH - 0.1, fontFace: 'Microsoft JhengHei', align: 'left', valign: 'middle', margin: 0 })

          // S column body
          ovSl.addShape(pres.shapes.RECTANGLE, { x: SX, y: BODY_Y, w: SW, h: goalBodyH, fill: { color: CELL_AL }, line: b() })
          if (sParts.length > 0) {
            ovSl.addText(sParts, { x: SX + 0.07, y: BODY_Y + 0.08, w: SW - 0.12, h: goalBodyH - 0.14, fontFace: 'Microsoft JhengHei', align: 'left', valign: 'middle', margin: 0, lineSpacingMultiple: 1.3 })
          }

          // MD column
          ovSl.addShape(pres.shapes.RECTANGLE, { x: MDX, y: BODY_Y, w: MDW, h: goalBodyH, fill: { color: CELL_MD }, line: b() })
          if (mdParts.length > 0) {
            ovSl.addText(mdParts, { x: MDX + 0.08, y: BODY_Y + 0.08, w: MDW - 0.14, h: goalBodyH - 0.14, fontFace: 'Microsoft JhengHei', align: 'left', valign: 'middle', margin: 0, lineSpacingMultiple: 1.2 })
          }

          // MP column (overflow chunk, vertically centred)
          ovSl.addShape(pres.shapes.RECTANGLE, { x: MPX, y: BODY_Y, w: MPW, h: goalBodyH, fill: { color: CELL_MP }, line: b() })
          if (mpChunks[ci].length > 0) {
            ovSl.addText(buildMpParts(mpChunks[ci]), {
              x: MPX + 0.08, y: BODY_Y + mpPadY, w: MPW - 0.12, h: goalBodyH - mpPadY * 2,
              fontFace: 'Microsoft JhengHei', align: 'left', valign: 'middle', margin: 0,
              lineSpacingMultiple: 1.1,
            })
          }

          // Outer border overlay
          ovSl.addShape(pres.shapes.RECTANGLE, {
            x: TX, y: OBJ_Y, w: TW, h: OBJ_H + HDR_TOTAL + RH * totalRows,
            fill: { type: 'none' }, line: { color: HDR_BD, pt: 1.8 }
          })

          // Footer
          ovSl.addText(`${project.title}　·　G${gi + 1} / ${project.goals.length}　（MP 續 ${ci}）`, {
            x: MG, y: 7.36, w: TW, h: 0.16,
            fontSize: 9, fontFace: 'Microsoft JhengHei', color: 'AAAAAA',
            align: 'left', valign: 'middle', margin: 0
          })
        }

      } // end goals loop

      // ── Back cover slide ─────────────────────────────────────────────────────
      const backSlide = pres.addSlide()
      backSlide.addImage({ data: pptBackData, x: 0, y: 0, w: 13.3, h: 7.5 })

      // ── Save ──────────────────────────────────────────────────────────────────
      const safe = (project.title || 'Project').replace(/[/\\?%*:|"<>]/g, '_')
      await pres.writeFile({ fileName: `OGSM_${safe}.pptx` })

    } catch (err) {
      console.error('PPT generation error:', err)
      alert('PPT 生成失敗：' + err.message)
    } finally {
      setPptLoading(false)
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
        .audit-ppt-btn:hover:not(:disabled) {
          background: rgba(59,158,222,0.22) !important;
          border-color: rgba(59,158,222,0.7) !important;
          box-shadow: 0 0 10px rgba(59,158,222,0.3);
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
            <button className="audit-ppt-btn" style={{ ...s.pdfBtn, opacity: pptLoading ? 0.6 : 1, background: 'rgba(59,158,222,0.1)', border: '1px solid rgba(59,158,222,0.3)', color: '#3b9ede' }} onClick={generatePPT} disabled={pptLoading} title="生成 OGSM PPT">
              {pptLoading ? '生成中…' : '📽️ 生成 PPT'}
            </button>
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
                    style={{
                      ...s.expandBtn,
                      ...(isExpanded ? {
                        background: `${goalColor}28`,
                        border: `1px solid ${goalColor}88`,
                        color: goalColor,
                        boxShadow: `0 0 6px ${goalColor}44`,
                      } : {})
                    }}
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
                        <span style={s.stratBadge}>S{gi + 1}.{si + 1}</span>
                        <span style={s.stratText}>{st.text || '(未命名)'}</span>
                        <span style={{ fontSize: '11px', fontFamily: '"DM Mono", monospace', color: stColor, flexShrink: 0 }}>
                          {stProgress}%
                        </span>
                      </div>

                      {/* Measures table */}
                      {st.measures.length > 0 && (() => {
                        const stratHasTodos = st.measures.some(m => (m.todos || []).length > 0)
                        return (
                          <div style={s.measureTable}>
                            <div style={s.mTableHeader}>
                              <span style={{ ...s.mCol, flex: 2 }}>MD 定量指標</span>
                              <span style={{ ...s.mCol, flex: 1.2 }}>目標</span>
                              <span style={{ ...s.mCol, flex: 0.8 }}>實際</span>
                              <span style={{ ...s.mCol, width: '76px' }}>負責人</span>
                              <span style={{ ...s.mCol, width: '76px' }}>期限</span>
                              <span style={{ ...s.mCol, width: '70px' }}>狀態</span>
                              <span style={{ ...s.mCol, width: '80px' }}>進度</span>
                              {stratHasTodos && <span style={{ ...s.mCol, width: '36px', textAlign: 'center' }}>MP</span>}
                            </div>
                            {st.measures.map((m, mi) => {
                              const sc = STATUS_CONFIG[m.status] || STATUS_CONFIG.NotStarted
                              const pc = progressColor(m.progress || 0)
                              const todoKey = `${gi}-${si}-${mi}`
                              const hasTodos = (m.todos || []).length > 0
                              const todosOpen = expandedMeasureTodos.has(todoKey)
                              const doneCount = (m.todos || []).filter(t => t.done).length
                              const totalTodos = (m.todos || []).length
                              return (
                                <div key={m.id ?? mi}>
                                  <div style={s.mRow}>
                                    <span style={{ ...s.mCell, flex: 2 }}>{m.kpi || '—'}</span>
                                    <span style={{ ...s.mCell, flex: 1.2, color: '#f0a500', fontFamily: '"DM Mono", monospace' }}>{m.target || '—'}</span>
                                    <span style={{ ...s.mCell, flex: 0.8, color: '#4caf7d', fontFamily: '"DM Mono", monospace' }}>{m.actual || '—'}</span>
                                    <span style={{ ...s.mCell, width: '76px', fontSize: '10px', color: darkMode ? '#c0c8d8' : '#374151' }}>{m.assignee || '—'}</span>
                                    <span style={{ ...s.mCell, width: '76px', fontFamily: '"DM Mono", monospace', fontSize: '10px', color: darkMode ? '#8a95ae' : '#4a607a' }}>{m.deadline || '—'}</span>
                                    <span style={{ ...s.mCell, width: '70px' }}>
                                      <span style={{ color: sc.color, fontSize: '10px' }}>● {sc.label}</span>
                                    </span>
                                    <span style={{ ...s.mCell, width: '80px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <div style={{ flex: 1 }}>
                                          <ProgressBar value={m.progress || 0} color={pc} height={4} trackColor={track} />
                                        </div>
                                        <span style={{ fontSize: '10px', fontFamily: '"DM Mono", monospace', color: pc, minWidth: '26px' }}>
                                          {m.progress || 0}%
                                        </span>
                                      </div>
                                    </span>
                                    {stratHasTodos && (
                                      <span style={{ ...s.mCell, width: '36px', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {hasTodos ? (
                                          <button
                                            onClick={() => toggleMeasureTodo(todoKey)}
                                            style={{
                                              background: todosOpen ? 'rgba(244,114,182,0.15)' : (darkMode ? 'rgba(138,149,174,0.1)' : 'rgba(0,0,0,0.05)'),
                                              border: `1px solid ${todosOpen ? 'rgba(244,114,182,0.4)' : (darkMode ? 'rgba(138,149,174,0.25)' : 'rgba(0,0,0,0.15)')}`,
                                              borderRadius: '4px', padding: '2px 4px', cursor: 'pointer',
                                              color: todosOpen ? '#f472b6' : (darkMode ? '#8a95ae' : '#3d5470'),
                                              fontSize: '9px', fontFamily: '"DM Mono", monospace',
                                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px',
                                              lineHeight: 1.2, minWidth: '28px', transition: 'all 0.15s',
                                            }}
                                          >
                                            <span>{todosOpen ? '▾' : '▸'}</span>
                                            <span style={{ fontSize: '8px' }}>{doneCount}/{totalTodos}</span>
                                          </button>
                                        ) : null}
                                      </span>
                                    )}
                                  </div>
                                  {hasTodos && todosOpen && (
                                    <div style={{
                                      padding: '8px 12px 10px 16px',
                                      background: darkMode ? 'rgba(0,0,0,0.25)' : 'rgba(244,114,182,0.04)',
                                      borderTop: `1px solid ${darkMode ? '#1a2133' : '#edf2fa'}`,
                                      borderLeft: `3px solid rgba(59,158,222,0.5)`,
                                    }}>
                                      <div style={{ fontSize: '9px', fontFamily: '"DM Mono", monospace', fontWeight: 700, color: '#f472b6', letterSpacing: '0.6px', marginBottom: '6px' }}>
                                        ☑ MP 檢核步驟 {doneCount}/{totalTodos}
                                      </div>
                                      {(m.todos || []).map((t, ti) => {
                                        const tOverdue = t.deadline && t.deadline < new Date().toISOString().slice(0,10) && !t.done
                                        return (
                                        <div key={t.id ?? ti} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px' }}>
                                          <span style={{ fontSize: '13px', flexShrink: 0, lineHeight: 1.5, color: t.done ? '#4caf7d' : (darkMode ? '#7eb8e8' : '#8a9ab8') }}>{t.done ? '✓' : '○'}</span>
                                          <span style={{ fontSize: '11px', lineHeight: 1.5, flex: 1, color: t.done ? (darkMode ? '#5a7090' : '#9aabbd') : (darkMode ? '#c8d4e8' : '#445069'), textDecoration: t.done ? 'line-through' : 'none', wordBreak: 'break-word' }}>{t.text}</span>
                                          {(t.assignee || t.deadline) && (
                                            <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center', alignSelf: 'center' }}>
                                              {t.assignee && <span style={{ fontSize: '9px', fontFamily: '"Noto Sans TC", sans-serif', color: darkMode ? '#8a95ae' : '#6b7280', background: darkMode ? 'rgba(138,149,174,0.1)' : 'rgba(0,0,0,0.05)', border: `1px solid ${darkMode ? '#2a3347' : '#e5e7eb'}`, borderRadius: '3px', padding: '1px 5px', whiteSpace: 'nowrap' }}>👤 {t.assignee}</span>}
                                              {t.deadline && <span style={{ fontSize: '9px', fontFamily: '"DM Mono", monospace', color: tOverdue ? '#ef4444' : (darkMode ? '#8a95ae' : '#6b7280'), background: tOverdue ? 'rgba(239,68,68,0.08)' : (darkMode ? 'rgba(138,149,174,0.1)' : 'rgba(0,0,0,0.05)'), border: `1px solid ${tOverdue ? 'rgba(239,68,68,0.3)' : (darkMode ? '#2a3347' : '#e5e7eb')}`, borderRadius: '3px', padding: '1px 5px', whiteSpace: 'nowrap' }}>{tOverdue ? '⚠ ' : '📅 '}{t.deadline}</span>}
                                            </div>
                                          )}
                                        </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()}
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
      width: '700px', maxWidth: '92vw',
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
    closeBtn: { background: 'none', border: 'none', color: dark ? '#8a95ae' : '#3d5470', cursor: 'pointer', fontSize: '16px', padding: '4px', lineHeight: 1, transition: 'color 0.2s' },
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
    statLabel: { fontSize: '10px', fontFamily: '"DM Mono", monospace', color: dark ? '#8a95ae' : '#4a607a', marginTop: '4px', letterSpacing: '0.5px' },

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
    stratBadge: { fontSize: '10px', fontFamily: '"DM Mono", monospace', color: dark ? '#b0bac9' : '#4a607a', flexShrink: 0, marginTop: '2px', fontWeight: 500 },
    stratText: { fontSize: '12px', color: dark ? '#d4dce8' : '#445069', flex: 1, lineHeight: 1.7, wordBreak: 'break-word', whiteSpace: 'normal' },

    measureTable: { marginTop: '10px' },
    mTableHeader: {
      display: 'flex', gap: '0', padding: '6px 8px',
      background: dark ? '#161b27' : '#e8f0fa', borderRadius: '4px 4px 0 0',
    },
    mCol: { fontSize: '9px', fontFamily: '"DM Mono", monospace', color: dark ? '#8a95ae' : '#4a607a', letterSpacing: '0.5px', textTransform: 'uppercase', padding: '0 4px', fontWeight: 600 },
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
      color: dark ? '#8a95ae' : '#3d5470',
    },
  }
}