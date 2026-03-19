import { useState } from 'react'
import { api } from '../services/api.js'

export default function GenerateModal({ onClose, onGenerated, showToast }) {
  const [objective, setObjective]   = useState('')
  const [context, setContext]       = useState('')
  const [loading, setLoading]       = useState(false)
  const [progress, setProgress]     = useState('')

  const handleSubmit = async () => {
    if (!objective.trim()) return
    setLoading(true)

    const steps = ['分析目標…', '規劃 Goals…', '制定 Strategies…', '設定 Measures…', '整合輸出…']
    let i = 0
    setProgress(steps[0])
    const tick = setInterval(() => {
      i = (i + 1) % steps.length
      setProgress(steps[i])
    }, 1800)

    try {
      const project = await api.generate({
        objective: objective.trim(),
        additionalContext: context.trim() || undefined,
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

  const handleKey = (e) => {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div style={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()} onKeyDown={handleKey}>
      <div style={styles.modal} role="dialog" aria-modal="true">

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerBadge}>⚡ AI</span>
            <h2 style={styles.title}>生成 OGSM</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose} disabled={loading}>✕</button>
        </div>

        <p style={styles.description}>
          輸入你的核心目標，AI 將自動規劃完整的 Goals、Strategies 與 Measures。
        </p>

        {/* Form */}
        <div style={styles.field}>
          <label style={styles.label}>OBJECTIVE 目標 <span style={styles.required}>*</span></label>
          <textarea
            style={styles.textarea}
            placeholder="例：在 2025 年底前將客戶滿意度從 72% 提升至 90%"
            value={objective}
            onChange={e => setObjective(e.target.value)}
            disabled={loading}
            rows={3}
            autoFocus
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>補充背景資訊 <span style={styles.optional}>(選填)</span></label>
          <textarea
            style={styles.textarea}
            placeholder="例：目前痛點、預算規模、產業背景、特定限制…"
            value={context}
            onChange={e => setContext(e.target.value)}
            disabled={loading}
            rows={2}
          />
        </div>

        {/* Loading progress */}
        {loading && (
          <div style={styles.progressWrap}>
            <div style={styles.progressBar}>
              <div style={styles.progressFill} />
            </div>
            <span style={styles.progressText}>{progress}</span>
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          <button
            style={{ ...styles.btn, ...styles.btnGhost }}
            onClick={onClose}
            disabled={loading}
          >
            取消
          </button>
          <button
            style={{
              ...styles.btn,
              ...styles.btnPrimary,
              ...(!objective.trim() || loading ? styles.btnDisabled : {})
            }}
            onClick={handleSubmit}
            disabled={!objective.trim() || loading}
          >
            {loading ? (
              <><span style={styles.spinner} /> 生成中…</>
            ) : (
              <><span>⚡</span> 開始生成</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(5px)',
    zIndex: 500,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    background: '#161b27',
    border: '1px solid #334060',
    borderRadius: '12px',
    padding: '32px',
    width: '540px',
    maxWidth: '92vw',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
  },
  header: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  headerBadge: {
    background: 'rgba(240,165,0,0.15)',
    border: '1px solid rgba(240,165,0,0.4)',
    color: '#f0a500',
    fontSize: '11px',
    fontFamily: '"DM Mono", monospace',
    padding: '3px 8px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
  },
  title: {
    fontFamily: '"Syne", sans-serif',
    fontSize: '20px',
    fontWeight: 700,
    color: '#e8ecf4',
  },
  closeBtn: {
    background: 'none', border: 'none',
    color: '#8a95ae', cursor: 'pointer',
    fontSize: '16px', padding: '4px',
    lineHeight: 1,
  },
  description: {
    fontSize: '13px',
    color: '#b0bac9',
    marginBottom: '24px',
    lineHeight: 1.6,
  },
  field: {
    display: 'flex', flexDirection: 'column', gap: '6px',
    marginBottom: '18px',
  },
  label: {
    fontSize: '11px',
    fontFamily: '"DM Mono", monospace',
    color: '#8a95ae',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    display: 'flex', alignItems: 'center', gap: '4px',
  },
  required: { color: '#f0a500' },
  optional: { color: '#6b7a94', fontStyle: 'normal' },
  textarea: {
    background: '#1e2535',
    border: '1px solid #2a3347',
    borderRadius: '6px',
    color: '#e8ecf4',
    fontFamily: '"Noto Sans TC", sans-serif',
    fontSize: '14px',
    padding: '10px 12px',
    outline: 'none',
    resize: 'vertical',
    lineHeight: 1.6,
    transition: 'border-color 0.15s',
  },
  progressWrap: {
    marginBottom: '20px',
    display: 'flex', flexDirection: 'column', gap: '8px',
  },
  progressBar: {
    height: '3px',
    background: '#2a3347',
    borderRadius: '99px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '40%',
    background: 'linear-gradient(90deg, #f0a500, #ffc233)',
    borderRadius: '99px',
    animation: 'progressAnim 1.5s ease-in-out infinite',
  },
  progressText: {
    fontSize: '12px',
    fontFamily: '"DM Mono", monospace',
    color: '#f0a500',
    letterSpacing: '0.5px',
  },
  actions: {
    display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px',
  },
  btn: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    fontFamily: '"Noto Sans TC", sans-serif',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    transition: 'all 0.15s',
  },
  btnPrimary: { background: '#f0a500', color: '#000' },
  btnGhost: {
    background: 'transparent',
    color: '#8a95ae',
    border: '1px solid #2a3347',
  },
  btnDisabled: { opacity: 0.45, cursor: 'not-allowed' },
  spinner: {
    display: 'inline-block',
    width: '12px', height: '12px',
    border: '2px solid rgba(0,0,0,0.3)',
    borderTopColor: '#000',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  },
}
