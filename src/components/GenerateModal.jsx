import { useState, useEffect, useRef } from 'react'
import { api } from '../services/api.js'
import { genModalShapes, MODAL_DEFAULT_CONFIGS } from '../bgConfig.js'

import BrutalistSelect from './BrutalistSelect.jsx'

// ─── VIBRANT BRUTALIST DESIGN TOKENS ────────────────────────────────────────
const ACCENT_BLUE   = "#0000FF";
const ACCENT_PINK   = "#FF00FF";
const ACCENT_YELLOW = "#FFFF00";

const DARK = {
  bg: '#222222', text: '#F0F0F0', textSub: '#B4B4B4', border: '#DDDDDD',
  inputBg: 'rgba(255,255,255,0.09)', altBg: 'rgba(255,255,255,0.12)',
  grid: 'rgba(255,255,255,0.05)', scanline: 'rgba(255,255,255,0.15)',
  backdrop: 'rgba(0,0,0,0.88)', headerBg: '#111111'
};
const LIGHT = {
  bg: '#FFFFFF', text: '#111111', textSub: 'rgba(0,0,0,0.60)', border: '#111111',
  inputBg: 'rgba(0,0,0,0.04)', altBg: '#F2F2F2',
  grid: 'rgba(0,0,0,0.04)', scanline: 'rgba(0,0,0,0.15)',
  backdrop: 'rgba(255,255,255,0.85)', headerBg: '#0D0D0D'
};

// ─── Shape renderers ──────────────────────────────────────────────────────────
function renderShapes(shapes) {
  return (
    <>
      {shapes.stars.map((s, i) => (
        <div key={`gm-s${i}`} style={{ position: 'absolute', ...s.pos, color: s.color, opacity: 0.18, pointerEvents: 'none', zIndex: 0, animation: s.anim }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
            <path d="M12 2.5L14.7 8.8L21.5 9.5L16.3 14L17.8 20.7L12 17.2L6.2 20.7L7.7 14L2.5 9.5L9.3 8.8L12 2.5Z" />
          </svg>
        </div>
      ))}
      {shapes.crosses.map((s, i) => (
        <div key={`gm-x${i}`} style={{ position: 'absolute', ...s.pos, color: s.color, opacity: 0.18, pointerEvents: 'none', zIndex: 0, animation: s.anim }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="square">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
      ))}
      {shapes.circles.map((s, i) => (
        <div key={`gm-c${i}`} style={{ position: 'absolute', ...s.pos, color: s.color, opacity: 0.18, pointerEvents: 'none', zIndex: 0, animation: s.anim }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
      ))}
      {shapes.tris.map((s, i) => (
        <div key={`gm-t${i}`} style={{ position: 'absolute', ...s.pos, color: s.color, opacity: 0.2, pointerEvents: 'none', zIndex: 0, animation: s.anim }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter">
            <polygon points="12,2 22,20 2,20" />
          </svg>
        </div>
      ))}
    </>
  )
}

export default function GenerateModal({ members = [], onClose, onGenerated, showToast, darkMode = true, shapeConfig }) {
  const [mode,      setMode]      = useState('ai') // 'ai' | 'manual' | 'import'
  const prevModeRef = useRef('ai') // mode before entering import
  const [title,     setTitle]     = useState('')
  const [objective, setObjective] = useState('')
  const [deadline,  setDeadline]  = useState('')
  const [assignees, setAssignees] = useState([])
  const [context,   setContext]   = useState('')
  const [files,     setFiles]     = useState([])
  const [fileInputKey, setFileInputKey] = useState(0)
  const [loading,   setLoading]   = useState(false)
  const [progress,  setProgress]  = useState('')
  const [importError, setImportError] = useState(null)

  const cfg    = shapeConfig ?? MODAL_DEFAULT_CONFIGS.generate
  const shapes = genModalShapes('generate', cfg, cfg.seed)

  const ACCEPTED_TYPES = [
    'text/plain','text/markdown','text/csv','application/json','text/xml','application/xml',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/pdf',
    'image/jpeg','image/png','image/gif','image/webp',
  ]
  const ACCEPTED_EXT = ['.txt','.md','.markdown','.csv','.json','.xml','.docx','.pdf','.xlsx','.xls','.pptx','.ppt','.jpg','.jpeg','.png','.gif','.webp']
  const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB
  const MAX_FILES = 10
  const IMPORT_MAX_FILES = 20

  const handleFileChange = (e) => {
    setImportError(null)
    if (!e.target.files || e.target.files.length === 0) return
    const currentMax = mode === 'import' ? IMPORT_MAX_FILES : MAX_FILES
    const incoming = Array.from(e.target.files)
    const errors = []
    const valid = []
    for (const f of incoming) {
      const ext = '.' + f.name.split('.').pop().toLowerCase()
      const okType = ACCEPTED_TYPES.includes(f.type) || ACCEPTED_EXT.includes(ext)
      if (!okType) { errors.push(`${f.name}：不支援的格式`); continue }
      if (f.size > MAX_FILE_SIZE) { errors.push(`${f.name}：超過 100 MB 限制`); continue }
      valid.push(f)
    }
    setFiles(prev => {
      const merged = [...prev, ...valid]
      if (merged.length > currentMax) {
        errors.push(`最多同時上傳 ${currentMax} 個文件，已截斷至 ${currentMax} 個`)
        return merged.slice(0, currentMax)
      }
      return merged
    })
    if (errors.length > 0) showToast(errors.join('；'), 'error')
    setFileInputKey(k => k + 1)
  }

  const handleRemoveFile = (idx) => {
    setFiles(f => f.filter((_, i) => i !== idx))
  }

  useEffect(() => {
    const id = 'gm-loading-cursor'
    if (loading) {
      const el = document.createElement('style')
      el.id = id
      el.textContent = `
        .gm-overlay, .gm-overlay * {
          cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><g><animateTransform attributeName='transform' type='rotate' from='0 16 16' to='360 16 16' dur='1.5s' repeatCount='indefinite'/><polygon points='18,4 22,14 32,18 22,22 18,32 14,22 4,18 14,14' fill='%23000000'/><polygon points='16,2 20,12 30,16 20,20 16,30 12,20 2,16 12,12' fill='%23FF0000' stroke='%23FFFFFF' stroke-width='2.5' stroke-linejoin='miter'/></g></svg>") 16 16, wait !important;
        }
      `
      document.head.appendChild(el)
    } else {
      document.getElementById(id)?.remove()
    }
    return () => document.getElementById(id)?.remove()
  }, [loading])

  const T = darkMode ? DARK : LIGHT;
  const canSubmit = mode === 'import' ? files.length > 0 : !!objective.trim()

  const handleSubmit = async () => {
    if (mode === 'manual' && !title.trim()) {
      showToast('請填寫計畫標題', 'error')
      return
    }
    if (mode === 'import' && files.length === 0) {
      showToast('請選擇至少一個文件', 'error')
      return
    }
    if (mode !== 'import' && !objective.trim()) {
      showToast('請填寫 OBJECTIVE 目標', 'error')
      return
    }

    setLoading(true)
    let tick

    try {
      let project
      if (mode === 'ai') {
        const steps = ['分析目標…', '規劃 Goals…', '制定 Strategies…', '規劃定量指標…', '生成待辦清單…', '整合輸出…']
        let i = 0
        setProgress(steps[0])
        tick = setInterval(() => { i = (i + 1) % steps.length; setProgress(steps[i]) }, 1800)

        if (files.length > 0) {
          // 有文件 → multipart/form-data
          const result = await api.generateWithDocs({
            objective: objective.trim(),
            deadline: deadline.trim() || undefined,
            assignees: assignees.length > 0 ? assignees : undefined,
            additionalContext: context.trim() || undefined,
            files,
          })
          // 檢查部分解析失敗
          const failed = (result.parseResults ?? []).filter(r => !r.success)
          if (failed.length > 0) {
            showToast(`${failed.length} 份文件無法讀取：${failed.map(f => f.fileName).join('、')}`, 'error')
          }
          project = result
        } else {
          // 無文件 → JSON
          project = await api.generate({
            objective: objective.trim(),
            deadline: deadline.trim() || undefined,
            assignees: assignees.length > 0 ? assignees : [],
            additionalContext: context.trim() || undefined,
          })
        }
      } else if (mode === 'import') {
        const steps = ['解析文件…', '識別 OGSM 內容…', '合併相關計畫…', '建立計畫資料…', '整合輸出…']
        let i = 0
        setProgress(steps[0])
        tick = setInterval(() => { i = (i + 1) % steps.length; setProgress(steps[i]) }, 1800)
        let data
        try {
          data = await api.importOgsm({ files, additionalContext: context.trim() || undefined })
        } catch (importErr) {
          setImportError(importErr.message)
          showToast(`匯入失敗：${importErr.message}`, 'error')
          return
        }
        const failed = (data.parseResults ?? []).filter(r => !r.success)
        if (failed.length > 0) {
          showToast(`${failed.length} 份文件無法讀取：${failed.map(f => f.fileName).join('、')}`, 'error')
        }
        if (!data.projects?.length) {
          const msg = '匯入完成，但未能識別出任何 OGSM 計畫，請檢查文件內容後重試'
          setImportError(msg)
          showToast(msg, 'error')
          return
        }
        onGenerated(data.projects)
        return
      } else {
        setProgress('手動建立中…')
        // 手動建立空專案
        project = await api.create({
          title: title.trim(),
          objective: objective.trim(),
          deadline: deadline.trim() || '',
          assignees: assignees.length > 0 ? assignees : [],
          context: context.trim(),
          goals: []
        })
      }
      onGenerated(project)
    } catch (e) {
      showToast('處理失敗：' + e.message, 'error')
    } finally {
      if (tick) clearInterval(tick)
      setLoading(false)
      setProgress('')
    }
  }

  const handleKey = (e) => { if (e.key === 'Escape') onClose() }

  return (
    <div className="gm-overlay"
      style={{ position: "fixed", inset: 0, background: T.backdrop, backdropFilter: "blur(4px)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.3s ease" }}
      onClick={e => e.target === e.currentTarget && !loading && onClose()}
      onKeyDown={handleKey}
    >
      <style>{`.gm-date::-webkit-calendar-picker-indicator { cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M14 6 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%23000000" /><path d="M10 2 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%23FF00FF" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></svg>') 10 2, pointer !important; }
        @keyframes gm-starFloat   { 0% { transform: translate(0,0) rotate(0deg) scale(1); } 25% { transform: translate(20px,-30px) rotate(90deg) scale(1.25); } 50% { transform: translate(-10px,20px) rotate(180deg) scale(0.85); } 75% { transform: translate(30px,10px) rotate(270deg) scale(1.15); } 100% { transform: translate(0,0) rotate(360deg) scale(1); } }
        @keyframes gm-crossFloat  { 0% { transform: translate(0,0) rotate(0deg) scale(1); } 33% { transform: translate(-25px,20px) rotate(120deg) scale(1.2); } 66% { transform: translate(15px,-15px) rotate(240deg) scale(0.8); } 100% { transform: translate(0,0) rotate(360deg) scale(1); } }
        @keyframes gm-circleFloat { 0% { transform: translate(0,0) scale(1); } 33% { transform: translate(20px,-25px) scale(2.5); } 66% { transform: translate(-15px,15px) scale(0.88); } 100% { transform: translate(0,0) scale(1); } }
        @keyframes gm-triFloat    { 0% { transform: translate(0,0) rotate(0deg) scale(1); } 50% { transform: translate(-20px,-30px) rotate(180deg) scale(1.2); } 100% { transform: translate(0,0) rotate(360deg) scale(1); } }
      `}</style>
      <div style={{ position: "relative" }}>
      <div className="b-card animate-scale-in" role="dialog" aria-modal="true" style={{
        background: T.bg, color: T.text, width: "600px", maxWidth: "92vw", maxHeight: "90vh",
        border: `4px solid ${T.border}`, boxShadow: `8px 8px 0px ${(darkMode ? "#223fce" : "#7389dd")}`,
        overflowY: "hidden", position: "relative",
        transition: "background 0.3s ease, color 0.3s ease, border 0.3s ease, box-shadow 0.3s ease"
      }}>
        {renderShapes(shapes)}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: `linear-gradient(to right, ${T.grid} 1px, transparent 1px), linear-gradient(to bottom, ${T.grid} 1px, transparent 1px)`, backgroundSize: "20px 20px", transition: "background-image 0.3s ease" }} />
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 1 }}>
          <div style={{ position: "absolute", left: 0, right: 0, height: "2px", background: `linear-gradient(to right, transparent, ${T.scanline}, transparent)`, animation: "progress-slide 2.5s linear infinite" }} />
        </div>

        <div style={{ background: T.headerBg, padding: "12px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 10, transition: "background 0.3s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ background: ACCENT_YELLOW, padding: "8px", display: "flex", alignItems: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#000"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10" /></svg>
            </div>
            <h2 style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: "25px", letterSpacing: "-0.03em", textTransform: "uppercase", color: '#F0F0F0', margin: 0 }}>
              {mode === 'ai' ? '生成 OGSM' : mode === 'import' ? '匯入 OGSM' : '建立 OGSM'}
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {(() => {
              // When in import: show opposite of prevMode (from ai → show manual; from manual → show ai)
              const targetMode = mode === 'import'
                ? (prevModeRef.current === 'ai' ? 'manual' : 'ai')
                : (mode === 'ai' ? 'manual' : 'ai')
              const isShowingAi = targetMode === 'ai'
              const titleTip = isShowingAi ? '切換至 AI 生成' : '切換至手動建立'
              return (
                <button onClick={() => setMode(targetMode)} disabled={loading} title={titleTip}
                  style={{ background: 'transparent', border: `2px solid ${T.border}`, padding: '4px', color: '#F0F0F0', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                  onMouseEnter={e => { if(!loading){e.currentTarget.style.background=ACCENT_YELLOW;e.currentTarget.style.color='#000'} }}
                  onMouseLeave={e => { if(!loading){e.currentTarget.style.background='transparent';e.currentTarget.style.color='#F0F0F0'} }}
                >
                  {isShowingAi ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter">
                      <rect x="3" y="11" width="18" height="10" rx="2" />
                      <circle cx="12" cy="5" r="2" />
                      <path d="M12 7v4" />
                      <line x1="8" y1="16" x2="8" y2="16" />
                      <line x1="16" y1="16" x2="16" y2="16" />
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter">
                      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                  )}
                </button>
              )
            })()}
            <button onClick={() => { if(loading) return; if(mode === 'import') { setMode(prevModeRef.current); setImportError(null) } else { prevModeRef.current = mode; setImportError(null); setMode('import') } }} disabled={loading} title={mode === 'import' ? '退出匯入' : '批次匯入文件'}
              style={{ background: mode === 'import' ? ACCENT_YELLOW : 'transparent', border: `2px solid ${T.border}`, padding: '4px', color: mode === 'import' ? '#000' : '#F0F0F0', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => { if(!loading && mode !== 'import'){e.currentTarget.style.background=ACCENT_YELLOW;e.currentTarget.style.color='#000'} }}
              onMouseLeave={e => { if(!loading && mode !== 'import'){e.currentTarget.style.background='transparent';e.currentTarget.style.color='#F0F0F0'} }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter">
                <polyline points="8 10 12 14 16 10"/>
                <line x1="12" y1="4" x2="12" y2="14"/>
                <rect x="3" y="15" width="18" height="6"/>
              </svg>
            </button>
            <button onClick={!loading ? onClose : undefined} disabled={loading}
              style={{ background: "none", border: "none", color: loading ? 'rgba(255,255,255,0.25)' : (darkMode ? '#ffffff' : T.bg), fontSize: "28px", lineHeight: 1, transition: "color 0.2s", cursor: loading ? "not-allowed" : "pointer", opacity: 1, padding: "2px 6px" }}
              onMouseEnter={e => !loading && (e.currentTarget.style.color = ACCENT_PINK)}
              onMouseLeave={e => !loading && (e.currentTarget.style.color = darkMode ? '#ffffff' : T.bg)}
            >✕</button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxHeight: "calc(90vh - 60px)", position: "relative", zIndex: 10 }}>
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <div style={{ padding: "14px 28px 0 28px" }}>
          {mode === 'ai' && (
            <p style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: "16px", lineHeight: 1.4, color: T.textSub, marginBottom: "16px", textTransform: "uppercase", marginTop: 0, transition: "color 0.3s ease" }}>
              輸入核心目標與截止日期，AI 將自動規劃 Goals、Strategies、定量指標，以及各指標對應的 MP 檢核步驟。
            </p>
          )}

          {mode === 'manual' && (
            <div style={{ marginBottom: "13px" }}>
              <label style={{ fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "8px", color: T.text, transition: "color 0.3s ease" }}>
                計畫標題 <span style={{ color: ACCENT_PINK }}>*</span>
              </label>
              <input type="text"
                style={{ width: "100%", padding: "16px", fontSize: "16px", fontWeight: 700, border: `4px solid ${T.border}`, fontFamily: '"Space Grotesk", sans-serif', color: T.text, background: T.inputBg, backdropFilter: "blur(1px)", WebkitBackdropFilter: "blur(1px)", outline: "none", transition: "border-color 0.15s, background 0.3s ease, color 0.3s ease" }}
                placeholder="例：2026 年度行銷計畫"
                value={title} onChange={e => setTitle(e.target.value)} disabled={loading} autoFocus={mode === 'manual'} />
            </div>
          )}

          {mode === 'import' && (
            <>
              <p style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: "16px", lineHeight: 1.4, color: T.textSub, marginBottom: "16px", textTransform: "uppercase", marginTop: 0, transition: "color 0.3s ease" }}>
                上傳文件，AI 將自動識別並生成 OGSM 計畫。相同目標合併為同一計畫，不同目標各自獨立。
              </p>
              {importError && (
                <div style={{ marginBottom: '16px', padding: '14px 16px', border: '3px solid #ff0000', background: 'rgba(255,0,0,0.08)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff0000" strokeWidth="2.5" strokeLinecap="square" style={{ flexShrink: 0, marginTop: '1px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ff0000', marginBottom: '4px' }}>匯入失敗</div>
                    <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: '13px', color: darkMode ? '#ffaaaa' : '#cc0000', lineHeight: 1.5 }}>{importError}</div>
                  </div>
                  <button onClick={() => setImportError(null)} style={{ background: 'none', border: 'none', color: '#ff0000', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>✕</button>
                </div>
              )}
              <div style={{ marginBottom: "13px" }}>
                <label style={{ fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "8px", color: T.text, transition: "color 0.3s ease" }}>
                  📎 匯入文件 <span style={{ color: ACCENT_PINK }}>*</span>
                  <span style={{ opacity: 0.6, fontStyle: "normal", textTransform: "none", fontWeight: 700, marginLeft: "4px" }}>(最多 {IMPORT_MAX_FILES} 個，每個上限 100 MB，總上限 500 MB)</span>
                </label>
                <div
                  style={{ border: `4px dashed ${T.border}`, background: T.inputBg, padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }}
                  onDragLeave={e => { e.currentTarget.style.background = T.inputBg }}
                  onDrop={e => {
                    e.preventDefault(); e.currentTarget.style.background = T.inputBg
                    if (loading) return
                    handleFileChange({ target: { files: e.dataTransfer.files } })
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <label style={{ cursor: loading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', border: `2px solid ${T.border}`, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', background: darkMode ? '#444' : '#e8e8e8', color: T.text, opacity: loading ? 0.5 : 1 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      選擇文件
                      <input key={fileInputKey} type="file" multiple accept={ACCEPTED_EXT.join(',')} onChange={handleFileChange} disabled={loading} style={{ display: 'none' }} />
                    </label>
                    <span style={{ fontSize: '11px', color: T.textSub, fontFamily: '"Space Grotesk", sans-serif' }}>或拖曳至此 · 支援 txt / md / csv / json / docx / pdf / xlsx / xls / pptx / ppt / jpg / png / gif / webp</span>
                  </div>
                  {files.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {files.map((file, index) => {
                        const isImg = file.type.startsWith('image/')
                        const sizeMB = (file.size / 1024 / 1024).toFixed(1)
                        return (
                          <div key={index} style={{ background: darkMode ? '#333' : '#e0e0e0', color: T.text, padding: '4px 8px', border: `2px solid ${T.border}`, fontSize: '12px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '100%' }}>
                            <span style={{ opacity: 0.6 }}>{isImg ? '🖼' : '📄'}</span>
                            <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                            <span style={{ opacity: 0.55, flexShrink: 0 }}>{sizeMB} MB</span>
                            <button onClick={() => !loading && handleRemoveFile(index)} disabled={loading}
                              style={{ background: 'transparent', border: 'none', color: ACCENT_PINK, cursor: loading ? 'default' : 'pointer', padding: '0 2px', fontWeight: 900, fontSize: '16px', lineHeight: 1 }}>×</button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "8px", color: T.text, transition: "color 0.3s ease" }}>
                  補充說明 <span style={{ opacity: 0.6, fontStyle: "normal", textTransform: "none" }}>(選填)</span>
                </label>
                <textarea style={{ width: "100%", padding: "12px 16px", fontSize: "14px", border: `4px solid ${T.border}`, color: T.text, background: T.inputBg, backdropFilter: "blur(1px)", WebkitBackdropFilter: "blur(1px)", resize: "vertical", outline: "none", transition: "background 0.3s ease, color 0.3s ease, border 0.3s ease", fontFamily: '"Space Grotesk", sans-serif' }}
                  placeholder="例：這些都是 2026 年度計畫、目標受眾是 25-40 歲用戶…"
                  value={context} onChange={e => setContext(e.target.value)} disabled={loading} rows={3} />
              </div>
            </>
          )}

          {mode !== 'import' && (
          <div style={{ marginBottom: "13px" }}>
            <label style={{ fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "8px", color: T.text, transition: "color 0.3s ease" }}>
              OBJECTIVE 目標 <span style={{ color: ACCENT_PINK }}>*</span>
            </label>
            <textarea style={{ width: "100%", padding: "16px", fontSize: "16px", fontWeight: 700, border: `4px solid ${T.border}`, fontFamily: '"Space Grotesk", sans-serif', color: T.text, background: T.inputBg, backdropFilter: "blur(1px)", WebkitBackdropFilter: "blur(1px)", resize: "vertical", minHeight: "100px", outline: "none", transition: "border-color 0.15s, background 0.3s ease, color 0.3s ease" }}
              placeholder="例：在 2026 年底前將體重從 85kg 減至 75kg"
              value={objective} onChange={e => setObjective(e.target.value)} disabled={loading} autoFocus={mode === 'ai'} rows={3} />
          </div>
          )}

          {mode !== 'import' && (
          <div style={{ display: 'flex', gap: '20px', marginBottom: "13px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "8px", color: T.text, transition: "color 0.3s ease" }}>
                📅 計畫截止日期
              </label>
              <input type="date" className="gm-date"
                style={{ boxSizing: "border-box", height: "48px", padding: "12px 16px", fontSize: "16px", fontFamily: "monospace", fontWeight: 700, border: `4px solid ${T.border}`, background: T.inputBg, color: T.text, backdropFilter: "blur(1px)", WebkitBackdropFilter: "blur(1px)", width: "100%", outline: "none", colorScheme: darkMode ? "dark" : "light", transition: "background 0.3s ease, color 0.3s ease, border 0.3s ease" }}
                value={deadline} onChange={e => setDeadline(e.target.value)} disabled={loading} min={new Date().toISOString().split('T')[0]} />
            </div>

            <div style={{ flex: 1.5 }}>
              <label style={{ fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "8px", color: T.text, transition: "color 0.3s ease" }}>
                👥 所有人
              </label>
              <div style={{ opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}>
                <BrutalistSelect
                  options={members.filter(Boolean)}
                  value={assignees}
                  onChange={setAssignees}
                  placeholder="選擇負責人..."
                  darkMode={darkMode}
                  multiple={true}
                  style={{ border: `4px solid ${T.border}`, minHeight: '48px', padding: '0 12px' }}
                />
              </div>
            </div>
          </div>
          )}

          {mode === 'ai' && (
            <>
              <div style={{ marginBottom: "13px" }}>
                <label style={{ fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "8px", color: T.text, transition: "color 0.3s ease" }}>
                  補充背景資訊 <span style={{ opacity: 0.6, fontStyle: "normal", textTransform: "none" }}>(選填)</span>
                </label>
                <textarea style={{ width: "100%", padding: "12px 16px", fontSize: "14px", border: `4px solid ${T.border}`, color: T.text, background: T.inputBg, backdropFilter: "blur(1px)", WebkitBackdropFilter: "blur(1px)", resize: "vertical", outline: "none", transition: "background 0.3s ease, color 0.3s ease, border 0.3s ease" }}
                  placeholder="例：目前痛點、預算規模、產業背景、特定限制…"
                  value={context} onChange={e => setContext(e.target.value)} disabled={loading} rows={5} />
              </div>
              
              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "8px", color: T.text, transition: "color 0.3s ease" }}>
                  📎 參考文件 <span style={{ opacity: 0.6, fontStyle: "normal", textTransform: "none" }}>(選填，最多 {MAX_FILES} 個，每個上限 100 MB，總上限 200 MB)</span>
                </label>
                <div
                  style={{ border: `4px dashed ${T.border}`, background: T.inputBg, padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }}
                  onDragLeave={e => { e.currentTarget.style.background = T.inputBg }}
                  onDrop={e => {
                    e.preventDefault(); e.currentTarget.style.background = T.inputBg
                    if (loading) return
                    const dt = { target: { files: e.dataTransfer.files } }
                    handleFileChange(dt)
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <label style={{ cursor: loading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', border: `2px solid ${T.border}`, fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', background: darkMode ? '#444' : '#e8e8e8', color: T.text, opacity: loading ? 0.5 : 1 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      選擇文件
                      <input key={fileInputKey} type="file" multiple accept={ACCEPTED_EXT.join(',')} onChange={handleFileChange} disabled={loading} style={{ display: 'none' }} />
                    </label>
                    <span style={{ fontSize: '11px', color: T.textSub, fontFamily: '"Space Grotesk", sans-serif' }}>或拖曳至此 · 支援 txt / md / csv / json / docx / pdf / xlsx / xls / pptx / ppt / jpg / png / gif / webp</span>
                  </div>
                  {files.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {files.map((file, index) => {
                        const isImg = file.type.startsWith('image/')
                        const sizeMB = (file.size / 1024 / 1024).toFixed(1)
                        return (
                          <div key={index} style={{ background: darkMode ? '#333' : '#e0e0e0', color: T.text, padding: '4px 8px', border: `2px solid ${T.border}`, fontSize: '12px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '100%' }}>
                            <span style={{ opacity: 0.6 }}>{isImg ? '🖼' : '📄'}</span>
                            <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                            <span style={{ opacity: 0.55, flexShrink: 0 }}>{sizeMB} MB</span>
                            <button onClick={() => !loading && handleRemoveFile(index)} disabled={loading}
                              style={{ background: 'transparent', border: 'none', color: ACCENT_PINK, cursor: loading ? 'default' : 'pointer', padding: '0 2px', fontWeight: 900, fontSize: '16px', lineHeight: 1 }}>×</button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {mode === 'ai' && (<><div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginTop: "4px" }}>
            <span style={{ background: ACCENT_YELLOW, color: "#000", border: `2px solid ${T.border}`, fontSize: "10px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, padding: "2px 6px", letterSpacing: "0.05em", flexShrink: 0, marginTop: "2px", transition: "border 0.3s ease" }}>MD</span>
            <span style={{ fontSize: "13px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, lineHeight: 1.5, color: T.text, transition: "color 0.3s ease" }}>
              {mode === 'ai' ? '定量指標 — 監控最終產出數字與績效（例：體重、達成率）' : '定量指標 — 稍後可為此目標建立個別的數據檢核指標'}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginTop: "8px" }}>
            <span style={{ background: ACCENT_BLUE, color: "#fff", border: `2px solid ${T.border}`, fontSize: "10px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, padding: "2px 6px", letterSpacing: "0.05em", flexShrink: 0, marginTop: "2px", transition: "border 0.3s ease" }}>MP</span>
            <span style={{ marginBottom: "13px", fontSize: "13px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, lineHeight: 1.5, color: T.text, transition: "color 0.3s ease" }}>
              {mode === 'ai' ? '檢核步驟 — 每個定量指標底下的可執行行動（例：天天量體重）' : '檢核步驟 — 搭配 MD，建立具體可被執行的任務'}
            </span>
          </div></>)}

          {loading && (
            <div style={{ marginBottom: "24px", padding: "16px", border: `4px solid ${T.border}`, background: ACCENT_YELLOW, color: "#000" }}>
              <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{progress || '初始化…'}</div>
              <div style={{ height: "4px", background: "rgba(0,0,0,0.15)", marginTop: "12px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: "40%", background: "#000", animation: "marquee 1.5s linear infinite" }} />
              </div>
            </div>
          )}

        </div>
        </div>
        <div style={{ flexShrink: 0, padding: "16px 28px 28px 28px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button onClick={!loading ? onClose : undefined} disabled={loading}
              style={{ padding: "10px 20px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: "16px", textTransform: "uppercase", background: loading ? (darkMode?"#444":"#ddd") : T.bg, color: loading ? (darkMode?"#888":"#444") : T.text, border: `4px solid ${loading?(darkMode?"#555":"#999"):T.border}`, boxShadow: loading?"none":`4px 4px 0 0 ${darkMode?"#868686":"#000000"}`, transition: "all 0.15s", cursor: loading?"not-allowed":"pointer" }}
              onMouseEnter={e=>{ if(!loading){e.currentTarget.style.transform='translate(-2px,-2px)';e.currentTarget.style.boxShadow=`6px 6px 0 0 ${darkMode?"#868686":"#000000"}`;e.currentTarget.style.background=darkMode?"#636363":"#858585";}}}
              onMouseLeave={e=>{ if(!loading){e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=`4px 4px 0 0 ${darkMode?"#868686":"#000000"}`;e.currentTarget.style.background=T.bg;}}}
              onMouseDown={e=>{ if(!loading){e.currentTarget.style.transform='translate(2px,2px)';e.currentTarget.style.boxShadow=`2px 2px 0 0 ${T.border}`;}}}
              onMouseUp={e=>{ if(!loading){e.currentTarget.style.transform='translate(-2px,-2px)';e.currentTarget.style.boxShadow=`6px 6px 0 0 ${T.border}`;}}}
            >取消</button>
            <button onClick={handleSubmit} disabled={(mode==='manual'&&!title.trim())||!canSubmit||loading}
              style={{ padding: "10px 20px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: "16px", textTransform: "uppercase", background: canSubmit&&!loading?ACCENT_YELLOW:(darkMode?"#444":"#ddd"), color: canSubmit&&!loading?"#000":(darkMode?"#888":"#888"), border: `4px solid ${T.border}`, boxShadow: `4px 4px 0 0 ${darkMode?"#868686":"#000000"}`, display: "flex", alignItems: "center", gap: "8px", opacity: loading||!canSubmit?0.6:1, transition: "all 0.15s", cursor: loading||!canSubmit?"not-allowed":"pointer" }}
              onMouseEnter={e=>{ if(canSubmit&&!loading){e.currentTarget.style.transform='translate(-2px,-2px)';e.currentTarget.style.boxShadow=`6px 6px 0 0 ${darkMode?"#868686":"#000000"}`;e.currentTarget.style.background=darkMode?"#286390":"#0b4979";e.currentTarget.style.color=T.bg;}}}
              onMouseLeave={e=>{ if(canSubmit&&!loading){e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=`4px 4px 0 0 ${darkMode?"#868686":"#000000"}`;e.currentTarget.style.background=ACCENT_YELLOW;e.currentTarget.style.color="#000000";}}}
              onMouseDown={e=>{ if(canSubmit&&!loading){e.currentTarget.style.transform='translate(2px,2px)';e.currentTarget.style.boxShadow=`2px 2px 0 0 ${T.border}`;}}}
              onMouseUp={e=>{ if(canSubmit&&!loading){e.currentTarget.style.transform='translate(-2px,-2px)';e.currentTarget.style.boxShadow=`6px 6px 0 0 ${T.border}`;}}}
            >
              {loading ? (<><span style={{ width:"16px",height:"16px",border:"3px solid rgba(0,0,0,0.3)",borderTopColor:"#000",borderRadius:"50%",animation:"spin 0.6s linear infinite",display:"inline-block" }} />處理中…</>) : <>{mode === 'ai' ? '⚡ 開始生成' : mode === 'import' ? '📥 批次匯入' : '➕ 建立計畫'}</>}
            </button>
          </div>
        </div>
        </div>
      </div>
      </div>
    </div>
  )
}

