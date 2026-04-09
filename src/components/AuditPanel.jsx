import { useState, useEffect } from 'react'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { loadSavedBgConfig } from '../bgConfig.js'
import BrutalistBackground from './BrutalistBackground.jsx'

// ─── DESIGN TOKENS (Brutalist Edition) ──────────────────────────────────────
const ACCENT_BLUE   = "#4242e3";
const ACCENT_CYAN   = "#14a0d3";
const ACCENT_PINK   = "#FF00FF";
const ACCENT_ORANGE = "#dd800f";
const ACCENT_GREEN  = "#23cc23";

// 狀態色彩全面替換為高對比度粗獷色系
const STATUS_CONFIG = {
  NotStarted: { label: '未開始', color: '#888888' },
  InProgress:  { label: '進行中', color: ACCENT_CYAN },
  Completed:   { label: '已完成', color: ACCENT_GREEN },
  Overdue:     { label: '已逾期', color: ACCENT_PINK },
}

function calcProgress(measures) {
  if (!measures.length) return 0
  return Math.round(measures.reduce((s, m) => s + (m.progress || 0), 0) / measures.length)
}

function progressColor(pct) {
  if (pct === 0)  return '#888888'
  if (pct < 30)   return ACCENT_PINK
  if (pct < 60)   return ACCENT_ORANGE
  if (pct < 100)  return ACCENT_CYAN
  return ACCENT_GREEN
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

function getAssigneeText(item) {
  const rawAssignees = item?.assignees ?? item?.assignee ?? []

  if (Array.isArray(rawAssignees)) {
    return rawAssignees
      .map(name => `${name ?? ''}`.trim())
      .filter(Boolean)
      .join(', ')
  }

  return typeof rawAssignees === 'string' ? rawAssignees.trim() : ''
}

function ProgressBar({ value, color = ACCENT_ORANGE, height = 10, trackColor = '#000', borderColor = '#FFF' }) {
  return (
    <div style={{ background: trackColor, border: `2px solid ${borderColor}`, height, overflow: 'hidden' }}>
      <div style={{ 
        width: `${value}%`, 
        height: '100%', 
        background: color, 
        transition: 'width 0.5s ease',
        borderRight: (value > 0 && value < 100) ? `2px solid ${borderColor}` : 'none'
      }} />
    </div>
  )
}

function StatusDots({ counts }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {Object.entries(STATUS_CONFIG).map(([k, v]) => counts[k] > 0 && (
        <span key={k} style={{ fontSize: '11px', fontFamily: '"DM Mono", "Space Grotesk", monospace', color: v.color, display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
          <span style={{ width: 8, height: 8, background: v.color, display: 'inline-block', border: '1px solid currentColor' }} />
          {v.label} {counts[k]}
        </span>
      ))}
    </div>
  )
}

export default function AuditPanel({ project, onClose, darkMode = true, originRect = null }) {
  const [expandedGoals, setExpandedGoals] = useState(new Set())
  const [expandedMeasureTodos, setExpandedMeasureTodos] = useState(new Set())
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pptLoading, setPptLoading] = useState(false)
  const [pptHovered, setPptHovered] = useState(false)
  const [pdfHovered, setPdfHovered] = useState(false)

  const [bgConfig, setBgConfig] = useState(() => loadSavedBgConfig())
  useEffect(() => {
    const handleBgChange = () => setBgConfig(loadSavedBgConfig())
    window.addEventListener('brutalistBgChanged', handleBgChange)
    return () => window.removeEventListener('brutalistBgChanged', handleBgChange)
  }, [])

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

  const overallColor = progressColor(overall)
  const todoStats    = calcTodos(project.goals)
  const s = buildAuditStyles(darkMode)
  const T = darkMode ? { bg: '#121212', border: '#FFF', text: '#FFF' } : { bg: '#f8f9fa', border: '#000', text: '#000' }

  // ============================================================================
  // PDF 與 PPT 生成邏輯
  // ============================================================================
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

      // PDF 專用進度色：黃色用深琥珀取代亮黃，確保在白底可讀
      const pdfProgressColor = (pct) => {
        if (pct === 0)  return '#888888'
        if (pct < 30)   return '#e11d2d'
        if (pct < 60)   return '#d97706'
        if (pct < 100)  return '#0891b2'
        return '#16a34a'
      }
      const pdfOverallColor = pdfProgressColor(overall)

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
            <div style="font-size:56px;font-weight:800;color:${pdfOverallColor};line-height:1;">${overall}</div>
            <div style="font-size:14px;color:${pdfOverallColor};font-weight:600;">% 整體完成</div>
          </div>
        </div>
        ${divider()}
        <div style="margin-bottom:16px;">
          <div style="height:12px;background:#e5e7eb;border-radius:6px;overflow:hidden;">
            <div style="width:${overall}%;height:100%;background:${pdfOverallColor};border-radius:6px;"></div>
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
        ${sectionTitle('☑ MP 檢核步驟完成率')}
        <div style="background:#fdf2f8;border:1px solid #f9a8d4;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
            <div style="flex:1;height:10px;background:#fce7f3;border-radius:5px;overflow:hidden;">
              <div style="width:${todoStats.pct}%;height:100%;background:#f472b6;border-radius:5px;"></div>
            </div>
            <span style="font-size:16px;font-weight:800;color:#f472b6;min-width:44px;">${todoStats.pct}%</span>
          </div>
          <div style="font-size:11px;color:#6b7280;">已完成 ${todoStats.done} / ${todoStats.total} 項 MP 檢核步驟</div>
        </div>` : ''}

        ${sectionTitle('Goals 總覽')}
        ${project.goals.map((goal, gi) => {
          const gm = goal.strategies.flatMap(s => s.measures)
          const gp = calcProgress(gm)
          const gc = statusCounts(gm)
          const gc2 = pdfProgressColor(gp)
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

      container.innerHTML = `<div style="width:794px;height:1123px;position:relative;overflow:hidden;font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif;"><img src="${frontCoverData}" style="width:794px;height:1123px;position:absolute;top:0;left:0;display:block;" /><div style="position:absolute;top:32%;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:20px;padding:0 60px;text-align:center;"><div style="font-size:48px;font-weight:900;color:#111111;letter-spacing:3px;">亞家科技股份有限公司</div><div style="font-size:30px;font-weight:700;color:#e07800;letter-spacing:1px;">${(project.title.endsWith('計畫') || project.title.endsWith('計劃')) ? project.title : project.title + '計畫'}</div><div style="font-size:22px;font-weight:600;color:#555555;letter-spacing:2px;">OGSM審計報告</div></div></div>`
      await new Promise(r => setTimeout(r, 100))
      {
        const frontCanvas = await html2canvas(container.firstChild, {
          scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false
        })
        doc.addImage(frontCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfW, pdfH)
      }

      // ── 兩階段生成：先收集所有頁面 HTML，再帶總頁數渲染 ──────────────────

      // 收集內容頁 HTML（不含封面封底）
      const contentPages = []   // [{ html }]

      const collectPage = (html) => {
        contentPages.push(html)
      }

      // 第一階段：dry-run 收集所有內容頁
      collectPage(summaryHTML)

      const PAGE_CONTENT_H = 1027
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
        const gc2 = pdfProgressColor(gp)

        const goalHeaderHTML = `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
            <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:4px 12px;font-size:13px;font-weight:800;color:#d97706;">G${gi+1}</div>
            <div style="font-size:20px;font-weight:800;color:#111827;flex:1;">${goal.text || '（未命名）'}</div>
            <div style="font-size:18px;font-weight:800;color:${gc2};">${gp}%</div>
          </div>
          <div style="margin-bottom:20px;">
            <div style="height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;">
              <div style="width:${gp}%;height:100%;background:${gc2};border-radius:4px;"></div>
            </div>
          </div>
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
          const sc2 = pdfProgressColor(sp)

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
                      <td style="padding:8px 10px;color:#374151;"><span style="font-size:9px;font-weight:700;color:#d97706;font-family:monospace;margin-right:5px;">D${gi+1}.${si+1}.${mi+1}</span>${m.kpi || '—'}</td>
                      <td style="padding:8px 10px;color:#d97706;font-family:monospace;">${m.target || '—'}</td>
                      <td style="padding:8px 10px;color:#16a34a;font-family:monospace;">${m.actual || '—'}</td>
                      <td style="padding:8px 10px;color:#6b7280;font-size:10px;">${getAssigneeText(m) || '—'}</td>
                      <td style="padding:8px 10px;color:#6b7280;font-family:monospace;font-size:10px;">${m.deadline || '—'}</td>
                      <td style="padding:8px 10px;text-align:center;">
                        <span style="background:${statusColor[m.status] || '#6b7280'}22;color:${statusColor[m.status] || '#6b7280'};border-radius:4px;padding:2px 8px;font-size:10px;font-weight:600;white-space:nowrap;">
                          ${statusLabel[m.status] || m.status}
                        </span>
                      </td>
                      <td style="padding:8px 10px;">
                        <div style="display:flex;align-items:center;gap:6px;">
                          <div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
                            <div style="width:${m.progress||0}%;height:100%;background:${pdfProgressColor(m.progress||0)};border-radius:3px;"></div>
                          </div>
                          <span style="color:${pdfProgressColor(m.progress||0)};font-weight:600;min-width:28px;font-size:10px;">${m.progress||0}%</span>
                        </div>
                      </td>
                    </tr>
                    ${(m.todos || []).length > 0 ? `
                    <tr style="background:#f8faff;">
                      <td colspan="7" style="padding:6px 10px 10px 20px;border-bottom:1px solid #f3f4f6;border-left:3px solid rgba(59,158,222,0.4);">
                        <div style="font-size:9px;font-weight:700;color:#3b9ede;letter-spacing:0.5px;margin-bottom:5px;">☑ MP 檢核步驟 ${(m.todos || []).filter(t => t.done).length}/${(m.todos || []).length}</div>
                        ${(m.todos || []).map((t, ti) => `
                          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
                            <span style="font-size:10px;color:${t.done ? '#16a34a' : '#9ca3af'};flex-shrink:0;font-weight:700;align-self:flex-start;line-height:1.5;">${t.done ? '✓' : '○'}</span>
                            <span style="font-size:10px;flex:1;color:${t.done ? '#9ca3af' : '#374151'};text-decoration:${t.done ? 'line-through' : 'none'};line-height:1.5;word-break:break-word;"><span style="font-size:9px;font-weight:700;color:#d946ef;font-family:monospace;margin-right:4px;">P${gi+1}.${si+1}.${mi+1}.${ti+1}</span>${t.text}</span>
                            ${(getAssigneeText(t) || t.deadline) ? `<div style="display:flex;gap:4px;flex-shrink:0;align-items:center;align-self:center;">${getAssigneeText(t) ? `<span style="font-size:9px;color:#6b7280;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:3px;padding:1px 5px;white-space:nowrap;">👤 ${getAssigneeText(t)}</span>` : ''}${t.deadline ? `<span style="font-size:9px;color:#6b7280;font-family:monospace;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:3px;padding:1px 5px;white-space:nowrap;">📅 ${t.deadline}</span>` : ''}</div>` : ''}
                          </div>`).join('')}
                      </td>
                    </tr>` : ''}
                    `).join('')}
                </tbody>
              </table>` : `<div style="padding:12px 16px;color:#9ca3af;font-size:12px;">（無 Measures）</div>`}
              ${(st.todos || []).length > 0 ? `
              <div style="padding:10px 16px 12px;border-top:1px solid #e5e7eb;background:#fafafa;">
                <div style="font-size:10px;font-weight:700;color:#d97706;letter-spacing:0.8px;margin-bottom:6px;">☑ MP 檢核步驟事項 ${(st.todos || []).filter(t => t.done).length}/${(st.todos || []).length}</div>
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
            collectPage(currentPageHTML)
            currentPageHTML = goalContinuationHTML
            currentPageH = await measureHTML(goalContinuationHTML)
          }
          currentPageHTML += strategyHTML
          currentPageH += stratH
        }
        collectPage(currentPageHTML)
      }
      document.body.removeChild(probe)

      // 第二階段：帶總頁數正式渲染，頁碼嵌入 HTML 由 html2canvas 截圖
      // 總頁數 = 封面(1) + 內容頁 + 封底(1)
      const totalPages = contentPages.length + 2
      const footerHTML = (pageNum) => `
        <div style="position:absolute;bottom:18px;left:48px;right:48px;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#9ca3af;font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif;letter-spacing:0.03em;">
          <span>亞家科技股份有限公司 - OGSM 審計報告</span>
          <span>第 ${pageNum} 頁 / 共 ${totalPages} 頁</span>
        </div>
      `
      const renderPageWithFooter = (html, pageNum) =>
        `<div style="width:794px;min-height:1123px;padding:48px 48px 52px;box-sizing:border-box;background:#fff;position:relative;">${html}${footerHTML(pageNum)}</div>`

      for (let i = 0; i < contentPages.length; i++) {
        container.innerHTML = renderPageWithFooter(contentPages[i], i + 2)
        await new Promise(r => setTimeout(r, 100))
        const canvas = await html2canvas(container.firstChild, {
          scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false
        })
        doc.addPage()
        doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfW, pdfH)
      }

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
      await new Promise((resolve, reject) => {
        if (window.PptxGenJS) return resolve()
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })

      const pres = new window.PptxGenJS()
      pres.layout = 'LAYOUT_WIDE'
      pres.title = project.title + ' OGSM'

      const HDR_BG  = 'F5DEB3'
      const HDR_BD  = '8B6914'
      const OBJ_BG  = 'FEFDF5'
      const CELL_WH = 'FFFFFF'
      const CELL_AL = 'FAFAFA'
      const CELL_MD = 'FFFEF8'
      const CELL_MP = 'F5FFF8'
      const BD      = '999999'
      const TXT     = '1A1A2E'

      const b  = (c = BD, pt = 0.75) => ({ pt, color: c })
      const bH = (pt = 1.2)          => ({ pt, color: HDR_BD })

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

      const frontSlide = pres.addSlide()
      frontSlide.addImage({ data: pptFrontData, x: 0, y: 0, w: 13.33, h: 7.5 })
      frontSlide.addText('亞家科技股份有限公司', { x: 2.3, y: 2.8, w: 8.6, h: 0.9, fontSize: 45, fontFace: 'DFKai-SB', color: '1A1A2E', bold: true, align: 'left', valign: 'middle' })
      frontSlide.addText(`${project.title}`, { x: 2.4, y: 3.7, w: 7.5, h: 0.65, fontSize: 24, fontFace: 'DFKai-SB', color: 'E70012', bold: true, align: 'left', valign: 'middle' })
      frontSlide.addText(`OGSM 策略報告`, { x: 2.45, y: 4.3, w: 5, h: 0.6, fontSize: 17, fontFace: 'DFKai-SB', color: 'E07800', align: 'left', valign: 'middle' })

      for (let gi = 0; gi < project.goals.length; gi++) {
        const goal       = project.goals[gi]
        const strategies = goal.strategies || []

        const rows = []
        strategies.forEach((strat, si) => {
          const ms = strat.measures || []
          if (ms.length === 0) {
            rows.push({ strat, si, measure: null, mi: 0, stratRowCount: 1 })
          } else {
            ms.forEach((m, mi) => rows.push({ strat, si, measure: m, mi, stratRowCount: ms.length }))
          }
        })
        const totalRows = Math.max(rows.length, 1)

        const sl = pres.addSlide()
        sl.background = { color: 'FFFFFF' }

        const MG  = 0.18
        const TW  = 13.33 - MG * 2
        const TX  = MG
        const GW  = TW * 0.152
        const SW  = TW * 0.218
        const MDW = TW * 0.315
        const MPW = TW - GW - SW - MDW
        const GX  = TX
        const SX  = GX + GW
        const MDX = SX + SW
        const MPX = MDX + MDW

        const OBJ_Y  = 0.10
        const OBJ_H  = 0.50
        const HR1_Y  = OBJ_Y + OBJ_H
        const HR1_H  = 0.28
        const HR2_Y  = HR1_Y + HR1_H
        const HR2_H  = 0.26
        const HDR_TOTAL = HR1_H + HR2_H
        const BODY_Y = HR2_Y + HR2_H
        const BODY_AVAIL = 7.5 - BODY_Y - 0.10
        const RH = Math.max(BODY_AVAIL / totalRows, 0.52)

        sl.addShape(pres.shapes.RECTANGLE, { x: TX, y: OBJ_Y, w: TW, h: 0.22, fill: { color: HDR_BG }, line: bH() })
        sl.addText('O：Objective（目標）', { x: TX + 0.08, y: OBJ_Y, w: TW - 0.16, h: 0.22, fontSize: 11, fontFace: 'Microsoft JhengHei', color: '000000', bold: true, align: 'left', valign: 'middle', margin: 0 })
        sl.addShape(pres.shapes.RECTANGLE, { x: TX, y: OBJ_Y + 0.22, w: TW, h: OBJ_H - 0.22, fill: { color: OBJ_BG }, line: bH() })
        sl.addText(`${project.objective || ''}`, { x: TX + 0.08, y: OBJ_Y + 0.22, w: TW - 0.16, h: OBJ_H - 0.24, fontSize: 11, fontFace: 'Microsoft JhengHei', color: TXT, align: 'left', valign: 'middle', margin: 0 })

        sl.addShape(pres.shapes.RECTANGLE, { x: GX, y: HR1_Y, w: GW, h: HDR_TOTAL, fill: { color: HDR_BG }, line: bH() })
        sl.addText('G：Goals（具體目標）', { x: GX + 0.06, y: HR1_Y, w: GW - 0.08, h: HDR_TOTAL, fontSize: 10.5, fontFace: 'Microsoft JhengHei', color: '000000', bold: true, align: 'left', valign: 'middle', margin: 0 })

        sl.addShape(pres.shapes.RECTANGLE, { x: SX, y: HR1_Y, w: SW, h: HDR_TOTAL, fill: { color: HDR_BG }, line: bH() })
        sl.addText('S：Strategies（策略）', { x: SX + 0.06, y: HR1_Y, w: SW - 0.08, h: HDR_TOTAL, fontSize: 10.5, fontFace: 'Microsoft JhengHei', color: '000000', bold: true, align: 'left', valign: 'middle', margin: 0 })

        sl.addShape(pres.shapes.RECTANGLE, { x: MDX, y: HR1_Y, w: MDW + MPW, h: HR1_H, fill: { color: HDR_BG }, line: bH() })
        sl.addText('M：Measures（衡量指標）', { x: MDX + 0.06, y: HR1_Y, w: MDW + MPW - 0.08, h: HR1_H, fontSize: 10.5, fontFace: 'Microsoft JhengHei', color: '000000', bold: true, align: 'left', valign: 'middle', margin: 0 })

        ;[ { x: MDX, w: MDW, label: 'MD（定量指標）' }, { x: MPX, w: MPW, label: 'MP（檢核指標）' } ].forEach(({ x, w, label }) => {
          sl.addShape(pres.shapes.RECTANGLE, { x, y: HR2_Y, w, h: HR2_H, fill: { color: HDR_BG }, line: bH() })
          sl.addText(label, { x: x + 0.06, y: HR2_Y, w: w - 0.08, h: HR2_H, fontSize: 10, fontFace: 'Microsoft JhengHei', color: '000000', bold: true, align: 'left', valign: 'middle', margin: 0 })
        })

        const goalBodyH = RH * totalRows
        sl.addShape(pres.shapes.RECTANGLE, { x: GX, y: BODY_Y, w: GW, h: goalBodyH, fill: { color: CELL_WH }, line: b() })
        sl.addText([
          { text: `G${gi + 1}\n`, options: { bold: true, color: '7A4F00', fontSize: 12, breakLine: true } },
          { text: goal.text || '', options: { bold: true, color: TXT, fontSize: 14 } },
        ], { x: GX + 0.07, y: BODY_Y + 0.06, w: GW - 0.12, h: goalBodyH - 0.1, fontFace: 'Microsoft JhengHei', align: 'left', valign: 'middle', margin: 0 })

        const stratSpans = []
        let rIdx = 0
        strategies.forEach((strat, si) => {
          const cnt = Math.max((strat.measures || []).length, 1)
          stratSpans.push({ startRow: rIdx, rowCount: cnt })
          rIdx += cnt
        })

        const mdItems = []
        const mpItems = []

        strategies.forEach((strat, si) => {
          ;(strat.measures || []).forEach((m, mi) => {
            mdItems.push({ num: `D${gi + 1}.${si + 1}.${mi + 1}`, text: m.kpi || '—', target: m.target || '', deadline: m.deadline || '', assignee: getAssigneeText(m) })
            ;(m.todos || []).forEach((t, ti) => {
              mpItems.push({ num: `P${gi + 1}.${si + 1}.${mi + 1}.${ti + 1}`, text: t.text, done: t.done, deadline: t.deadline || '', assignee: getAssigneeText(t) })
            })
          })
        })

        const sParts = []
        strategies.forEach((strat, si) => {
          const isLast = si === strategies.length - 1
          sParts.push({ text: `S${gi + 1}.${si + 1} `, options: { bold: true, color: '1A4A8A', fontSize: 12 } })
          sParts.push({ text: strat.text || '', options: { color: TXT, fontSize: 13, breakLine: true, paraSpaceAfter: 0 } })
          sParts.push({ text: ' ', options: { color: TXT, fontSize: 9, breakLine: !isLast, paraSpaceAfter: isLast ? 0 : 30 } })
        })
        sl.addShape(pres.shapes.RECTANGLE, { x: SX, y: BODY_Y, w: SW, h: goalBodyH, fill: { color: CELL_AL }, line: b() })
        if (sParts.length > 0) {
          sl.addText(sParts, { x: SX + 0.07, y: BODY_Y + 0.08, w: SW - 0.12, h: goalBodyH - 0.14, fontFace: 'Microsoft JhengHei', align: 'left', valign: 'middle', margin: 0, lineSpacingMultiple: 1.3 })
        }

        sl.addShape(pres.shapes.RECTANGLE, { x: MDX, y: BODY_Y, w: MDW, h: goalBodyH, fill: { color: CELL_MD }, line: b() })
        const mdParts = []
        mdItems.forEach((item, idx) => {
          const isLast = idx === mdItems.length - 1
          const hasMeta = item.deadline || item.assignee
          const fmtDate = item.deadline ? item.deadline.replace(/-/g, '/') : ''
          const metaLine = [fmtDate ? `[期限 ${fmtDate}]` : '', item.assignee ? `負責人員: ${item.assignee}` : ''].filter(Boolean).join('  ')
          mdParts.push({ text: item.num + ' ', options: { bold: true, color: '7A4000', fontSize: 10 } })
          mdParts.push({ text: item.text, options: { color: '000000', fontSize: 11, breakLine: true, paraSpaceAfter: 0 } })
          if (item.target) {
            mdParts.push({ text: `目標值：${item.target}`, options: { color: '1A6A1A', fontSize: 9, bold: true, breakLine: true, paraSpaceAfter: 0 } })
          }
          mdParts.push({ text: hasMeta ? metaLine : ' ', options: { color: '7A6030', fontSize: 9, breakLine: !isLast, paraSpaceAfter: isLast ? 0 : 15 } })
        })
        if (mdParts.length > 0) {
          sl.addText(mdParts, { x: MDX + 0.08, y: BODY_Y + 0.08, w: MDW - 0.14, h: goalBodyH - 0.14, fontFace: 'Microsoft JhengHei', align: 'left', valign: 'middle', margin: 0, lineSpacingMultiple: 1.2 })
        }

        // ── MP 欄：基於實測每行字數計算換行，固定間距，垂直置中 ────────────
        // 實測基準：「P3.2.1.2 建立 N1 錯題資料庫，將聽力與閱讀錯誤類型分類標記，」
        // 此句（含編號）恰好填滿一行，正文部分約 28 個中文字
        const MP_FONT_MAIN  = 10
        const MP_FONT_META  = 8
        const MP_FONT_NUM   = 10
        const MP_PAD_MIN    = 0.08
        const MP_GAP_H      = 0.10        // 項目間固定間距（inch）
        // 10pt * lineSpacingMultiple 1.1 / 72 = 0.1528，再加字型 internal leading 約 15%
        const MP_LINE_H     = (10 / 72) * 1.1 * 1.15   // ≈ 0.176 inch
        const MP_META_H     = (8  / 72) * 1.1 * 1.15   // ≈ 0.141 inch

        // 計算文字的加權寬度（單位：中文字寬）
        const calcTextWidth = (str) => {
          let w = 0
          for (const ch of (str || '')) {
            const code = ch.codePointAt(0)
            if (code >= 0x4E00 && code <= 0x9FFF) w += 1.0        // 中文字
            else if (code >= 0xFF00 && code <= 0xFFEF) w += 1.0    // 全形符號
            else if ('，。！？；：「」『』【】、（）'.includes(ch)) w += 1.0  // 全形標點
            else if (ch >= 'A' && ch <= 'Z') w += 0.55             // 大寫英文
            else if (ch >= 'a' && ch <= 'z') w += 0.50             // 小寫英文
            else if (ch >= '0' && ch <= '9') w += 0.50             // 數字
            else if (ch === '+') w += 0.50
            else if (ch === '-') w += 0.45
            else if (ch === '.') w += 0.30
            else if (ch === ' ') w += 0.25
            else if (ch === '(' || ch === ')') w += 0.30           // 半形括號
            else w += 0.50                                          // 其他半形
          }
          return w
        }

        // 基準（新比重）：
        //   第一行正文「建立 N1 錯題資料庫，將聽力與閱讀錯誤類型分類標記」= 24.3
        //   第二行上限「動以加速首批用戶獲取，(測試文字+1，測試文字+1+2，測試)2」= 25.1
        const MP_FIRST_LINE_CAP = 24.3
        const MP_CHARS_PER_LINE = 25.1

        const calcLines = (item) => {
          const textW = calcTextWidth(item.text || '')
          if (textW <= MP_FIRST_LINE_CAP) return 1
          return 1 + Math.ceil((textW - MP_FIRST_LINE_CAP) / MP_CHARS_PER_LINE)
        }

        const mainH = (item) => calcLines(item) * MP_LINE_H

        const hasMeta = (item) => !!(item.deadline || item.assignee)

        const itemTotalH = (item, isLast) =>
          mainH(item) + (hasMeta(item) ? MP_META_H : 0) + (isLast ? 0 : MP_GAP_H)

        // 切分 chunk
        const mpAvailH = goalBodyH - MP_PAD_MIN * 2
        const mpChunks = [[]]
        let mpChunkH = 0
        mpItems.forEach(item => {
          const h = itemTotalH(item, false)
          if (mpChunkH + h > mpAvailH && mpChunks[mpChunks.length - 1].length > 0) {
            mpChunks.push([])
            mpChunkH = 0
          }
          mpChunks[mpChunks.length - 1].push(item)
          mpChunkH += h
        })
        if (mpChunks.length === 0) mpChunks.push([])

        const renderMpChunk = (slide, chunk, colX, colW) => {
          if (chunk.length === 0) return
          const totalH = chunk.reduce((s, item, idx) =>
            s + itemTotalH(item, idx === chunk.length - 1), 0)
          const startY = BODY_Y + Math.max(MP_PAD_MIN, (goalBodyH - totalH) / 2)
          const textX  = colX + 0.08
          const textW  = colW - 0.16

          let curY = startY
          chunk.forEach((item, idx) => {
            const isLast = idx === chunk.length - 1
            const mH     = mainH(item)
            const fmtDate = item.deadline ? item.deadline.replace(/-/g, '/') : ''
            const metaTxt = [
              fmtDate       ? `[期限 ${fmtDate}]`         : '',
              item.assignee ? `負責人員: ${item.assignee}` : '',
            ].filter(Boolean).join('  ')

            slide.addText(
              [
                { text: item.num + ' ', options: { bold: true, color: '1A4A2E', fontSize: MP_FONT_NUM } },
                { text: item.text || '', options: { color: '000000', fontSize: MP_FONT_MAIN } },
              ],
              { x: textX, y: curY, w: textW, h: mH,
                fontFace: 'Microsoft JhengHei', align: 'left', valign: 'top',
                margin: 0, lineSpacingMultiple: 1.1 }
            )
            curY += mH

            if (metaTxt) {
              slide.addText(metaTxt, {
                x: textX, y: curY, w: textW, h: MP_META_H,
                fontFace: 'Microsoft JhengHei', fontSize: MP_FONT_META,
                color: '1A4A2E', align: 'left', valign: 'top', margin: 0,
              })
              curY += MP_META_H
            }

            if (!isLast) curY += MP_GAP_H
          })
        }

        sl.addShape(pres.shapes.RECTANGLE, { x: MPX, y: BODY_Y, w: MPW, h: goalBodyH, fill: { color: CELL_MP }, line: b() })
        renderMpChunk(sl, mpChunks[0], MPX, MPW)

        sl.addShape(pres.shapes.RECTANGLE, { x: TX, y: OBJ_Y, w: TW, h: OBJ_H + HDR_TOTAL + RH * totalRows, fill: { type: 'none' }, line: { color: HDR_BD, pt: 1.8 } })
        sl.addText(`${project.title}　·　G${gi + 1} / ${project.goals.length}`, { x: MG, y: 7.36, w: TW, h: 0.16, fontSize: 9, fontFace: 'Microsoft JhengHei', color: 'AAAAAA', align: 'left', valign: 'middle', margin: 0 })

        for (let ci = 1; ci < mpChunks.length; ci++) {
          const ovSl = pres.addSlide()
          ovSl.background = { color: 'FFFFFF' }
          ovSl.addShape(pres.shapes.RECTANGLE, { x: TX, y: OBJ_Y, w: TW, h: 0.22, fill: { color: HDR_BG }, line: bH() })
          ovSl.addText('O：Objective（目標）', { x: TX + 0.08, y: OBJ_Y, w: TW - 0.16, h: 0.22, fontSize: 11, fontFace: 'Microsoft JhengHei', color: '000000', bold: true, align: 'left', valign: 'middle', margin: 0 })
          ovSl.addShape(pres.shapes.RECTANGLE, { x: TX, y: OBJ_Y + 0.22, w: TW, h: OBJ_H - 0.22, fill: { color: OBJ_BG }, line: bH() })
          ovSl.addText(`${project.objective || ''}`, { x: TX + 0.08, y: OBJ_Y + 0.22, w: TW - 0.16, h: OBJ_H - 0.24, fontSize: 11, fontFace: 'Microsoft JhengHei', color: TXT, align: 'left', valign: 'middle', margin: 0 })
          ovSl.addShape(pres.shapes.RECTANGLE, { x: GX, y: HR1_Y, w: GW, h: HDR_TOTAL, fill: { color: HDR_BG }, line: bH() })
          ovSl.addText('G：Goals（具體目標）', { x: GX + 0.06, y: HR1_Y, w: GW - 0.08, h: HDR_TOTAL, fontSize: 10.5, fontFace: 'Microsoft JhengHei', color: '000000', bold: true, align: 'left', valign: 'middle', margin: 0 })
          ovSl.addShape(pres.shapes.RECTANGLE, { x: SX, y: HR1_Y, w: SW, h: HDR_TOTAL, fill: { color: HDR_BG }, line: bH() })
          ovSl.addText('S：Strategies（策略）', { x: SX + 0.06, y: HR1_Y, w: SW - 0.08, h: HDR_TOTAL, fontSize: 10.5, fontFace: 'Microsoft JhengHei', color: '000000', bold: true, align: 'left', valign: 'middle', margin: 0 })
          ovSl.addShape(pres.shapes.RECTANGLE, { x: MDX, y: HR1_Y, w: MDW + MPW, h: HR1_H, fill: { color: HDR_BG }, line: bH() })
          ovSl.addText('M：Measures（衡量指標）', { x: MDX + 0.06, y: HR1_Y, w: MDW + MPW - 0.08, h: HR1_H, fontSize: 10.5, fontFace: 'Microsoft JhengHei', color: '000000', bold: true, align: 'left', valign: 'middle', margin: 0 })
          ;[ { x: MDX, w: MDW, label: 'MD（定量指標）' }, { x: MPX, w: MPW, label: 'MP（檢核指標）（續）' } ].forEach(({ x, w, label }) => {
            ovSl.addShape(pres.shapes.RECTANGLE, { x, y: HR2_Y, w, h: HR2_H, fill: { color: HDR_BG }, line: bH() })
            ovSl.addText(label, { x: x + 0.06, y: HR2_Y, w: w - 0.08, h: HR2_H, fontSize: 10, fontFace: 'Microsoft JhengHei', color: '000000', bold: true, align: 'left', valign: 'middle', margin: 0 })
          })

          ovSl.addShape(pres.shapes.RECTANGLE, { x: GX, y: BODY_Y, w: GW, h: goalBodyH, fill: { color: CELL_WH }, line: b() })
          ovSl.addText([ { text: `G${gi + 1}\n`, options: { bold: true, color: '7A4F00', fontSize: 12, breakLine: true } }, { text: goal.text || '', options: { bold: true, color: TXT, fontSize: 14 } } ], { x: GX + 0.07, y: BODY_Y + 0.06, w: GW - 0.12, h: goalBodyH - 0.1, fontFace: 'Microsoft JhengHei', align: 'left', valign: 'middle', margin: 0 })
          ovSl.addShape(pres.shapes.RECTANGLE, { x: SX, y: BODY_Y, w: SW, h: goalBodyH, fill: { color: CELL_AL }, line: b() })
          if (sParts.length > 0) { ovSl.addText(sParts, { x: SX + 0.07, y: BODY_Y + 0.08, w: SW - 0.12, h: goalBodyH - 0.14, fontFace: 'Microsoft JhengHei', align: 'left', valign: 'middle', margin: 0, lineSpacingMultiple: 1.3 }) }
          ovSl.addShape(pres.shapes.RECTANGLE, { x: MDX, y: BODY_Y, w: MDW, h: goalBodyH, fill: { color: CELL_MD }, line: b() })
          if (mdParts.length > 0) { ovSl.addText(mdParts, { x: MDX + 0.08, y: BODY_Y + 0.08, w: MDW - 0.14, h: goalBodyH - 0.14, fontFace: 'Microsoft JhengHei', align: 'left', valign: 'middle', margin: 0, lineSpacingMultiple: 1.2 }) }
          ovSl.addShape(pres.shapes.RECTANGLE, { x: MPX, y: BODY_Y, w: MPW, h: goalBodyH, fill: { color: CELL_MP }, line: b() })
          if (mpChunks[ci].length > 0) { renderMpChunk(ovSl, mpChunks[ci], MPX, MPW) }
          ovSl.addShape(pres.shapes.RECTANGLE, { x: TX, y: OBJ_Y, w: TW, h: OBJ_H + HDR_TOTAL + RH * totalRows, fill: { type: 'none' }, line: { color: HDR_BD, pt: 1.8 } })
          ovSl.addText(`${project.title}　·　G${gi + 1} / ${project.goals.length}　（MP 續 ${ci}）`, { x: MG, y: 7.36, w: TW, h: 0.16, fontSize: 9, fontFace: 'Microsoft JhengHei', color: 'AAAAAA', align: 'left', valign: 'middle', margin: 0 })
        }

      } 

      const backSlide = pres.addSlide()
      backSlide.addImage({ data: pptBackData, x: 0, y: 0, w: 13.33, h: 7.5 })

      const safe = (project.title || 'Project').replace(/[/\\?%*:|"<>]/g, '_')
      await pres.writeFile({ fileName: `OGSM_${safe}.pptx` })

    } catch (err) {
      console.error('PPT generation error:', err)
      alert('PPT 生成失敗：' + err.message)
    } finally {
      setPptLoading(false)
    }
  }

  // ============================================================================
  // React UI 渲染區 (注入 Brutalist 美學)
  // ============================================================================

  return (
    <>
      <style>{`
        @keyframes auditExpandPanel {
          0%   { transform: scale(0.08); opacity: 0.6; }
          100% { transform: scale(1);    opacity: 1; }
        }
        .audit-pdf-btn, .audit-ppt-btn {
          text-transform: uppercase;
          transition: all 0.1s ease-out !important;
          transform: translate(0px, 0px);
        }
        .audit-pdf-btn:hover:not(:disabled), .audit-ppt-btn:hover:not(:disabled) {
          transform: translate(-2px, -2px) !important;
        }
        .audit-pdf-btn:active:not(:disabled), .audit-ppt-btn:active:not(:disabled) {
          transform: translate(2px, 2px) !important;
        }
        .audit-close-btn:hover {
          color: ${ACCENT_PINK} !important;
        }
      `}</style>

      {/* 遮罩 */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', zIndex: 400 }} onClick={onClose} />

      {/* Brutalist Panel */}
      {(() => {
        const vw = window.innerWidth, vh = window.innerHeight
        const panelW = 800
        const originX = originRect
          ? `${Math.max(0, originRect.left + originRect.width / 2 - (vw - panelW))}px`
          : `${panelW}px`
        const originY = originRect
          ? `${originRect.top + originRect.height / 2}px`
          : '50px'
        return (
          <div style={{
            ...s.panel,
            overflow: 'visible',
            transformOrigin: `${originX} ${originY}`,
            animation: 'auditExpandPanel 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}>
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
              <BrutalistBackground dark={darkMode} bgConfig={bgConfig} />

        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={s.headerTag}>[ AUDIT REPORT ]</div>
            <div style={s.headerTitle}>{project.title}</div>
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            {/* PPT 按鈕 */}
            <button
              className="audit-ppt-btn"
              onClick={generatePPT}
              disabled={pptLoading}
              title="匯出 PPT"
              style={{
                width: '48px', height: '48px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '2px',
                background: pptHovered ? '#FFFF00' : (darkMode ? '#1a1a1a' : '#fff'),
                border: `3px solid ${T.border}`,
                color: pptHovered ? '#000' : T.text,
                boxShadow: darkMode ? '4px 4px 0 0 rgba(255,255,255,0.2)' : '4px 4px 0 0 #000',
                opacity: pptLoading ? 0.5 : 1,
                transition: 'all 0.15s',
                cursor: pptLoading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => {
                if (pptLoading) return;
                setPptHovered(true);
                e.currentTarget.style.boxShadow = darkMode ? '6px 6px 0 0 rgba(255,255,255,0.2)' : '6px 6px 0 0 #000';
              }}
              onMouseLeave={e => {
                setPptHovered(false);
                e.currentTarget.style.transform = 'translate(0px, 0px)';
                e.currentTarget.style.boxShadow = darkMode ? '4px 4px 0 0 rgba(255,255,255,0.2)' : '4px 4px 0 0 #000';
              }}
              onMouseDown={e => {
                if (pptLoading) return;
                e.currentTarget.style.transform = 'translate(2px, 2px)';
                e.currentTarget.style.boxShadow = darkMode ? '2px 2px 0 0 rgba(255,255,255,0.2)' : '2px 2px 0 0 #000';
              }}
              onMouseUp={e => {
                if (pptLoading) return;
                e.currentTarget.style.transform = 'translate(-2px, -2px)';
                e.currentTarget.style.boxShadow = darkMode ? '6px 6px 0 0 rgba(255,255,255,0.2)' : '6px 6px 0 0 #000';
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>📽️</span>
              <span style={{ fontSize: '11px', fontWeight: 900, fontFamily: '"Space Grotesk", monospace', letterSpacing: '0.05em' }}>
                {pptLoading ? '...' : 'PPT'}
              </span>
            </button>

            {/* PDF 按鈕 */}
            <button
              className="audit-pdf-btn"
              onClick={generatePDF}
              disabled={pdfLoading}
              title="匯出 PDF"
              style={{
                width: '48px', height: '48px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '2px',
                background: pdfHovered ? '#FF0000' : (darkMode ? '#1a1a1a' : '#fff'),
                border: `3px solid ${T.border}`,
                color: pdfHovered ? '#fff' : T.text,
                boxShadow: darkMode ? '4px 4px 0 0 rgba(255,255,255,0.2)' : '4px 4px 0 0 #000',
                opacity: pdfLoading ? 0.5 : 1,
                transition: 'all 0.15s',
                cursor: pdfLoading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => {
                if (pdfLoading) return;
                setPdfHovered(true);
                e.currentTarget.style.boxShadow = darkMode ? '6px 6px 0 0 rgba(255,255,255,0.2)' : '6px 6px 0 0 #000';
              }}
              onMouseLeave={e => {
                setPdfHovered(false);
                e.currentTarget.style.transform = 'translate(0px, 0px)';
                e.currentTarget.style.boxShadow = darkMode ? '4px 4px 0 0 rgba(255,255,255,0.2)' : '4px 4px 0 0 #000';
              }}
              onMouseDown={e => {
                if (pdfLoading) return;
                e.currentTarget.style.transform = 'translate(2px, 2px)';
                e.currentTarget.style.boxShadow = darkMode ? '2px 2px 0 0 rgba(255,255,255,0.2)' : '2px 2px 0 0 #000';
              }}
              onMouseUp={e => {
                if (pdfLoading) return;
                e.currentTarget.style.transform = 'translate(-2px, -2px)';
                e.currentTarget.style.boxShadow = darkMode ? '6px 6px 0 0 rgba(255,255,255,0.2)' : '6px 6px 0 0 #000';
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>📄</span>
              <span style={{ fontSize: '11px', fontWeight: 900, fontFamily: '"Space Grotesk", monospace', letterSpacing: '0.05em' }}>
                {pdfLoading ? '...' : 'PDF'}
              </span>
            </button>

            <button className="audit-close-btn" style={s.closeBtn} onClick={onClose}
              onMouseEnter={e => { if (pptLoading || pdfLoading) return; e.currentTarget.style.color = ACCENT_PINK; }}
              onMouseLeave={e => { e.currentTarget.style.color = T.text; }}
            >✕</button>
          </div>
        </div>

        <div style={s.body}>

          {/* ── 整體完成度 (卡片去除圓角、加上粗邊框) ── */}
          <div style={s.card}>
            <div style={s.cardTitle}>OVERALL PROGRESS</div>
            <div style={s.bigPct}>
              <span style={{ color: overallColor, fontSize: '56px', fontFamily: '"Space Grotesk", "Syne", sans-serif', fontWeight: 900, lineHeight: 1, textShadow: `2px 2px 0 #000` }}>{overall}</span>
              <span style={{ color: T.text, fontSize: '24px', fontWeight: 900, alignSelf: 'flex-end', marginBottom: '6px' }}>%</span>
            </div>
            <ProgressBar value={overall} color={overallColor} height={16} trackColor={T.bg} borderColor={T.border} />
            <div style={{ marginTop: '16px' }}>
              <StatusDots counts={totalCounts} />
            </div>
            <div style={s.statsRow}>
              {[
                { num: allMeasures.length, label: 'MD 總數', color: T.text },
                { num: totalCounts.Completed, label: '已完成', color: ACCENT_GREEN },
                { num: totalCounts.InProgress, label: '進行中', color: ACCENT_CYAN },
                { num: totalCounts.Overdue, label: '已逾期', color: ACCENT_PINK },
              ].map(({ num, label, color }) => (
                <div key={label} style={s.statBox}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = darkMode ? '6px 6px 0 0 rgba(255,255,255,0.2)' : '6px 6px 0 0 #000'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0px,0px)'; e.currentTarget.style.boxShadow = darkMode ? '4px 4px 0 0 rgba(255,255,255,0.2)' : '4px 4px 0 0 #000'; }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = darkMode ? '2px 2px 0 0 rgba(255,255,255,0.2)' : '2px 2px 0 0 #000'; }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = darkMode ? '6px 6px 0 0 rgba(255,255,255,0.2)' : '6px 6px 0 0 #000'; }}
                >
                  <div style={{ ...s.statNum, color }}>{num}</div>
                  <div style={s.statLabel}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Objective 標籤式設計 ── */}
          <div style={s.objectiveBox}>
            <div style={s.oTag}>OBJECTIVE</div>
            <div style={s.oText}>&emsp;&emsp;{project.objective}</div>
          </div>

          {/* ── Todo 完成率 ── */}
          {todoStats.total > 0 && (
            <div style={{ ...s.card, padding: '16px 20px', background: 'transparent', borderColor: ACCENT_PINK }}>
              <div style={{...s.cardTitle, color: ACCENT_PINK}}>☑ MP Validation Steps</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <ProgressBar value={todoStats.pct} color={ACCENT_PINK} height={10} trackColor='transparent' borderColor={ACCENT_PINK} />
                </div>
                <span style={{ fontSize: '18px', fontFamily: '"Space Grotesk", "DM Mono", monospace', fontWeight: 900, color: ACCENT_PINK, minWidth: '48px' }}>
                  {todoStats.pct}%
                </span>
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', fontFamily: '"DM Mono", monospace', color: T.text, fontWeight: 700 }}>
                已完成 {todoStats.done} / {todoStats.total} 項 MP 檢核步驟
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
                <div style={{...s.goalHeader, background: isExpanded ? (darkMode ? '#000' : '#E0E0E0') : 'transparent'}} onClick={() => toggleGoal(gi)}>
                  <div style={{...s.goalBadge, background: goalColor, color: '#000', borderColor: '#000'}}>G{gi + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={s.goalText}>{goal.text || '(未命名)'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <ProgressBar value={goalProgress} color={goalColor} height={8} trackColor={T.bg} borderColor={T.border} />
                      </div>
                      <span style={{ fontSize: '14px', fontFamily: '"Space Grotesk", monospace', fontWeight: 900, color: goalColor, minWidth: '34px' }}>
                        {goalProgress}%
                      </span>
                    </div>
                  </div>
                  <div 
                    style={{
                      ...s.expandBtn,
                      background: isExpanded ? goalColor : 'transparent',
                      color: isExpanded ? '#000' : T.text,
                      borderColor: T.border
                    }}
                  >
                    {isExpanded ? '－' : '＋'}
                  </div>
                </div>

                {/* Strategies */}
                {isExpanded && (
                  <div style={{ backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
                  {goal.strategies.map((st, si) => {
                  const stProgress = calcProgress(st.measures)
                  const stColor    = progressColor(stProgress)

                  return (
                    <div key={st.id ?? si} style={{ ...s.stratCard, borderTop: si === 0 ? 'none' : `4px solid #224d98` }}>
                      <div style={s.stratHeader}>
                        <span style={{...s.stratBadge, background: T.border, color: T.bg}}>S{gi + 1}.{si + 1}</span>
                        <span style={s.stratText}>{st.text || '(未命名)'}</span>
                        <span style={{ fontSize: '13px', fontFamily: '"Space Grotesk", monospace', color: stColor, flexShrink: 0, fontWeight: 900 }}>
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
                              <span style={{ ...s.mCol, width: '80px' }}>負責人</span>
                              <span style={{ ...s.mCol, width: '80px' }}>期限</span>
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
                                  <div
                                    style={{
                                      ...s.mRow,
                                      borderBottom: mi === st.measures.length - 1 ? 'none' : s.mRow.borderBottom,
                                      cursor: hasTodos ? 'pointer' : 'default',
                                      background: todosOpen ? (darkMode ? 'rgba(255,0,255,0.06)' : 'rgba(255,0,255,0.04)') : 'transparent',
                                      borderLeft: hasTodos ? `3px solid ${todosOpen ? ACCENT_PINK : 'transparent'}` : '3px solid transparent',
                                      transition: 'background 0.15s, border-color 0.15s',
                                    }}
                                    onClick={() => hasTodos && toggleMeasureTodo(todoKey)}
                                  >
                                    <span style={{ ...s.mCell, flex: 2, fontWeight: 700 }}>
                                      <span style={{ fontSize: '10px', fontFamily: '"Space Grotesk", monospace', fontWeight: 900, color: ACCENT_ORANGE, marginRight: '6px', flexShrink: 0 }}>D{gi+1}.{si+1}.{mi+1}</span>{m.kpi || '—'}
                                    </span>
                                    <span style={{ ...s.mCell, flex: 1.2, color: ACCENT_ORANGE }}>{m.target || '—'}</span>
                                    <span style={{ ...s.mCell, flex: 0.8, color: ACCENT_GREEN }}>{m.actual || '—'}</span>
                                    <span style={{ ...s.mCell, width: '80px' }}>{getAssigneeText(m) || '—'}</span>
                                    <span style={{ ...s.mCell, width: '80px' }}>{m.deadline || '—'}</span>
                                    <span style={{ ...s.mCell, width: '70px' }}>
                                      <span style={{ color: sc.color, fontWeight: 900 }}>{sc.label}</span>
                                    </span>
                                    <span style={{ ...s.mCell, width: '80px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <div style={{ flex: 1 }}>
                                          <ProgressBar value={m.progress || 0} color={pc} height={6} trackColor='transparent' borderColor={T.border} />
                                        </div>
                                        <span style={{ fontSize: '10px', fontWeight: 900, fontFamily: '"Space Grotesk", monospace', color: pc, flexShrink: 0, minWidth: '28px', textAlign: 'right' }}>{m.progress || 0}%</span>
                                      </div>
                                    </span>
                                    {stratHasTodos && (
                                      <span style={{ ...s.mCell, width: '36px', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {hasTodos ? (
                                          <span style={{
                                            fontSize: '10px', fontFamily: '"Space Grotesk", monospace', fontWeight: 900,
                                            color: todosOpen ? ACCENT_PINK : (darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'),
                                            transition: 'color 0.15s, transform 0.15s',
                                            display: 'inline-block',
                                            transform: todosOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                                          }}>▶</span>
                                        ) : null}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* MP Todos Area */}
                                  {hasTodos && todosOpen && (
                                    <div style={{
                                      padding: '12px 16px',
                                      background: 'transparent',
                                      borderTop: `2px solid ${T.border}`,
                                      borderBottom: mi === st.measures.length - 1 ? 'none' : `2px solid ${T.border}`,
                                    }}>
                                      <div style={{ fontSize: '11px', fontFamily: '"Space Grotesk", monospace', fontWeight: 900, color: ACCENT_PINK, marginBottom: '8px' }}>
                                        [ MP CHECKLIST {doneCount}/{totalTodos} ]
                                      </div>
                                      {(m.todos || []).map((t, ti) => {
                                        const tOverdue = t.deadline && t.deadline < (() => { const _n = new Date(); return `${_n.getFullYear()}-${String(_n.getMonth()+1).padStart(2,'0')}-${String(_n.getDate()).padStart(2,'0')}` })() && !t.done
                                        return (
                                        <div key={t.id ?? ti} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                                          <span style={{ fontSize: '14px', flexShrink: 0, fontWeight: 900, color: t.done ? ACCENT_GREEN : T.text }}>{t.done ? '✓' : '□'}</span>
                                          <span style={{ fontSize: '13px', flex: 1, color: t.done ? '#888' : T.text, textDecoration: t.done ? 'line-through' : 'none', fontWeight: 600 }}>
                                            <span style={{ fontSize: '10px', fontFamily: '"Space Grotesk", monospace', fontWeight: 900, color: ACCENT_PINK, marginRight: '6px' }}>P{gi+1}.{si+1}.{mi+1}.{ti+1}</span>{t.text}
                                          </span>
                                          {!!(getAssigneeText(t) || t.deadline) && (
                                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                              {getAssigneeText(t) && <span style={{ fontSize: '10px', background: T.border, color: T.bg, padding: '2px 6px', fontWeight: 700 }}>{getAssigneeText(t)}</span>}
                                              {t.deadline && <span style={{ fontSize: '10px', background: tOverdue ? '#dd1717' : T.border, color: tOverdue ? '#000' : T.bg, padding: '2px 6px', fontWeight: 900 }}>{tOverdue ? '⚠ ' : ''}{t.deadline}</span>}
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
                )}
              </div>
            )
          })}
        </div>
      </div>
            </div>
        )
      })()}
    </>
  )
}

// ─── STYLES ENGINE (去圓角、粗線條、硬陰影、網格背景) ───
function buildAuditStyles(dark) {
  const T = {
    bg: dark ? '#121212' : '#f8f9fa',
    border: dark ? '#b7b6b6' : '#000000',
    text: dark ? '#FFFFFF' : '#000000',
    goalBs: dark ? '#606060' : '#000000',
    textMuted: dark ? '#888888' : '#666666'
  }

  return {
    backdrop: { 
      position: 'fixed', inset: 0, 
      background: 'transparent',
      zIndex: 400 
    },
    panel: {
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: '800px', maxWidth: '95vw',
      background: dark ? 'rgba(18,18,18,0.92)' : 'rgba(246,246,246,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderLeft: `2px solid ${T.border}`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', // 【關鍵防呆】防止星星動畫導致溢出螢幕左側
      zIndex: 401,
      animation: 'slideInRight 0.25s ease',
    },

    header: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 28px', 
      borderBottom: `1px solid ${T.border}`, 
      flexShrink: 0,
      position: 'relative', zIndex: 1
    },
    headerTag: { fontSize: '14px', fontFamily: '"Space Grotesk", monospace', color: ACCENT_BLUE, fontWeight: 900, letterSpacing: '2px', marginBottom: '6px' },
    headerTitle: { fontFamily: '"Space Grotesk", "Syne", sans-serif', fontWeight: 900, fontSize: '22px', color: T.text, textTransform: 'uppercase' },
    
    closeBtn: { background: 'transparent', border: 'none', color: T.text, cursor: 'pointer', fontSize: '20px', padding: '0', fontWeight: 900, width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'color 0.1s ease-out' },
    pdfBtn: {
      background: 'transparent',
      border: `2px solid ${T.border}`,
      color: T.text,
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 900,
      padding: '8px 16px',
      borderRadius: '0', // 移除圓角
      fontFamily: '"Space Grotesk", "Noto Sans TC", sans-serif',
    },

    body: { flex: 1, overflowY: 'scroll', padding: '24px 28px 60px', display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', zIndex: 1 },

    card: { background: 'transparent', border: `3px solid ${T.border}`, borderRadius: '0', padding: '24px', boxShadow: `6px 6px 0 ${ACCENT_BLUE}` },
    cardTitle: { fontSize: '14px', fontFamily: '"Space Grotesk", monospace', color: T.text, fontWeight: 900, letterSpacing: '1px', marginBottom: '16px' },
    bigPct: { display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '16px' },

    statsRow: { display: 'flex', gap: '12px', marginTop: '20px' },
    statBox: { flex: 1, background: 'transparent', border: `3px solid ${T.border}`, padding: '12px', textAlign: 'center', boxShadow: dark ? '4px 4px 0 0 rgba(255,255,255,0.2)' : '4px 4px 0 0 #000', transition: 'all 0.1s ease-out', transform: 'translate(0px,0px)' },
    statNum: { fontSize: '28px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: T.text, lineHeight: 1 },
    statLabel: { fontSize: '11px', fontFamily: '"Space Grotesk", monospace', color: T.text, marginTop: '8px', fontWeight: 700 },

    objectiveBox: {
      display: 'flex', flexDirection: 'column', gap: '8px',
      background: ACCENT_ORANGE, border: `3px solid #000`, boxShadow: `4px 4px 0 #000`,
      padding: '20px',
    },
    oTag: { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 1000, color: '#000', fontSize: '22px' },
    oText: { fontSize: '14px', color: '#000', lineHeight: 1.6, fontWeight: 650 },

    goalCard: { background: 'transparent', border: `3px solid ${T.border}`, borderRadius: '0', boxShadow: `6px 6px 0 ${T.goalBs}` },
    goalHeader: { display: 'flex', gap: '16px', padding: '20px', borderBottom: `3px solid ${T.border}`, alignItems: 'flex-start', cursor: 'pointer' },
    goalBadge: {
      width: '36px', height: '36px',
      border: `2px solid ${T.border}`, borderRadius: '0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '14px', fontFamily: '"Space Grotesk", monospace', fontWeight: 900,
      flexShrink: 0,
    },
    goalText: { fontSize: '16px', fontWeight: 900, color: T.text, lineHeight: 1.5 },

    stratCard: { padding: '0', borderTop: `4px solid #224d98` },
    stratHeader: { display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 20px', borderBottom: `2px solid ${T.border}`, background: dark ? 'rgba(34,77,152,0.18)' : 'rgba(34,77,152,0.07)' },
    stratBadge: { fontSize: '12px', fontFamily: '"Space Grotesk", monospace', padding: '2px 6px', flexShrink: 0, fontWeight: 900 },
    stratText: { fontSize: '14px', color: T.text, flex: 1, fontWeight: 700, lineHeight: 1.5 },

    measureTable: { background: 'transparent' },
    mTableHeader: {
      display: 'flex', padding: '10px 8px',
      background: T.border, color: T.bg,
    },
    mCol: { fontSize: '11px', fontFamily: '"Space Grotesk", monospace', color: T.bg, fontWeight: 900, padding: '0 4px' },
    mRow: {
      display: 'flex', padding: '10px 8px', alignItems: 'center',
      borderBottom: `2px solid ${T.border}`, minHeight: '44px',
    },
    mCell: { fontSize: '12px', color: T.text, padding: '4px', fontFamily: '"Space Grotesk", "Noto Sans TC", monospace', fontWeight: 600 },

    expandBtn: {
      width: '36px', height: '36px',
      border: `2px solid ${T.border}`, borderRadius: '0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '18px', fontWeight: 900,
    },
  }
}