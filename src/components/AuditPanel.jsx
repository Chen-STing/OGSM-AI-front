import { useState } from 'react'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

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

function calcProgress(measures) {
  if (!measures.length) return 0
  return Math.round(measures.reduce((s, m) => s + (m.progress || 0), 0) / measures.length)
}

function progressColor(pct) {
  if (pct === 0)  return '#94a3b8'
  if (pct < 30)   return B_PINK
  if (pct < 60)   return B_YELLOW
  if (pct < 100)  return B_BLUE
  return B_GREEN
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

function ProgressBar({ value, color = B_YELLOW, height = 8 }) {
  return (
    <div style={{ border: `2px solid ${color}`, height, overflow: 'hidden', position: 'relative', background: 'transparent' }}>
      <div style={{ width: `${value}%`, height: '100%', background: color, transition: 'width 0.5s ease' }} />
    </div>
  )
}

function StatusDots({ counts }) {
  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      {Object.entries(STATUS_CONFIG).map(([k, v]) => counts[k] > 0 && (
        <span key={k} style={{ fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: v.color, display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span style={{ width: 8, height: 8, background: v.color, display: 'inline-block', border: '1px solid currentColor' }} />
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
  const overallColor  = progressColor(overall)
  const todoStats     = calcTodos(project.goals)

  const dark = darkMode

  // ── PDF generation (unchanged logic) ──────────────────────────────────────
  const generatePDF = async () => {
    setPdfLoading(true)
    try {
      const container = document.createElement('div')
      container.style.cssText = `position: fixed; left: -9999px; top: 0; width: 794px; background: #ffffff; font-family: "Noto Sans TC", "Microsoft JhengHei", sans-serif; color: #1a1a2e; font-size: 13px; line-height: 1.6;`
      document.body.appendChild(container)

      const statusLabel = { NotStarted: '未開始', InProgress: '進行中', Completed: '已完成', Overdue: '已逾期' }
      const statusColor = { NotStarted: '#6b7280', InProgress: '#3b82f6', Completed: '#16a34a', Overdue: '#dc2626' }
      const renderPage = (html) => `<div style="width:794px;min-height:1123px;padding:48px;box-sizing:border-box;background:#fff;">${html}</div>`
      const sectionTitle = (text) => `<div style="font-size:11px;letter-spacing:1px;color:#9ca3af;text-transform:uppercase;font-weight:700;margin-bottom:6px;">${text}</div>`
      const divider = () => `<div style="border-top:1px solid #e5e7eb;margin:16px 0;"></div>`
      const progressBar = (val, color) => `<div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;"><div style="width:${val}%;height:100%;background:${color};border-radius:4px;"></div></div><span style="font-size:12px;font-weight:700;color:${color};min-width:36px;">${val}%</span></div>`

      const overallColorPdf = progressColor(overall)
      const summaryHTML = `
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
          <div><div style="font-size:11px;color:#9ca3af;letter-spacing:1px;font-weight:600;margin-bottom:4px;">OGSM AUDIT REPORT</div><div style="font-size:26px;font-weight:800;color:#111827;line-height:1.2;">${project.title}</div></div>
          <div style="text-align:right;"><div style="font-size:56px;font-weight:800;color:${overallColorPdf};line-height:1;">${overall}</div><div style="font-size:14px;color:${overallColorPdf};font-weight:600;">% 整體完成</div></div>
        </div>
        ${divider()}
        <div style="margin-bottom:16px;"><div style="height:12px;background:#e5e7eb;border-radius:6px;overflow:hidden;"><div style="width:${overall}%;height:100%;background:${overallColorPdf};border-radius:6px;"></div></div></div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
          ${[['總指標',allMeasures.length,'#374151'],['已完成',totalCounts.Completed,'#16a34a'],['進行中',totalCounts.InProgress,'#3b82f6'],['已逾期',totalCounts.Overdue,'#dc2626']].map(([label,val,color])=>`<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;text-align:center;"><div style="font-size:28px;font-weight:800;color:${color};">${val}</div><div style="font-size:11px;color:#6b7280;margin-top:2px;">${label}</div></div>`).join('')}
        </div>
        ${sectionTitle('O — Objective')}
        <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin-bottom:16px;font-size:13px;color:#374151;line-height:1.7;">${project.objective || '（未填寫）'}</div>
        ${todoStats.total > 0 ? `${sectionTitle('☑ 待辦事項完成率')}<div style="background:#fdf2f8;border:1px solid #f9a8d4;border-radius:8px;padding:14px 16px;margin-bottom:24px;"><div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;"><div style="flex:1;height:10px;background:#fce7f3;border-radius:5px;overflow:hidden;"><div style="width:${todoStats.pct}%;height:100%;background:#f472b6;border-radius:5px;"></div></div><span style="font-size:16px;font-weight:800;color:#f472b6;min-width:44px;">${todoStats.pct}%</span></div><div style="font-size:11px;color:#6b7280;">已完成 ${todoStats.done} / ${todoStats.total} 項待辦</div></div>` : ''}
        ${sectionTitle('Goals 總覽')}
        ${project.goals.map((goal,gi)=>{const gm=goal.strategies.flatMap(s=>s.measures);const gp=calcProgress(gm);const gc=statusCounts(gm);const gc2=progressColor(gp);return`<div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:10px;"><div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;"><div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700;color:#d97706;flex-shrink:0;">G${gi+1}</div><div style="font-size:13px;font-weight:600;color:#111827;flex:1;">${goal.text||'（未命名）'}</div></div>${progressBar(gp,gc2)}<div style="display:flex;gap:12px;margin-top:8px;font-size:11px;"><span style="color:#16a34a;">✓ 已完成 ${gc.Completed}</span><span style="color:#3b82f6;">▶ 進行中 ${gc.InProgress}</span><span style="color:#6b7280;">○ 未開始 ${gc.NotStarted}</span>${gc.Overdue>0?`<span style="color:#dc2626;">⚠ 逾期 ${gc.Overdue}</span>`:''}</div></div>`}).join('')}
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
      const [frontCoverData, backCoverData] = await Promise.all([loadImageAsDataURL('/Front Cover.jpg'), loadImageAsDataURL('/Back Cover.jpg')])
      const doc = new jsPDF({ unit: 'px', format: 'a4', hotfixes: ['px_scaling'] })
      const pdfW = doc.internal.pageSize.getWidth()
      const pdfH = doc.internal.pageSize.getHeight()
      const captureAndAdd = async () => {
        const canvas = await html2canvas(container.firstChild, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        doc.addPage()
        doc.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH)
      }

      container.innerHTML = `<div style="width:794px;height:1123px;position:relative;overflow:hidden;font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif;"><img src="${frontCoverData}" style="width:794px;height:1123px;position:absolute;top:0;left:0;display:block;" /><div style="position:absolute;top:32%;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:20px;padding:0 60px;text-align:center;"><div style="font-size:48px;font-weight:900;color:#111111;letter-spacing:3px;">亞家科技股份有限公司</div><div style="font-size:30px;font-weight:700;color:#e07800;letter-spacing:1px;">${(project.title.endsWith('計畫')||project.title.endsWith('計劃'))?project.title:project.title+'計畫'}</div><div style="font-size:22px;font-weight:600;color:#555555;letter-spacing:2px;">OGSM審計報告</div></div></div>`
      await new Promise(r => setTimeout(r, 100))
      { const frontCanvas = await html2canvas(container.firstChild, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false }); doc.addImage(frontCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdfW, pdfH) }

      container.innerHTML = renderPage(summaryHTML)
      await new Promise(r => setTimeout(r, 100))
      await captureAndAdd()

      const PAGE_CONTENT_H = 1027
      const probe = document.createElement('div')
      probe.style.cssText = 'position:fixed;left:-9999px;top:0;width:698px;background:#fff;font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif;font-size:13px;line-height:1.6;'
      document.body.appendChild(probe)
      const measureHTML = async (html) => { probe.innerHTML = '<div>' + html + '</div>'; await new Promise(r => setTimeout(r, 30)); return probe.firstChild.scrollHeight }

      for (let gi = 0; gi < project.goals.length; gi++) {
        const goal = project.goals[gi]
        const gm = goal.strategies.flatMap(s => s.measures)
        const gp = calcProgress(gm)
        const gc2 = progressColor(gp)
        const goalHeaderHTML = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;"><div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:4px 12px;font-size:13px;font-weight:800;color:#d97706;">G${gi+1}</div><div style="font-size:20px;font-weight:800;color:#111827;flex:1;">${goal.text||'（未命名）'}</div><div style="font-size:18px;font-weight:800;color:${gc2};">${gp}%</div></div><div style="margin-bottom:20px;">${progressBar(gp,gc2)}</div>`
        const goalContinuationHTML = `<div style="display:flex;align-items:center;justify-content:flex-end;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e5e7eb;"><div style="font-size:12px;font-weight:600;color:#9ca3af;">（續）</div></div>`

        let currentPageHTML = goalHeaderHTML
        let currentPageH = await measureHTML(goalHeaderHTML)

        for (let si = 0; si < goal.strategies.length; si++) {
          const st = goal.strategies[si]
          const sp = calcProgress(st.measures)
          const sc2 = progressColor(sp)
          const strategyHTML = `<div style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;"><div style="background:#f9fafb;padding:12px 16px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:8px;"><span style="font-size:11px;font-weight:700;color:#6b7280;">S${gi+1}.${si+1}</span><span style="font-size:13px;font-weight:600;color:#111827;flex:1;">${st.text||'（未命名）'}</span><span style="font-size:12px;font-weight:700;color:${sc2};">${sp}%</span></div>${st.measures.length>0?`<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#f3f4f6;"><th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">MD 定量指標</th><th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;width:13%;">目標值</th><th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;width:13%;">實際值</th><th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;width:70px;">負責人</th><th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;width:80px;">期限</th><th style="padding:8px 10px;text-align:center;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;width:82px;">狀態</th><th style="padding:8px 10px;text-align:center;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;width:100px;">進度</th></tr></thead><tbody>${st.measures.map((m,mi)=>`<tr style="border-bottom:1px solid #f3f4f6;background:${mi%2===1?'#fafafa':'#fff'};"><td style="padding:8px 10px;color:#374151;">${m.kpi||'—'}</td><td style="padding:8px 10px;color:#d97706;font-family:monospace;">${m.target||'—'}</td><td style="padding:8px 10px;color:#16a34a;font-family:monospace;">${m.actual||'—'}</td><td style="padding:8px 10px;color:#6b7280;font-size:10px;">${m.assignee||'—'}</td><td style="padding:8px 10px;color:#6b7280;font-family:monospace;font-size:10px;">${m.deadline||'—'}</td><td style="padding:8px 10px;text-align:center;"><span style="background:${statusColor[m.status]||'#6b7280'}22;color:${statusColor[m.status]||'#6b7280'};border-radius:4px;padding:2px 8px;font-size:10px;font-weight:600;white-space:nowrap;">${statusLabel[m.status]||m.status}</span></td><td style="padding:8px 10px;"><div style="display:flex;align-items:center;gap:6px;"><div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;"><div style="width:${m.progress||0}%;height:100%;background:${progressColor(m.progress||0)};border-radius:3px;"></div></div><span style="color:${progressColor(m.progress||0)};font-weight:600;min-width:28px;font-size:10px;">${m.progress||0}%</span></div></td></tr>${(m.todos||[]).length>0?`<tr style="background:#f8faff;"><td colspan="7" style="padding:6px 10px 10px 20px;border-bottom:1px solid #f3f4f6;border-left:3px solid rgba(59,158,222,0.4);"><div style="font-size:9px;font-weight:700;color:#3b9ede;letter-spacing:0.5px;margin-bottom:5px;">☑ MP 檢核步驟 ${(m.todos||[]).filter(t=>t.done).length}/${(m.todos||[]).length}</div>${(m.todos||[]).map(t=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;"><span style="font-size:10px;color:${t.done?'#16a34a':'#9ca3af'};flex-shrink:0;font-weight:700;align-self:flex-start;line-height:1.5;">${t.done?'✓':'○'}</span><span style="font-size:10px;flex:1;color:${t.done?'#9ca3af':'#374151'};text-decoration:${t.done?'line-through':'none'};line-height:1.5;word-break:break-word;">${t.text}</span>${(t.assignee||t.deadline)?`<div style="display:flex;gap:4px;flex-shrink:0;align-items:center;align-self:center;">${t.assignee?`<span style="font-size:9px;color:#6b7280;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:3px;padding:1px 5px;white-space:nowrap;">👤 ${t.assignee}</span>`:''}${t.deadline?`<span style="font-size:9px;color:#6b7280;font-family:monospace;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:3px;padding:1px 5px;white-space:nowrap;">📅 ${t.deadline}</span>`:''}</div>`:''}</div>`).join('')}</td></tr>`:''}`).join('')}</tbody></table>`:`<div style="padding:12px 16px;color:#9ca3af;font-size:12px;">（無 Measures）</div>`}</div>`

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
        container.innerHTML = renderPage(currentPageHTML)
        await new Promise(r => setTimeout(r, 100))
        await captureAndAdd()
      }
      document.body.removeChild(probe)
      doc.addPage()
      doc.addImage(backCoverData, 'JPEG', 0, 0, pdfW, pdfH)
      document.body.removeChild(container)
      doc.save(`OGSM審計報告 - ${(project.title.endsWith('計畫')||project.title.endsWith('計劃'))?project.title:project.title+'計畫'}.pdf`)
    } finally {
      setPdfLoading(false)
    }
  }

  // ── PPT generation (unchanged logic) ──────────────────────────────────────
  const generatePPT = async () => {
    setPptLoading(true)
    try {
      await new Promise((resolve, reject) => {
        if (window.PptxGenJS) return resolve()
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'
        script.onload = resolve; script.onerror = reject
        document.head.appendChild(script)
      })
      const pres = new window.PptxGenJS()
      pres.layout = 'LAYOUT_WIDE'
      pres.title = project.title + ' OGSM'
      const safe = (project.title || 'Project').replace(/[/\\?%*:|"<>]/g, '_')
      await pres.writeFile({ fileName: `OGSM_${safe}.pptx` })
    } catch (err) {
      console.error('PPT generation error:', err)
      alert('PPT 生成失敗：' + err.message)
    } finally {
      setPptLoading(false)
    }
  }

  // BRUTALIST UI CONSTANTS
  const UI_BORDER = `4px solid ${dark ? '#fff' : '#000'}`;
  const UI_SHADOW = dark ? '6px 6px 0 #fff' : '6px 6px 0 #000';
  const UI_SHADOW_S = dark ? '3px 3px 0 #fff' : '3px 3px 0 #000';
  const UI_BG_PANEL = dark ? '#121212' : '#f4f4f5';
  const UI_BG_CARD  = dark ? '#1e1e1e' : '#ffffff';

  return (
    <>
      <style>{`
        @keyframes b-slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes ogsm-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .audit-pdf-btn, .audit-ppt-btn { border: 4px solid ${dark ? '#fff' : '#000'} !important; transition: transform 0.1s, box-shadow 0.1s !important; }
        .audit-pdf-btn:hover:not(:disabled), .audit-ppt-btn:hover:not(:disabled) { box-shadow: ${UI_SHADOW_S} !important; transform: translate(-2px,-2px); }
        .audit-pdf-btn:active:not(:disabled), .audit-ppt-btn:active:not(:disabled) { box-shadow: 0 0 0 transparent !important; transform: translate(1px,1px); }
        
        .audit-close-btn:hover { color: ${B_PINK} !important; background: ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} !important; transform: scale(1.1); }
        .audit-goal-card { transition: transform 0.15s, box-shadow 0.15s; }
        .audit-goal-card:hover { transform: translate(-2px, -2px); box-shadow: ${dark ? '8px 8px 0 #fff' : '8px 8px 0 #000'} !important; }
        
        .audit-measure-todo-btn:hover { background: ${B_YELLOW} !important; border-color: #000 !important; color: #000 !important; }
      `}</style>

      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9998, animation: 'ogsm-fade-in 0.2s ease-out' }} onClick={onClose} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '760px', maxWidth: '100vw',
        background: UI_BG_PANEL,
        borderLeft: UI_BORDER,
        boxShadow: dark ? '-10px 0 0 rgba(255,255,255,0.1)' : '-10px 0 0 rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
        zIndex: 9999,
        animation: 'b-slide-in-right 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px 32px', borderBottom: UI_BORDER, flexShrink: 0, background: dark ? '#222' : '#fff' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ background: B_YELLOW, border: `2px solid #000`, color: '#000', padding: '8px', fontSize: '20px', fontWeight: 900, boxShadow: '2px 2px 0 #000' }}>
              📊
            </div>
            <div>
              <div style={{ fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: dark ? B_YELLOW : B_BLUE, letterSpacing: '0.15em', marginBottom: '4px', textTransform: 'uppercase' }}>AUDIT REPORT</div>
              <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '22px', color: dark ? '#fff' : '#000', textTransform: 'uppercase', letterSpacing: '-0.02em', fontStyle: 'italic' }}>{project.title}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="audit-ppt-btn" style={{ background: B_BLUE, color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 900, padding: '8px 16px', fontFamily: '"Space Grotesk", sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: pptLoading ? 0.6 : 1 }} onClick={generatePPT} disabled={pptLoading}>
              {pptLoading ? '⟳ GENERATING…' : '📽 PPT'}
            </button>
            <button className="audit-pdf-btn" style={{ background: B_YELLOW, color: '#000', cursor: 'pointer', fontSize: '12px', fontWeight: 900, padding: '8px 16px', fontFamily: '"Space Grotesk", sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: pdfLoading ? 0.6 : 1 }} onClick={generatePDF} disabled={pdfLoading}>
              {pdfLoading ? '⟳ GENERATING…' : '📄 PDF'}
            </button>
            <button className="audit-close-btn" style={{ background: 'transparent', border: 'none', color: dark ? '#fff' : '#000', cursor: 'pointer', fontSize: '24px', padding: '4px', lineHeight: 1, fontWeight: 900, marginLeft: '8px' }} onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Overall progress card (Added flexShrink: 0) */}
          <div style={{ background: UI_BG_CARD, border: UI_BORDER, boxShadow: UI_SHADOW, padding: '24px', flexShrink: 0 }}>
            <div style={{ fontSize: '11px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: dark ? '#000' : '#fff', background: dark ? B_YELLOW : '#000', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px', display: 'inline-block', padding: '4px 12px' }}>計畫總體完成度</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', marginBottom: '16px' }}>
              <span style={{ color: overallColor, fontSize: '64px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, lineHeight: 0.9, fontStyle: 'italic', letterSpacing: '-0.04em', textShadow: `2px 2px 0 ${dark ? '#fff' : '#000'}` }}>{overall}</span>
              <span style={{ color: dark ? '#fff' : '#000', fontSize: '24px', fontWeight: 900, alignSelf: 'flex-end', marginBottom: '6px', fontFamily: '"Space Grotesk", sans-serif' }}>%</span>
            </div>
            <ProgressBar value={overall} color={overallColor} />
            <div style={{ marginTop: '16px' }}>
              <StatusDots counts={totalCounts} />
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              {[
                { num: allMeasures.length, label: 'KPI 總數', color: dark ? '#fff' : '#000', bg: dark ? '#333' : '#e5e7eb' },
                { num: totalCounts.Completed, label: '已完成', color: B_GREEN, bg: dark ? 'rgba(0,255,0,0.1)' : 'rgba(0,255,0,0.15)' },
                { num: totalCounts.InProgress, label: '進行中', color: B_BLUE, bg: dark ? 'rgba(0,0,255,0.1)' : 'rgba(0,0,255,0.15)' },
                { num: totalCounts.Overdue, label: '已逾期', color: B_PINK, bg: dark ? 'rgba(255,0,255,0.1)' : 'rgba(255,0,255,0.15)' },
              ].map(({ num, label, color, bg }) => (
                <div key={label} style={{ flex: 1, background: bg, border: `2px solid ${dark ? '#fff' : '#000'}`, padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color, lineHeight: 1 }}>{num}</div>
                  <div style={{ fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: dark ? '#fff' : '#000', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Objective (Added flexShrink: 0) */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', background: dark ? 'rgba(255,255,0,0.05)' : B_YELLOW, border: UI_BORDER, boxShadow: UI_SHADOW, padding: '20px', flexShrink: 0 }}>
            <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: dark ? B_YELLOW : '#000', fontSize: '14px', flexShrink: 0, marginTop: '2px', background: dark ? '#000' : '#fff', border: `2px solid ${dark ? B_YELLOW : '#000'}`, padding: '4px 8px', textTransform: 'uppercase' }}>OBJ</span>
            <span style={{ fontSize: '15px', color: dark ? '#fff' : '#000', lineHeight: 1.6, wordBreak: 'break-word', flex: 1, fontWeight: 900 }}>{project.objective}</span>
          </div>

          {/* Todo completion (Added flexShrink: 0) */}
          {todoStats.total > 0 && (
            <div style={{ background: UI_BG_CARD, border: UI_BORDER, boxShadow: UI_SHADOW, padding: '20px 24px', flexShrink: 0 }}>
              <div style={{ fontSize: '11px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: dark ? '#000' : '#fff', background: dark ? B_PINK : '#000', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px', display: 'inline-block', padding: '4px 12px' }}>☑ 待辦事項完成率</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <ProgressBar value={todoStats.pct} color={B_PINK} />
                </div>
                <span style={{ fontSize: '20px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: B_PINK, minWidth: '48px', fontStyle: 'italic', textShadow: `1px 1px 0 ${dark ? '#fff' : '#000'}` }}>{todoStats.pct}%</span>
              </div>
              <div style={{ marginTop: '12px', fontSize: '12px', fontFamily: 'monospace', color: dark ? '#aaa' : '#555', fontWeight: 900 }}>
                已完成 {todoStats.done} / {todoStats.total} 項待辦
              </div>
            </div>
          )}

          {/* Goals (Added flexShrink: 0 to prevent flattening into black lines) */}
          {project.goals.map((goal, gi) => {
            const goalMeasures = goal.strategies.flatMap(s => s.measures)
            const goalProgress = calcProgress(goalMeasures)
            const goalCounts   = statusCounts(goalMeasures)
            const goalColor    = progressColor(goalProgress)
            const isExpanded   = expandedGoals.has(gi)

            return (
              <div key={goal.id ?? gi} className="audit-goal-card" style={{ background: UI_BG_CARD, border: UI_BORDER, boxShadow: UI_SHADOW, overflow: 'hidden', flexShrink: 0 }}>
                {/* Goal header */}
                <div style={{ display: 'flex', gap: '16px', padding: '20px 24px', borderBottom: isExpanded ? UI_BORDER : 'none', alignItems: 'flex-start', cursor: 'pointer', background: dark ? '#1a1a1a' : '#f9fafb' }} onClick={() => toggleGoal(gi)}>
                  <div style={{ width: '36px', height: '36px', background: B_YELLOW, border: `3px solid #000`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: '#000', flexShrink: 0, boxShadow: '2px 2px 0 #000' }}>G{gi + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: dark ? '#fff' : '#000', lineHeight: 1.5, wordBreak: 'break-word', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{goal.text || '(未命名)'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <ProgressBar value={goalProgress} color={goalColor} height={6} />
                      </div>
                      <span style={{ fontSize: '16px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: goalColor, minWidth: '36px', fontStyle: 'italic', textShadow: `1px 1px 0 ${dark ? '#fff' : '#000'}` }}>{goalProgress}%</span>
                    </div>
                    <div style={{ marginTop: '12px' }}><StatusDots counts={goalCounts} /></div>
                  </div>
                  <div style={{ width: '36px', height: '36px', background: isExpanded ? '#000' : 'transparent', border: `3px solid #000`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isExpanded ? '#fff' : '#000', fontSize: '16px', fontWeight: 900, flexShrink: 0 }}>
                    {isExpanded ? '▲' : '▼'}
                  </div>
                </div>

                {/* Strategies */}
                {isExpanded && goal.strategies.map((st, si) => {
                  const stProgress = calcProgress(st.measures)
                  const stColor    = stProgress >= 80 ? B_GREEN : stProgress >= 40 ? B_YELLOW : B_PINK

                  return (
                    <div key={st.id ?? si} style={{ padding: '16px 24px', borderBottom: si < goal.strategies.length - 1 ? `2px solid ${dark ? '#444' : '#ccc'}` : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '12px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: dark ? '#aaa' : '#555', flexShrink: 0, marginTop: '2px', textTransform: 'uppercase' }}>S{gi + 1}.{si + 1}</span>
                        <span style={{ fontSize: '14px', color: dark ? '#fff' : '#000', flex: 1, lineHeight: 1.6, wordBreak: 'break-word', fontWeight: 700 }}>{st.text || '(未命名)'}</span>
                        <span style={{ fontSize: '14px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: stColor, flexShrink: 0, fontStyle: 'italic' }}>{stProgress}%</span>
                      </div>

                      {/* Measures table */}
                      {st.measures.length > 0 && (() => {
                        const stratHasTodos = st.measures.some(m => (m.todos || []).length > 0)
                        return (
                          <div style={{ marginTop: '12px', border: `2px solid ${dark ? '#555' : '#000'}` }}>
                            {/* Table header */}
                            <div style={{ display: 'flex', gap: '0', padding: '8px 12px', background: dark ? '#000' : '#e5e7eb', borderBottom: `2px solid ${dark ? '#555' : '#000'}` }}>
                              {[
                                { label: 'MD 定量指標', flex: 2 },
                                { label: '目標', flex: 1 },
                                { label: '實際', flex: 1 },
                                { label: '負責人', width: '70px' },
                                { label: '期限', width: '80px' },
                                { label: '狀態', width: '60px' },
                                { label: '進度', width: '70px' },
                                ...(stratHasTodos ? [{ label: 'MP', width: '40px' }] : []),
                              ].map((col, i) => (
                                <span key={i} style={{ fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: dark ? '#fff' : '#000', textTransform: 'uppercase', padding: '0 4px', ...(col.flex ? { flex: col.flex } : { width: col.width, flexShrink: 0 }) }}>{col.label}</span>
                              ))}
                            </div>

                            {st.measures.map((m, mi) => {
                              const sc = STATUS_CONFIG[m.status] || STATUS_CONFIG.NotStarted
                              const pc = progressColor(m.progress || 0)
                              const todoKey = `${gi}-${si}-${mi}`
                              const hasTodos = (m.todos || []).length > 0
                              const todosOpen = expandedMeasureTodos.has(todoKey)
                              const doneCount = (m.todos || []).filter(t => t.done).length
                              const totalTodosM = (m.todos || []).length
                              return (
                                <div key={m.id ?? mi}>
                                  <div style={{ display: 'flex', padding: '10px 12px', alignItems: 'flex-start', minHeight: '36px', background: dark ? (mi%2===1 ? '#1a1a1a' : '#222') : (mi%2===1 ? '#fff' : '#f9fafb'), borderBottom: mi < st.measures.length - 1 || todosOpen ? `1px solid ${dark ? '#444' : '#ccc'}` : 'none' }}>
                                    <span style={{ fontSize: '12px', color: dark ? '#eee' : '#111', padding: '0 4px', lineHeight: 1.5, wordBreak: 'break-word', flex: 2, fontWeight: 700 }}>{m.kpi || '—'}</span>
                                    <span style={{ fontSize: '12px', color: B_YELLOW, padding: '0 4px', lineHeight: 1.5, fontFamily: 'monospace', fontWeight: 900, flex: 1, textShadow: dark ? 'none' : '1px 1px 0 #000' }}>{m.target || '—'}</span>
                                    <span style={{ fontSize: '12px', color: B_GREEN, padding: '0 4px', lineHeight: 1.5, fontFamily: 'monospace', fontWeight: 900, flex: 1, textShadow: dark ? 'none' : '1px 1px 0 #000' }}>{m.actual || '—'}</span>
                                    <span style={{ fontSize: '11px', color: dark ? '#aaa' : '#555', padding: '0 4px', lineHeight: 1.5, width: '70px', flexShrink: 0, fontWeight: 700 }}>{m.assignee || '—'}</span>
                                    <span style={{ fontSize: '11px', color: dark ? '#aaa' : '#555', padding: '0 4px', lineHeight: 1.5, fontFamily: 'monospace', width: '80px', flexShrink: 0, fontWeight: 700 }}>{m.deadline || '—'}</span>
                                    <span style={{ fontSize: '10px', padding: '0 4px', lineHeight: 1.5, width: '60px', flexShrink: 0, color: sc.color, fontWeight: 900, textTransform: 'uppercase' }}>● {sc.label}</span>
                                    <span style={{ padding: '0 4px', width: '70px', flexShrink: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ flex: 1, height: '6px', border: `1px solid ${dark ? '#fff' : '#000'}`, background: 'transparent' }}>
                                          <div style={{ width: `${m.progress || 0}%`, height: '100%', background: pc }} />
                                        </div>
                                        <span style={{ fontSize: '11px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: pc, minWidth: '28px' }}>{m.progress || 0}%</span>
                                      </div>
                                    </span>
                                    {stratHasTodos && (
                                      <span style={{ padding: '0 4px', width: '40px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {hasTodos ? (
                                          <button className="audit-measure-todo-btn" onClick={() => toggleMeasureTodo(todoKey)} style={{ background: todosOpen ? B_YELLOW : 'transparent', border: `2px solid ${dark ? '#fff' : '#000'}`, borderRadius: 0, padding: '4px 6px', cursor: 'pointer', color: todosOpen ? '#000' : (dark ? '#fff' : '#000'), fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', lineHeight: 1, minWidth: '32px', transition: 'all 0.1s', boxShadow: todosOpen ? '2px 2px 0 #000' : 'none' }}>
                                            <span>{todosOpen ? '▾' : '▸'}</span>
                                            <span style={{ fontSize: '9px' }}>{doneCount}/{totalTodosM}</span>
                                          </button>
                                        ) : null}
                                      </span>
                                    )}
                                  </div>
                                  {hasTodos && todosOpen && (
                                    <div style={{ padding: '12px 16px', background: dark ? '#111' : '#f0f0f0', borderBottom: mi < st.measures.length - 1 ? `1px solid ${dark ? '#444' : '#ccc'}` : 'none', borderLeft: `6px solid ${B_BLUE}` }}>
                                      <div style={{ fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: '#fff', background: B_BLUE, letterSpacing: '0.05em', marginBottom: '12px', textTransform: 'uppercase', display: 'inline-block', padding: '4px 8px' }}>
                                        ☑ MP 檢核步驟 {doneCount}/{totalTodosM}
                                      </div>
                                      {(m.todos || []).map((t, ti) => {
                                        const tOverdue = t.deadline && t.deadline < new Date().toISOString().slice(0,10) && !t.done
                                        return (
                                          <div key={t.id ?? ti} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '14px', flexShrink: 0, lineHeight: 1.5, color: t.done ? B_GREEN : (dark ? '#555' : '#ccc'), fontWeight: 900 }}>{t.done ? '✓' : '○'}</span>
                                            <span style={{ fontSize: '12px', lineHeight: 1.5, flex: 1, color: t.done ? (dark ? '#777' : '#999') : (dark ? '#fff' : '#000'), textDecoration: t.done ? 'line-through' : 'none', wordBreak: 'break-word', fontWeight: 700 }}>{t.text}</span>
                                            {(t.assignee || t.deadline) && (
                                              <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center', alignSelf: 'center' }}>
                                                {t.assignee && <span style={{ fontSize: '10px', fontWeight: 900, color: dark ? '#000' : '#fff', background: dark ? '#fff' : '#000', padding: '2px 6px', whiteSpace: 'nowrap' }}>👤 {t.assignee}</span>}
                                                {t.deadline && <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 900, color: tOverdue ? '#000' : (dark ? '#fff' : '#000'), background: tOverdue ? B_PINK : 'transparent', border: `2px solid ${tOverdue ? '#000' : (dark ? '#555' : '#ccc')}`, padding: '2px 6px', whiteSpace: 'nowrap' }}>{tOverdue ? '⚠ ' : '📅 '}{t.deadline}</span>}
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