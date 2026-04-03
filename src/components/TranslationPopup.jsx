import { useRef, useEffect } from 'react'

export const TRANSLATE_MODE_LABEL = {
  'zh-en': '中 ↔ 英', 'zh-ja': '中 ↔ 日', 'zh-vi': '中 ↔ 越',
  'zh-ko': '中 ↔ 韓', 'zh-ar': '中 ↔ 阿拉伯', 'zh-es': '中 ↔ 西班牙',
  'zh-ru': '中 ↔ 俄', 'zh-fr': '中 ↔ 法'
}
export const TRANSLATE_MODE_COLOR = {
  'zh-en': '#0000FF', 'zh-ja': '#FF00FF', 'zh-vi': '#00AA44',
  'zh-ko': '#FFA500', 'zh-ar': '#8B4513', 'zh-es': '#FF4500',
  'zh-ru': '#DC143C', 'zh-fr': '#1E90FF'
}

export default function TranslationPopup({ result, position, loading, mode, canReplace, onReplace, onClose, dark }) {
  const ref = useRef(null)

  useEffect(() => {
    const handleKey   = (e) => { if (e.key === 'Escape') onClose() }
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    window.addEventListener('keydown', handleKey)
    window.addEventListener('mousedown', handleClick)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  const safeX       = Math.min(position.x, window.innerWidth - 340)
  const safeY       = position.y + 12
  const accentColor = TRANSLATE_MODE_COLOR[mode] ?? '#0000FF'
  const modeLabel   = TRANSLATE_MODE_LABEL[mode] ?? 'AI 翻譯'

  const btnBase = {
    fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
    fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '4px 12px', cursor: 'pointer',
    border: '2px solid #000', boxShadow: '2px 2px 0 0 #000',
    transition: 'all 0.15s'
  }

  const shadowColor = dark ? '#686868' : '#000'
  const makeBtnHandlers = (bgColor, hoverBg, hoverColor) => ({
    onMouseEnter: (e) => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `4px 4px 0 0 ${shadowColor}`; e.currentTarget.style.background = hoverBg || bgColor; e.currentTarget.style.color = hoverColor || '#000' },
    onMouseLeave: (e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `2px 2px 0 0 #000`; e.currentTarget.style.background = bgColor; e.currentTarget.style.color = bgColor === 'transparent' ? (dark ? '#fff' : '#000') : '#000' },
    onMouseDown:  (e) => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = '1px 1px 0 0 #000' },
    onMouseUp:    (e) => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `4px 4px 0 0 ${shadowColor}` },
  })

  return (
    <div ref={ref} className="translate-popup" style={{
      position: 'fixed',
      left: Math.max(8, safeX),
      top: safeY + 20 > window.innerHeight - 180 ? position.y - 180 : safeY,
      zIndex: 99999, width: '320px',
      background: dark ? '#1a1a1a' : '#fff',
      border: `3px solid ${dark ? '#fff' : '#000'}`,
      boxShadow: dark ? '6px 6px 0 0 rgba(255,255,255,0.25)' : '6px 6px 0 0 #000',
      padding: '14px 16px 12px', pointerEvents: 'auto',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: accentColor }}>
          ⚡ {modeLabel}
          {canReplace && !loading && result && (
            <span style={{ marginLeft: '8px', color: '#00AA00', fontSize: '10px' }}>· 可替換</span>
          )}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '16px', lineHeight: 1, cursor: 'pointer', color: dark ? '#fff' : '#000', padding: '0 2px', fontWeight: 900, transition: 'color 0.15s' }} title="關閉 (Esc)"
          onMouseEnter={e=>{e.currentTarget.style.color='#c96e6e'}} onMouseLeave={e=>{e.currentTarget.style.color=dark ? '#fff' : '#000'}}>×</button>
      </div>

      {/* Body */}
      <div style={{ minHeight: '48px', fontSize: '14px', lineHeight: 1.6, color: dark ? '#f0f0f0' : '#111', wordBreak: 'break-word', background: dark ? '#111' : '#f8f8f8', border: `2px solid ${dark ? '#333' : '#e0e0e0'}`, padding: '8px 10px', marginBottom: '10px' }}>
        {loading ? <span style={{ opacity: 0.5, fontStyle: 'italic' }}>翻譯中…</span>
          : result ? result
          : <span style={{ opacity: 0.4, fontStyle: 'italic' }}>翻譯失敗，請再試一次</span>}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {result && !loading && canReplace && (
          <button onClick={() => { onReplace(result); onClose() }} style={{ ...btnBase, background: '#00FF00', color: '#000' }} title="以翻譯結果取代選取文字" {...makeBtnHandlers('#00FF00', '#00CC00', '#000')}>✎ 替換</button>
        )}
        {result && !loading && (
          <button onClick={() => navigator.clipboard.writeText(result).catch(() => {})} style={{ ...btnBase, background: '#FFFF00', color: '#000' }} {...makeBtnHandlers('#FFFF00', '#CCCC00', '#000')}>複製</button>
        )}
        <button onClick={onClose} style={{ ...btnBase, background: 'transparent', color: dark ? '#fff' : '#000', border: `2px solid ${dark ? '#555' : '#ccc'}`, boxShadow: 'none' }} {...makeBtnHandlers('transparent', '#c96e6e', '#fff')}>關閉</button>
      </div>
    </div>
  )
}
