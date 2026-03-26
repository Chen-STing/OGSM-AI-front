import { useState } from 'react'
import { api } from '../services/api.js'

export default function GenerateModal({ onClose, onGenerated, showToast }) {
  const [objective, setObjective] = useState('')
  const [deadline,  setDeadline]  = useState('')
  const [context,   setContext]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [progress,  setProgress]  = useState('')

  const handleSubmit = async () => {
    if (!objective.trim()) return
    setLoading(true)

    const steps = ['分析目標…', '規劃 Goals…', '制定 Strategies…', '規劃定量指標…', '生成待辦清單…', '整合輸出…']
    let i = 0
    setProgress(steps[0])
    const tick = setInterval(() => {
      i = (i + 1) % steps.length
      setProgress(steps[i])
    }, 1800)

    try {
      const project = await api.generate({
        objective:         objective.trim(),
        deadline:          deadline.trim() || undefined,
        additionalContext: context.trim()  || undefined,
      })
      onGenerated(project)
    } catch (e) {
      showToast('生成失敗：' + e.message, 'error')
    } finally {
      clearInterval(tick)
      setLoading(false)
      setProgress('')
    }
  }

  const handleKey = (e) => { if (e.key === 'Escape') onClose() }

  return (
    <div style={st.backdrop} onClick={e => e.target === e.currentTarget && onClose()} onKeyDown={handleKey}>
      <div style={st.modal} role="dialog" aria-modal="true">

        {/* Header */}
        <div style={st.header}>
          <div style={st.headerLeft}>
            <span style={st.headerBadge}>⚡ AI</span>
            <h2 style={st.title}>生成 OGSM</h2>
          </div>
          <button style={st.closeBtn} onClick={onClose} disabled={loading}>✕</button>
        </div>

        <p style={st.description}>
          輸入核心目標與截止日期，AI 將自動規劃 Goals、Strategies、定量指標，以及各指標對應的 MP 檢核步驟。
        </p>

        {/* Objective */}
        <div style={st.field}>
          <label style={st.label}>OBJECTIVE 目標 <span style={st.required}>*</span></label>
          <textarea
            style={st.textarea}
            placeholder="例：在 2026 年底前將體重從 85kg 減至 75kg"
            value={objective}
            onChange={e => setObjective(e.target.value)}
            disabled={loading}
            rows={3}
            autoFocus
          />
        </div>

        {/* Deadline */}
        <div style={st.field}>
          <label style={st.label}>
            📅 計畫截止日期
            <span style={st.optional}>(建議填寫，AI 將據此安排各指標期限)</span>
          </label>
          <input
            type="date"
            style={st.dateInput}
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            disabled={loading}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Context */}
        <div style={st.field}>
          <label style={st.label}>補充背景資訊 <span style={st.optional}>(選填)</span></label>
          <textarea
            style={st.textarea}
            placeholder="例：目前痛點、預算規模、產業背景、特定限制…"
            value={context}
            onChange={e => setContext(e.target.value)}
            disabled={loading}
            rows={2}
          />
        </div>

        {/* M 說明 */}
        <div style={st.tipBox}>
          <div style={st.tipRow}>
            <span style={{ ...st.tipBadge, background: 'rgba(240,165,0,0.15)', color: '#f0a500', border: '1px solid rgba(240,165,0,0.3)' }}>MD</span>
            <span style={st.tipText}>定量指標 — 監控最終產出數字與績效（例：體重、體脂率、業績達成率）</span>
          </div>
          <div style={st.tipRow}>
            <span style={{ ...st.tipBadge, background: 'rgba(59,158,222,0.15)', color: '#3b9ede', border: '1px solid rgba(59,158,222,0.3)' }}>MP</span>
            <span style={st.tipText}>檢核步驟 — 每個定量指標底下的可執行行動（例：每週量體重、記錄飲食）</span>
          </div>
        </div>

        {/* Loading progress */}
        {loading && (
          <div style={st.progressWrap}>
            <div style={st.progressBar}><div style={st.progressFill} /></div>
            <span style={st.progressText}>{progress}</span>
          </div>
        )}

        {/* Actions */}
        <div style={st.actions}>
          <button style={{ ...st.btn, ...st.btnGhost }} onClick={onClose} disabled={loading}>取消</button>
          <button
            style={{ ...st.btn, ...st.btnPrimary, ...(!objective.trim() || loading ? st.btnDisabled : {}) }}
            onClick={handleSubmit}
            disabled={!objective.trim() || loading}
          >
            {loading ? <><span style={st.spinner} /> 生成中…</> : <><span>⚡</span> 開始生成</>}
          </button>
        </div>
      </div>
    </div>
  )
}

const st = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#161b27', border: '1px solid #334060', borderRadius: '12px', padding: '32px', width: '560px', maxWidth: '92vw', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', maxHeight: '90vh', overflowY: 'auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  headerBadge: { background: 'rgba(240,165,0,0.15)', border: '1px solid rgba(240,165,0,0.4)', color: '#f0a500', fontSize: '11px', fontFamily: '"DM Mono", monospace', padding: '3px 8px', borderRadius: '4px', letterSpacing: '0.5px' },
  title: { fontFamily: '"Syne", sans-serif', fontSize: '20px', fontWeight: 700, color: '#e8ecf4' },
  closeBtn: { background: 'none', border: 'none', color: '#8a95ae', cursor: 'pointer', fontSize: '16px', padding: '4px', lineHeight: 1 },
  description: { fontSize: '13px', color: '#b0bac9', marginBottom: '20px', lineHeight: 1.6 },
  field: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' },
  label: { fontSize: '11px', fontFamily: '"DM Mono", monospace', color: '#8a95ae', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
  required: { color: '#f0a500' },
  optional: { color: '#4a5568', fontStyle: 'normal', textTransform: 'none', fontSize: '10px' },
  textarea: { background: '#1e2535', border: '1px solid #2a3347', borderRadius: '6px', color: '#e8ecf4', fontFamily: '"Noto Sans TC", sans-serif', fontSize: '14px', padding: '10px 12px', outline: 'none', resize: 'vertical', lineHeight: 1.6, transition: 'border-color 0.15s' },
  dateInput: { background: '#1e2535', border: '1px solid #2a3347', borderRadius: '6px', color: '#e8ecf4', fontFamily: '"DM Mono", monospace', fontSize: '14px', padding: '9px 12px', outline: 'none', width: '200px', colorScheme: 'dark' },
  tipBox: { background: 'rgba(255,255,255,0.02)', border: '1px solid #2a3347', borderRadius: '6px', padding: '12px 14px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' },
  tipRow: { display: 'flex', alignItems: 'flex-start', gap: '8px' },
  tipBadge: { fontSize: '10px', fontFamily: '"DM Mono", monospace', fontWeight: 700, padding: '2px 6px', borderRadius: '3px', flexShrink: 0, letterSpacing: '0.5px', marginTop: '1px' },
  tipText: { fontSize: '11px', color: '#8a95ae', lineHeight: 1.5 },
  progressWrap: { marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' },
  progressBar: { height: '3px', background: '#2a3347', borderRadius: '99px', overflow: 'hidden' },
  progressFill: { height: '100%', width: '40%', background: 'linear-gradient(90deg, #f0a500, #ffc233)', borderRadius: '99px', animation: 'progressAnim 1.5s ease-in-out infinite' },
  progressText: { fontSize: '12px', fontFamily: '"DM Mono", monospace', color: '#f0a500', letterSpacing: '0.5px' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' },
  btn: { padding: '10px 20px', borderRadius: '6px', border: 'none', fontFamily: '"Noto Sans TC", sans-serif', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s' },
  btnPrimary: { background: '#f0a500', color: '#000' },
  btnGhost: { background: 'transparent', color: '#8a95ae', border: '1px solid #2a3347' },
  btnDisabled: { opacity: 0.45, cursor: 'not-allowed' },
  spinner: { display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.6s linear infinite' },
}