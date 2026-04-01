import { useState } from 'react'

// ─── VIBRANT BRUTALIST DESIGN TOKENS ────────────────────────────────────────
const ACCENT_BLUE   = "#0000FF";
const ACCENT_PINK   = "#FF00FF";
const ACCENT_YELLOW = "#FFFF00";

// ─── THEME CONFIGURATION (與 GenerateModal 完全一致) ─────────────────────────
const DARK = {
  bg:       '#2A2A2A',
  text:     '#FFFFFF',
  textSub:  '#CCCCCC',
  border:   '#c5c3c3',
  border_2: '#d5a8a8',
  inputBg:  'rgb(149, 148, 148)',
  altBg:    'rgba(255,255,255,0.15)',
  grid:     'rgba(255,255,255,0.06)',
  scanline: 'rgba(255,255,255,0.2)',
  backdrop: 'rgba(0,0,0,0.85)',
  headerBg: '#4d4d4d',
}

const LIGHT = {
  bg:       '#FFFFFF',
  text:     '#000000',
  textSub:  'rgba(0,0,0,0.7)',
  border:   '#000000',
  border_2: '#000000',
  inputBg:  'rgba(0,0,255,0.04)',
  altBg:    '#f0f0f0',
  grid:     'rgba(0,0,0,0.04)',
  scanline: 'rgba(0,0,0,0.2)',
  backdrop: 'rgba(255,255,255,0.8)',
  headerBg: 'rgb(18, 18, 18)',
}

/**
 * AiConfirmDialog — 通用 AI 局部生成確認框 (GenerateModal 風格)
 * props:
 *   type        - 'goal' | 'strategy' | 'measure'
 *   currentText - 目前已輸入的文字（可能是空的）
 *   onConfirm   - (text) => void
 *   onCancel    - () => void
 *   darkMode
 */
export default function AiConfirmDialog({
  type,
  currentText = '',
  onConfirm,
  onCancel,
  darkMode = true,
}) {
  const [text, setText] = useState(currentText)
  const T = darkMode ? DARK : LIGHT

  // ── 依 type 決定文案 ──────────────────────────────────────────────────────
  const config = {
    goal: {
      headerLabel:  'AI 生成 STRATEGIES',
      desc:         '根據此 Goal，AI 將生成 2～3 個 Strategies，以及各自的定量指標與 MP 檢核步驟。',
      inputLabel:   'GOAL 內容',
      placeholder:  '輸入 Goal 描述，或留空讓 AI 自行補充…',
      hint:         '留空時 AI 會根據 Objective 自動生成合適的 Goal 內容',
      confirmLabel: '⚡ 生成 Strategies',
    },
    strategy: {
      headerLabel:  'AI 生成 MEASURES',
      desc:         '根據此 Strategy，AI 將生成定量指標，以及各指標對應的 MP 檢核步驟。',
      inputLabel:   'STRATEGY 內容',
      placeholder:  '輸入 Strategy 描述，或留空讓 AI 自行補充…',
      hint:         '留空時 AI 會根據 Goal 自動生成合適的 Strategy 內容',
      confirmLabel: '⚡ 生成 Measures',
    },
    measure: {
      headerLabel:  'AI 生成 MP 檢核步驟',
      desc:         '根據此定量指標，AI 將生成 3～5 個具體可執行的 MP 檢核步驟。',
      inputLabel:   '定量指標內容',
      placeholder:  '輸入定量指標名稱，或留空讓 AI 自行補充…',
      hint:         '留空時 AI 會根據 Strategy 自動生成合適的定量指標與檢核步驟',
      confirmLabel: '⚡ 生成 MP 檢核步驟',
    },
  }[type] || {}

  const isEmpty = !text.trim()

  const handleKey = (e) => {
    if (e.key === 'Escape') onCancel()
  }

  // ── 按鈕 hover / active 樣式 handlers ────────────────────────────────────
  const shadowBase  = `4px 4px 0 0 ${darkMode ? '#868686' : '#000'}`
  const shadowHover = `6px 6px 0 0 ${darkMode ? '#868686' : '#000'}`

  const cancelHover  = (e) => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = shadowHover; e.currentTarget.style.background = darkMode ? '#636363' : '#858585'; }
  const cancelLeave  = (e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = shadowBase; e.currentTarget.style.background = T.bg; }
  const cancelDown   = (e) => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = `2px 2px 0 0 ${T.border}`; }
  const cancelUp     = (e) => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = shadowHover; }

  const confirmHover = (e) => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = shadowHover; e.currentTarget.style.background = darkMode ? '#286390' : '#0b4979'; e.currentTarget.style.color = T.bg; }
  const confirmLeave = (e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = shadowBase; e.currentTarget.style.background = ACCENT_YELLOW; e.currentTarget.style.color = '#000'; }
  const confirmDown  = (e) => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = `2px 2px 0 0 ${T.border}`; }
  const confirmUp    = (e) => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = shadowHover; }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: T.backdrop, backdropFilter: 'blur(4px)',
        zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.3s ease',
      }}
      onClick={e => e.target === e.currentTarget && onCancel()}
      onKeyDown={handleKey}
    >
      <style>{`
        @keyframes acd-starFloat   { 0% { transform: translate(0,0) rotate(0deg) scale(1); } 25% { transform: translate(20px,-30px) rotate(90deg) scale(1.25); } 50% { transform: translate(-10px,20px) rotate(180deg) scale(0.85); } 75% { transform: translate(30px,10px) rotate(270deg) scale(1.15); } 100% { transform: translate(0,0) rotate(360deg) scale(1); } }
        @keyframes acd-crossFloat  { 0% { transform: translate(0,0) rotate(0deg) scale(1); } 33% { transform: translate(-25px,20px) rotate(120deg) scale(1.2); } 66% { transform: translate(15px,-15px) rotate(240deg) scale(0.8); } 100% { transform: translate(0,0) rotate(360deg) scale(1); } }
        @keyframes acd-circleFloat { 0% { transform: translate(0,0) scale(1); } 33% { transform: translate(20px,-25px) scale(1.6); } 66% { transform: translate(-15px,15px) scale(0.88); } 100% { transform: translate(0,0) scale(1); } }
        @keyframes acd-triFloat    { 0% { transform: translate(0,0) rotate(0deg) scale(1); } 50% { transform: translate(-20px,-30px) rotate(180deg) scale(1.2); } 100% { transform: translate(0,0) rotate(360deg) scale(1); } }
      `}</style>
      <div
        className="b-card animate-scale-in"
        role="dialog"
        aria-modal="true"
        style={{
          background: T.bg, color: T.text,
          width: '520px', maxWidth: '92vw', maxHeight: '90vh',
          border: `4px solid ${T.border}`,
          boxShadow: `8px 8px 0px ${darkMode ? '#223fce' : '#7389dd'}`,
          position: 'relative',
          overflow: 'hidden',
          transition: 'background 0.3s ease, color 0.3s ease, border 0.3s ease, box-shadow 0.3s ease',
          cursor: 'default',
        }}
      >
        {/* ─── 浮動裝飾圖形（與 GenerateModal 完全一致）─── */}
        {/* 左下角星星 */}
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', color: '#00ccff', opacity: 0.18, pointerEvents: 'none', zIndex: 0, animation: 'acd-starFloat 20s infinite ease-in-out' }}>
          <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
            <path d="M12 2.5L14.7 8.8L21.5 9.5L16.3 14L17.8 20.7L12 17.2L6.2 20.7L7.7 14L2.5 9.5L9.3 8.8L12 2.5Z" />
          </svg>
        </div>
        {/* 右上角十字 */}
        <div style={{ position: 'absolute', top: '15%', right: '7%', color: '#ff0000', opacity: 0.18, pointerEvents: 'none', zIndex: 0, animation: 'acd-crossFloat 16s infinite ease-in-out' }}>
          <svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="square">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        {/* 右下角空心圓 */}
        <div style={{ position: 'absolute', bottom: '32%', right: '37%', color: '#00ff2a', opacity: 0.18, pointerEvents: 'none', zIndex: 0, animation: 'acd-circleFloat 22s infinite ease-in-out' }}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
        {/* 左上角空心三角 */}
        <div style={{ position: 'absolute', top: '15%', left: '1%', color: '#d400ff', opacity: 0.2, pointerEvents: 'none', zIndex: 0, animation: 'acd-triFloat 25s infinite ease-in-out' }}>
          <svg width="110" height="110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter">
            <polygon points="12,2 22,20 2,20" />
          </svg>
        </div>
        {/* ── 背景網格 ── */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(to right, ${T.grid} 1px, transparent 1px), linear-gradient(to bottom, ${T.grid} 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
          transition: 'background-image 0.3s ease',
        }} />

        {/* ── 掃描線動畫 ── */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
          <div style={{
            position: 'absolute', left: 0, right: 0, height: '2px',
            background: `linear-gradient(to right, transparent, ${T.scanline}, transparent)`,
            animation: 'progress-slide 2.5s linear infinite',
          }} />
        </div>

        {/* ── Header ── */}
        <div style={{
          background: T.headerBg, padding: '12px 28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'relative', zIndex: 10, transition: 'background 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: ACCENT_YELLOW, padding: '8px', display: 'flex', alignItems: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
                <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
              </svg>
            </div>
            <h2 style={{
              fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
              fontSize: '20px', letterSpacing: '-0.03em', textTransform: 'uppercase',
              color: T.bg, margin: 0,
            }}>
              {config.headerLabel}
            </h2>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'none', border: 'none', color: T.bg,
              fontSize: '28px', lineHeight: 1,
              transition: 'color 0.15s', cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = ACCENT_PINK)}
            onMouseLeave={e => (e.currentTarget.style.color = T.bg)}
          >✕</button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 28px', position: 'relative', zIndex: 10, overflowY: 'auto', maxHeight: 'calc(90vh - 70px)' }}>

          {/* Description */}
          <p style={{
            fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: '14px',
            lineHeight: 1.5, color: T.textSub,
            marginBottom: '20px', marginTop: 0,
            textTransform: 'uppercase', transition: 'color 0.3s ease',
          }}>
            {config.desc}
          </p>

          {/* Input label */}
          <label style={{
            fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
            letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block',
            marginBottom: '8px', color: T.text, transition: 'color 0.3s ease',
          }}>
            {config.inputLabel}
          </label>

          {/* Textarea */}
          <textarea
            style={{
              width: '100%', padding: '14px 16px', fontSize: '15px', fontWeight: 700,
              border: `4px solid ${T.border}`, boxShadow: 'none',
              fontFamily: '"Space Grotesk", "Noto Sans TC", sans-serif',
              color: T.text,
              background: 'transparent',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
              resize: 'vertical', minHeight: '90px', outline: 'none', lineHeight: 1.6,
              transition: 'background 0.3s ease, color 0.3s ease, border 0.3s ease',
            }}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={config.placeholder}
            rows={3}
            autoFocus
          />

          {/* Hint tag row */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            marginTop: '10px', marginBottom: '16px',
          }}>
            <span style={{
              fontSize: '13px', fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 700, lineHeight: 1.5,
              color: T.textSub, transition: 'color 0.3s ease',
            }}>
              💡{config.hint}
            </span>
          </div>

          {/* MD / MP 說明 (與 GenerateModal 一致) */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
            <span style={{
              background: ACCENT_YELLOW, color: '#000', border: `2px solid ${T.border}`,
              fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
              padding: '2px 6px', letterSpacing: '0.05em', flexShrink: 0, marginTop: '2px',
              transition: 'border 0.3s ease',
            }}>MD</span>
            <span style={{ fontSize: '13px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, lineHeight: 1.5, color: T.text, transition: 'color 0.3s ease' }}>
              定量指標 — 監控最終產出數字與績效
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
            <span style={{
              background: ACCENT_BLUE, color: '#fff', border: `2px solid ${T.border}`,
              fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
              padding: '2px 6px', letterSpacing: '0.05em', flexShrink: 0, marginTop: '2px',
              transition: 'border 0.3s ease',
            }}>MP</span>
            <span style={{ fontSize: '13px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, lineHeight: 1.5, color: T.text, transition: 'color 0.3s ease' }}>
              檢核步驟 — 每個定量指標底下的可執行行動
            </span>
          </div>

          {/* 空白警告（與 GenerateModal 的 loading 框架完全一致） */}
          {isEmpty && (
            <div style={{
              marginBottom: '20px', padding: '14px 16px',
              border: `4px solid ${T.border_2}`,
              background: '#de993f', color: '#000',
            }}>
              <div style={{
                fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
                fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                ⚠ 內容為空 — AI 將根據目前 OGSM 脈絡自行補充
              </div>
            </div>
          )}

          {/* ── Actions ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
            {/* 取消 */}
            <button
              onClick={onCancel}
              style={{
                padding: '10px 20px',
                fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
                fontSize: '15px', textTransform: 'uppercase',
                background: T.bg, color: T.text,
                border: `4px solid ${T.border}`,
                boxShadow: shadowBase,
                transition: 'all 0.15s', cursor: 'pointer',
              }}
              onMouseEnter={cancelHover}
              onMouseLeave={cancelLeave}
              onMouseDown={cancelDown}
              onMouseUp={cancelUp}
            >取消</button>

            {/* 確認生成 */}
            <button
              onClick={() => onConfirm(text.trim())}
              style={{
                padding: '10px 20px',
                fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
                fontSize: '15px', textTransform: 'uppercase',
                background: ACCENT_YELLOW, color: '#000',
                border: `4px solid ${T.border}`,
                boxShadow: shadowBase,
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.15s', cursor: 'pointer',
              }}
              onMouseEnter={confirmHover}
              onMouseLeave={confirmLeave}
              onMouseDown={confirmDown}
              onMouseUp={confirmUp}
            >
              {config.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}