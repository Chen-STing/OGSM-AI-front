import { useState } from 'react'

/**
 * 通用 AI 局部生成確認框
 * props:
 *   type        - 'goal' | 'strategy' | 'measure'
 *   currentText - 目前已輸入的文字（可能是空的）
 *   onConfirm   - (text) => void  // text 可能是空字串（讓 AI 自行補充）
 *   onCancel    - () => void
 *   darkMode
 */
export default function AiConfirmDialog({ type, currentText = '', onConfirm, onCancel, darkMode = true }) {
  const [text, setText] = useState(currentText)

  const T = darkMode ? DARK : LIGHT

  const config = {
    goal: {
      title: '⚡ AI 生成 Strategies',
      desc: '根據此 Goal，AI 將生成 2~3 個 Strategies，以及各自的 MP、MD 指標和待辦事項。',
      label: 'Goal 內容',
      placeholder: '輸入 Goal 描述，或留空讓 AI 自行補充…',
      hint: '留空時 AI 會根據 Objective 自動生成合適的 Goal 內容',
      confirmLabel: '⚡ 生成 Strategies',
    },
    strategy: {
      title: '⚡ AI 生成 Measures',
      desc: '根據此 Strategy，AI 將生成 MP（過程指標）和 MD（結果指標），以及各自的待辦事項。',
      label: 'Strategy 內容',
      placeholder: '輸入 Strategy 描述，或留空讓 AI 自行補充…',
      hint: '留空時 AI 會根據 Goal 自動生成合適的 Strategy 內容',
      confirmLabel: '⚡ 生成 Measures',
    },
    measure: {
      title: '⚡ AI 生成待辦事項',
      desc: '根據此 KPI，AI 將生成 3~5 個具體可執行的待辦事項。',
      label: 'KPI 內容',
      placeholder: '輸入 KPI 名稱，或留空讓 AI 自行補充…',
      hint: '留空時 AI 會根據 Strategy 自動補充合適的待辦事項',
      confirmLabel: '⚡ 生成待辦事項',
    },
  }[type] || {}

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', zIndex: 600 }}
        onClick={onCancel}
      />

      {/* Dialog */}
      <div style={{ ...D.dialog, background: T.bg, border: `1px solid ${T.border}` }}>

        {/* Header */}
        <div style={D.header}>
          <div style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: '17px', color: T.text }}>
            {config.title}
          </div>
          <button style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: '16px' }} onClick={onCancel}>✕</button>
        </div>

        {/* Description */}
        <p style={{ fontSize: '13px', color: T.textSub, lineHeight: 1.6, marginBottom: '18px' }}>
          {config.desc}
        </p>

        {/* Text input */}
        <div style={{ marginBottom: '6px' }}>
          <label style={{ fontSize: '10px', fontFamily: '"DM Mono", monospace', color: T.textMuted, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            {config.label}
          </label>
        </div>
        <textarea
          style={{ ...D.textarea, background: T.inputBg, border: `1px solid ${T.border}`, color: T.text }}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={config.placeholder}
          rows={3}
          autoFocus
        />

        {/* Hint */}
        <div style={{ fontSize: '11px', color: T.textMuted, marginTop: '6px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
          <span style={{ color: '#f0a500', flexShrink: 0 }}>💡</span>
          <span>{config.hint}</span>
        </div>

        {/* Warning if text is empty */}
        {!text.trim() && (
          <div style={{ fontSize: '12px', color: '#f0a500', background: 'rgba(240,165,0,0.08)', border: '1px solid rgba(240,165,0,0.2)', borderRadius: '5px', padding: '8px 12px', marginBottom: '16px' }}>
            ⚠ 內容為空，AI 將根據目前 OGSM 脈絡自行補充。
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            style={{ ...D.btn, background: 'transparent', color: T.textMuted, border: `1px solid ${T.border}` }}
            onClick={onCancel}
          >
            取消
          </button>
          <button
            style={{ ...D.btn, background: '#f0a500', color: '#000', border: 'none', fontWeight: 700 }}
            onClick={() => onConfirm(text.trim())}
          >
            {config.confirmLabel}
          </button>
        </div>
      </div>
    </>
  )
}

const DARK  = { bg: '#161b27', border: '#334060', text: '#e8ecf4', textSub: '#b0bac9', textMuted: '#8a95ae', inputBg: '#1e2535' }
const LIGHT = { bg: '#ffffff', border: '#d1d9e8', text: '#1a2133', textSub: '#445069', textMuted: '#8a9ab8', inputBg: '#f3f7fd' }

const D = {
  dialog: {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '480px', maxWidth: '92vw',
    borderRadius: '12px', padding: '28px',
    zIndex: 601,
    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
    animation: 'scaleIn 0.18s ease',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  textarea: {
    width: '100%', borderRadius: '6px',
    fontFamily: '"Noto Sans TC", sans-serif', fontSize: '13px',
    padding: '10px 12px', outline: 'none', resize: 'vertical', lineHeight: 1.6,
  },
  btn: {
    padding: '9px 20px', borderRadius: '6px',
    fontFamily: '"Noto Sans TC", sans-serif', fontSize: '13px',
    cursor: 'pointer', transition: 'all 0.15s',
    display: 'inline-flex', alignItems: 'center', gap: '5px',
  },
}