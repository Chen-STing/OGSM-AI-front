import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

// ── 密文識別前綴（與後端 CipherService 保持一致）────────────────────────────
const CIPHER_PREFIX = 'ENC:v1:'

// ── 後端 Cipher API ───────────────────────────────────────────────────────────
export const CipherApi = {
  isEncrypted: (text) => text.trimStart().startsWith(CIPHER_PREFIX),

  encrypt: async (text, password) => {
    const res = await fetch('/api/cipher/encrypt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `HTTP ${res.status}`)
    }
    const data = await res.json()
    return data.cipherText
  },

  decrypt: async (cipherText, password) => {
    const res = await fetch('/api/cipher/decrypt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cipherText, password }),
    })
    if (res.status === 422) throw new Error('密碼錯誤或密文已損毀')
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `HTTP ${res.status}`)
    }
    const data = await res.json()
    return data.plainText
  },
}

// ── CipherPopup — 密碼輸入 + 加解密結果顯示（後端 AES-256-GCM）─────────────
export default function CipherPopup({ position, mode, onCipher, onClose, onReplace, canReplace, dark }) {
  const ref      = useRef(null)
  const inputRef = useRef(null)
  const [password, setPassword] = useState('')
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)
  

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50) }, [])

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

  const handleSubmit = async () => {
    if (!password) { setError('請輸入密碼'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await onCipher(password)
      setResult(res)
    } catch (e) {
      setError(e.message || (mode === 'decrypt' ? '解密失敗' : '加密失敗'))
    } finally {
      setLoading(false)
    }
  }

  const safeX      = Math.min(position.x, window.innerWidth - 360)
  const safeY      = position.y + 12
  const top        = safeY + 20 > window.innerHeight - 280 ? position.y - 280 : safeY
  const isEncMode  = mode === 'encrypt'
  const accentColor_bd = isEncMode ? '#d45a09' : '#730bb8'
  const accentColor_sh = isEncMode ? '#813401' : '#4f0381'
  const accentColor = isEncMode ? '#FF6600' : '#ab59e2'
  const label       = isEncMode ? '🔐 加密' : '🔓 解密'

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
    onMouseLeave: (e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = bgColor === 'transparent' ? 'none' : `2px 2px 0 0 #000`; e.currentTarget.style.background = bgColor; e.currentTarget.style.color = bgColor === 'transparent' ? (dark ? '#fff' : '#000') : '#000' },
    onMouseDown:  (e) => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = bgColor === 'transparent' ? 'none' : '1px 1px 0 0 #000' },
    onMouseUp:    (e) => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `4px 4px 0 0 ${shadowColor}` },
  })

  const popup = (
    <div ref={ref} className="cipher-popup" style={{
      position: 'fixed', left: Math.max(8, safeX), top,
      zIndex: 100001, width: '340px',
      background: dark ? '#1a1a1a' : '#fff',
      border: `3px solid ${accentColor_bd}`,
      boxShadow: `6px 6px 0 0 ${accentColor_sh}`,
      padding: '14px 16px 12px', pointerEvents: 'auto',
      transform: 'translateZ(0)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: accentColor }}>
          {label}
          <span style={{ marginLeft: '8px', opacity: 0.5, fontSize: '10px', color: dark ? '#aaa' : '#555' }}>
            AES-256-GCM
          </span>
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: dark ? '#fff' : '#000', fontWeight: 900, transition: 'color 0.15s' }} title="關閉 (Esc)"
          onMouseEnter={e=>{e.currentTarget.style.color='#c96e6e'}} onMouseLeave={e=>{e.currentTarget.style.color=dark ? '#fff' : '#000'}}>×</button>
      </div>

      {/* 密碼輸入（尚未得到結果前顯示） */}
      {!result && (<>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: dark ? '#aaa' : '#555', marginBottom: '4px' }}>
            密碼
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              ref={inputRef}
              type={'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null) }}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              placeholder="輸入密碼…"
              style={{
                flex: 1, padding: '7px 10px', fontSize: '14px',
                background: dark ? '#111' : '#f8f8f8',
                border: `2px solid ${error ? '#FF0000' : (dark ? '#444' : '#ccc')}`,
                color: dark ? '#fff' : '#000', outline: 'none', fontFamily: 'inherit',
              }}
            />
            
          </div>
          {error && (
            <div style={{ marginTop: '5px', fontSize: '11px', color: '#FF0000', fontWeight: 700 }}>
              ⚠ {error}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={handleSubmit} disabled={loading}
            style={{ ...btnBase, background: accentColor, color: '#fff', border: `2px solid ${accentColor}`, opacity: loading ? 0.6 : 1 }}
            {...makeBtnHandlers(accentColor, accentColor, '#fff')}
          >{loading ? '處理中…' : isEncMode ? '加密' : '解密'}</button>
          <button onClick={onClose}
            style={{ ...btnBase, background: 'transparent', color: dark ? '#fff' : '#000', border: `2px solid ${dark ? '#555' : '#ccc'}`, boxShadow: 'none' }}
            {...makeBtnHandlers('transparent', '#c96e6e', '#fff')}
          >取消</button>
        </div>
      </>)}

      {/* 結果 */}
      {result && (<>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: dark ? '#aaa' : '#555', marginBottom: '4px' }}>
          {isEncMode ? '加密結果' : '解密結果'}
        </div>
        <div style={{
          fontSize: '13px', lineHeight: 1.5, color: dark ? '#f0f0f0' : '#111',
          wordBreak: 'break-all', background: dark ? '#111' : '#f8f8f8',
          border: `2px solid ${dark ? '#333' : '#e0e0e0'}`,
          padding: '8px 10px', marginBottom: '10px',
          maxHeight: '130px', overflowY: 'auto',
        }}>{result}</div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {canReplace && (
            <button onClick={() => { onReplace(result); onClose() }}
              style={{ ...btnBase, background: '#00FF00', color: '#000' }}
              title="以結果取代選取的文字"
              {...makeBtnHandlers('#00FF00', '#00CC00', '#000')}
            >✎ 替換</button>
          )}
          <button onClick={() => navigator.clipboard.writeText(result).catch(() => {})}
            style={{ ...btnBase, background: '#FFFF00', color: '#000' }}
            {...makeBtnHandlers('#FFFF00', '#CCCC00', '#000')}
          >複製</button>
          <button onClick={onClose}
            style={{ ...btnBase, background: 'transparent', color: dark ? '#fff' : '#000', border: `2px solid ${dark ? '#555' : '#ccc'}`, boxShadow: 'none' }}
            {...makeBtnHandlers('transparent', '#c96e6e', '#fff')}
          >關閉</button>
        </div>
      </>)}
    </div>
  )

  return createPortal(popup, document.body)
}
