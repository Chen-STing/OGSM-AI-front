/**
 * VoiceOGSM.jsx
 *
 * 語音輸入 OGSM — 說話即可更新欄位
 *
 * 使用方式：
 *   <VoiceOGSMButton
 *     field="objective"          // 'objective' | 'goals' | 'strategies' | 'measures' | 'auto'
 *     fieldIndex={0}             // 若 field 是陣列（goals/strategies/measures），指定第幾個
 *     onResult={(text) => ...}   // 辨識結果回呼（你自己更新欄位）
 *     dark={darkMode}
 *   />
 *
 *   // 也可使用完整的語音控制面板：
 *   <VoiceOGSMPanel
 *     project={project}
 *     dark={darkMode}
 *     onUpdate={(field, index, value) => ...}  // 更新資料
 *     onClose={() => ...}
 *   />
 *
 * 瀏覽器支援：
 *   - Chrome/Edge: 完整支援（包含即時串流轉錄）
 *   - Safari: 基本支援（需用戶手動允許麥克風）
 *   - Firefox: 不支援 Web Speech API（會顯示提示）
 *
 * 語音指令支援（在 'auto' 模式下）：
 *   "目標是..."         → 更新 Objective
 *   "第一個目的..."      → 更新 Goals[0]
 *   "策略..."           → 更新 Strategies
 *   "衡量指標..."        → 更新 Measures
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

// ─── 常數 ──────────────────────────────────────────────────────────────────────

const FIELD_CONFIG = {
  objective:   { label: 'Objective', color: '#2222f0', icon: 'O', hint: '說出你的核心目標…' },
  goals:       { label: 'Goals',     color: '#FF00FF', icon: 'G', hint: '說出你的目的…' },
  strategies:  { label: 'Strategies', color: '#FF6600', icon: 'S', hint: '說出你的策略…' },
  measures:    { label: 'Measures',  color: '#00AA44', icon: 'M', hint: '說出衡量指標…' },
  auto:        { label: 'AUTO',      color: '#FFFF00', icon: '⚡', hint: '說出欄位名稱與內容，例如「目標是…」' },
}

// 語音自動路由的關鍵詞
const FIELD_KEYWORDS = {
  objective:  ['目標', '目的是', 'objective', 'o:'],
  goals:      ['目的', 'goal', '第一個', '第二個', '第三個', 'g:'],
  strategies: ['策略', 'strategy', 's:'],
  measures:   ['衡量', '指標', 'measure', 'kpi', 'm:'],
}

function detectField(transcript) {
  const t = transcript.toLowerCase()
  for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
    if (keywords.some(k => t.includes(k.toLowerCase()))) return field
  }
  return null
}

// 從語音中提取數字（第X個）
function detectIndex(transcript) {
  const map = { '第一': 0, '第二': 1, '第三': 2, '第四': 3, '第五': 4, '第六': 5 }
  for (const [k, v] of Object.entries(map)) {
    if (transcript.includes(k)) return v
  }
  return 0
}

// ─── 波形動畫 ─────────────────────────────────────────────────────────────────

function WaveAnimation({ active, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:3, height:24 }}>
      {Array.from({length: 5}, (_,i) => (
        <div
          key={i}
          style={{
            width: 3, height: active ? `${8 + Math.sin(i * 1.2) * 8}px` : 4,
            background: active ? color : 'rgba(128,128,128,0.3)',
            borderRadius: 2,
            transition: 'height 0.1s ease',
            animation: active ? `waveBar 0.8s ease-in-out ${i * 0.1}s infinite alternate` : 'none',
          }}
        />
      ))}
      <style>{`@keyframes waveBar{0%{height:4px}100%{height:20px}}`}</style>
    </div>
  )
}

// ─── useVoiceRecognition Hook ─────────────────────────────────────────────────

function useVoiceRecognition({ lang = 'zh-TW', continuous = false, onResult, onInterim, onError, onStart, onEnd }) {
  const recRef    = useRef(null)
  const [active,  setActive]  = useState(false)
  const [support, setSupport] = useState(true)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { setSupport(false); return }

    const rec = new SpeechRecognition()
    rec.lang        = lang
    rec.continuous  = continuous
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onstart  = () => { setActive(true);  onStart?.() }
    rec.onend    = () => { setActive(false); onEnd?.() }
    rec.onerror  = (e) => {
      setActive(false)
      if (e.error !== 'aborted') onError?.(e.error)
    }
    rec.onresult = (e) => {
      let interim = ''
      let final   = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      if (interim) onInterim?.(interim)
      if (final)   onResult?.(final)
    }

    recRef.current = rec
    return () => { try { rec.stop() } catch {} }
  }, [lang])

  const start = useCallback(() => {
    try { recRef.current?.start() } catch {}
  }, [])

  const stop = useCallback(() => {
    try { recRef.current?.stop() } catch {}
  }, [])

  const toggle = useCallback(() => {
    if (active) stop()
    else start()
  }, [active, start, stop])

  return { active, support, start, stop, toggle }
}

// ─── VoiceOGSMButton — 嵌入欄位旁的迷你按鈕 ─────────────────────────────────

export function VoiceOGSMButton({ field = 'objective', onResult, dark, size = 28 }) {
  const [interim, setInterim] = useState('')
  const [lastResult, setLast] = useState('')
  const cfg = FIELD_CONFIG[field] ?? FIELD_CONFIG.objective

  const { active, support, toggle } = useVoiceRecognition({
    lang: 'zh-TW',
    onResult: (text) => {
      setInterim('')
      setLast(text)
      onResult?.(text)
    },
    onInterim: setInterim,
    onError: () => setInterim(''),
    onEnd: () => setInterim(''),
  })

  if (!support) return null

  return (
    <div style={{ position:'relative', display:'inline-flex', alignItems:'center' }}>
      <button
        onClick={toggle}
        title={active ? '點擊停止錄音' : `語音輸入 ${cfg.label}`}
        style={{
          width: size, height: size,
          background: active ? cfg.color : (dark ? '#222' : '#f0f0f0'),
          border: `2px solid ${active ? cfg.color : (dark ? '#444' : '#ccc')}`,
          boxShadow: active ? `0 0 8px ${cfg.color}66` : 'none',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
          padding: 0,
        }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = cfg.color; e.currentTarget.style.background = dark ? '#333' : '#e8e8e8' }}}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = dark ? '#444' : '#ccc'; e.currentTarget.style.background = dark ? '#222' : '#f0f0f0' }}}
      >
        {active ? (
          <svg width={size*0.5} height={size*0.5} viewBox="0 0 24 24" fill={dark&&!active?'#888':'#fff'}>
            <rect x="6" y="6" width="12" height="12" rx="1"/>
          </svg>
        ) : (
          <svg width={size*0.5} height={size*0.5} viewBox="0 0 24 24" fill="none" stroke={dark?'#888':'#666'} strokeWidth="2">
            <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
          </svg>
        )}
      </button>

      {/* Interim text bubble */}
      {interim && (
        <div style={{
          position: 'absolute', bottom: size + 4, left: '50%', transform: 'translateX(-50%)',
          background: dark ? '#1a1a1a' : '#fff',
          border: `2px solid ${cfg.color}`,
          boxShadow: `3px 3px 0 0 ${cfg.color}`,
          padding: '4px 8px', whiteSpace: 'nowrap',
          fontFamily: '"Noto Sans TC", sans-serif', fontSize: '12px',
          color: dark ? '#e0e0e0' : '#000',
          maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis',
          zIndex: 9999,
        }}>
          {interim}…
        </div>
      )}
    </div>
  )
}

// ─── VoiceOGSMPanel — 完整語音控制面板 ────────────────────────────────────────

export default function VoiceOGSMPanel({ project, dark = false, onUpdate, onClose }) {
  const [targetField, setTarget]   = useState('auto')
  const [targetIndex, setIndex]    = useState(0)
  const [transcript,  setTranscript] = useState('')
  const [interim,     setInterim]    = useState('')
  const [history,     setHistory]    = useState([])
  const [mode,        setMode]       = useState('append')  // 'append' | 'replace'
  const [status,      setStatus]     = useState('idle')    // 'idle' | 'listening' | 'done'

  // Escape 關閉
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleResult = useCallback((text) => {
    setInterim('')
    setTranscript(text)
    setStatus('done')

    let field = targetField
    let index = targetIndex

    if (targetField === 'auto') {
      field = detectField(text) ?? 'objective'
      index = detectIndex(text)
    }

    setHistory(prev => [{ text, field, index, ts: Date.now() }, ...prev.slice(0, 9)])
    onUpdate?.(field, index, text)
  }, [targetField, targetIndex, onUpdate])

  const { active, support, toggle } = useVoiceRecognition({
    lang: 'zh-TW',
    continuous: false,
    onResult: handleResult,
    onInterim: setInterim,
    onStart:  () => setStatus('listening'),
    onEnd:    () => { if (status === 'listening') setStatus('idle') },
    onError:  (err) => { setStatus('idle'); console.warn('Speech error:', err) },
  })

  const cfg  = FIELD_CONFIG[targetField] ?? FIELD_CONFIG.auto
  const bg   = dark ? '#111' : '#fff'
  const text = dark ? '#e0e0e0' : '#000'
  const sub  = dark ? '#555' : '#aaa'
  const bdr  = dark ? '#222' : '#e0e0e0'

  // Array fields
  const arrayFields = ['goals', 'strategies', 'measures']
  const targetArray = arrayFields.includes(targetField)
    ? (project?.[targetField] ?? [])
    : []

  if (!support) return createPortal(
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:99990,background:'rgba(0,0,0,0.4)' }} />
      <div style={{
        position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
        zIndex:99991,background:bg,border:'3px solid #FF3333',
        boxShadow:'8px 8px 0 0 #FF3333',padding:'32px 40px',
        fontFamily:'"Space Grotesk",sans-serif',textAlign:'center',
      }}>
        <div style={{ fontSize:'32px', marginBottom:'12px' }}>🚫</div>
        <div style={{ fontWeight:900, fontSize:'16px', color:'#FF3333', marginBottom:'8px' }}>不支援語音輸入</div>
        <div style={{ fontSize:'13px', color:sub, lineHeight:1.6 }}>
          你的瀏覽器不支援 Web Speech API。<br/>請使用 Chrome 或 Edge。
        </div>
        <button onClick={onClose} style={{ marginTop:'16px', padding:'8px 20px', background:'#FF3333', color:'#fff', border:'2px solid #000', cursor:'pointer', fontWeight:900 }}>關閉</button>
      </div>
    </>,
    document.body
  )

  return createPortal(
    <>
      <style>{`
        @keyframes voiceFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulseRing{0%{transform:scale(1);opacity:0.8}100%{transform:scale(1.8);opacity:0}}
        @keyframes waveBar{0%{height:4px}100%{height:28px}}
        .voice-hist::-webkit-scrollbar{width:4px} .voice-hist::-webkit-scrollbar-thumb{background:${dark?'#333':'#ccc'}}
      `}</style>

      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:99990,background:dark?'rgba(0,0,0,0.7)':'rgba(0,0,0,0.4)' }} />

      <div style={{
        position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
        zIndex:99991,
        width:'min(560px,94vw)',
        background:bg,
        border:`3px solid ${dark?'#fff':'#000'}`,
        boxShadow:`10px 10px 0 0 ${cfg.color}`,
        display:'flex',flexDirection:'column',
        animation:'voiceFadeIn 0.2s ease', overflow:'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding:'12px 20px', borderBottom:`2px solid ${dark?'#222':'#000'}`,
          background:dark?'#0a0a0a':'#f0f0f0',
          display:'flex',alignItems:'center',justifyContent:'space-between',
        }}>
          <div>
            <div style={{ fontFamily:'"DM Mono",monospace',fontSize:'10px',color:cfg.color,fontWeight:900,letterSpacing:'0.1em' }}>
              [ VOICE INPUT ]
            </div>
            <div style={{ fontFamily:'"Space Grotesk",sans-serif',fontWeight:900,fontSize:'16px',color:text }}>
              語音輸入 OGSM
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:'22px',cursor:'pointer',color:text,fontWeight:900,lineHeight:1 }}
            onMouseEnter={e=>e.currentTarget.style.color='#FF3333'} onMouseLeave={e=>e.currentTarget.style.color=text}>×</button>
        </div>

        {/* ── Field selector ── */}
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${bdr}` }}>
          <div style={{ fontFamily:'"DM Mono",monospace',fontSize:'10px',color:sub,letterSpacing:'0.1em',marginBottom:8,fontWeight:900 }}>
            目標欄位
          </div>
          <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
            {Object.entries(FIELD_CONFIG).map(([key, c]) => (
              <button
                key={key}
                onClick={() => setTarget(key)}
                style={{
                  fontFamily:'"Space Grotesk",sans-serif',fontWeight:900,fontSize:'11px',
                  textTransform:'uppercase',letterSpacing:'0.08em',
                  padding:'4px 12px',cursor:'pointer',
                  background: targetField === key ? c.color : (dark?'#1a1a1a':'#f5f5f5'),
                  color:      targetField === key ? (key==='auto'?'#000':'#fff') : (dark?'#888':'#666'),
                  border:    `2px solid ${targetField===key?c.color:(dark?'#333':'#ddd')}`,
                  boxShadow:  targetField === key ? `3px 3px 0 0 ${dark?'#686868':'#000'}` : 'none',
                  transition:'all 0.12s',
                }}
              >{c.icon} {c.label}</button>
            ))}
          </div>

          {/* Array index selector */}
          {arrayFields.includes(targetField) && targetArray.length > 0 && (
            <div style={{ marginTop:8,display:'flex',gap:6,alignItems:'center' }}>
              <span style={{ fontFamily:'"DM Mono",monospace',fontSize:'10px',color:sub }}>更新第</span>
              {targetArray.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  style={{
                    width:24,height:24,
                    background: targetIndex===i ? cfg.color : (dark?'#1a1a1a':'#f0f0f0'),
                    color: targetIndex===i ? '#fff' : (dark?'#888':'#666'),
                    border:`2px solid ${targetIndex===i?cfg.color:(dark?'#333':'#ddd')}`,
                    cursor:'pointer',fontFamily:'"DM Mono",monospace',fontSize:'11px',fontWeight:900,
                  }}
                >{i+1}</button>
              ))}
              <span style={{ fontFamily:'"DM Mono",monospace',fontSize:'10px',color:sub }}>項</span>
            </div>
          )}
        </div>

        {/* ── Main mic area ── */}
        <div style={{ padding:'24px 20px',display:'flex',flexDirection:'column',alignItems:'center',gap:16 }}>

          {/* Mic button */}
          <div style={{ position:'relative' }}>
            {active && (
              <>
                <div style={{
                  position:'absolute',inset:-12,borderRadius:'50%',
                  border:`3px solid ${cfg.color}`,
                  animation:'pulseRing 1.2s ease-out infinite',
                }} />
                <div style={{
                  position:'absolute',inset:-24,borderRadius:'50%',
                  border:`2px solid ${cfg.color}`,opacity:0.4,
                  animation:'pulseRing 1.2s ease-out 0.4s infinite',
                }} />
              </>
            )}
            <button
              onClick={toggle}
              style={{
                width:72,height:72,borderRadius:'50%',
                background: active ? cfg.color : (dark?'#1a1a1a':'#f0f0f0'),
                border:`3px solid ${active?cfg.color:(dark?'#333':'#ccc')}`,
                boxShadow: active ? `0 0 24px ${cfg.color}66` : `4px 4px 0 0 ${dark?'#333':'#ccc'}`,
                cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',
                transition:'all 0.2s',position:'relative',zIndex:1,
              }}
            >
              {active ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
                  <rect x="6" y="6" width="12" height="12" rx="1"/>
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={dark?'#888':'#555'} strokeWidth="2">
                  <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                </svg>
              )}
            </button>
          </div>

          {/* Wave + status */}
          {active && <WaveAnimation active={true} color={cfg.color} />}

          <div style={{
            fontFamily:'"DM Mono",monospace',fontSize:'12px',fontWeight:700,
            color: active ? cfg.color : sub,
            letterSpacing:'0.08em',textTransform:'uppercase',
          }}>
            {active ? '正在聆聽…' : (status==='done' ? '✓ 已更新' : '點擊麥克風開始錄音')}
          </div>

          {/* Hint */}
          <div style={{
            fontFamily:'"Noto Sans TC",sans-serif',fontSize:'11px',color:sub,
            textAlign:'center',lineHeight:1.6,
            background:dark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.03)',
            border:`1px dashed ${bdr}`,padding:'6px 12px',width:'100%',
          }}>
            {cfg.hint}
            {targetField === 'auto' && (
              <><br/>例如：「目標是提升市場佔有率達到 30%」<br/>「第二個策略是加強社群媒體行銷」</>
            )}
          </div>

          {/* Interim display */}
          {(interim || transcript) && (
            <div style={{
              width:'100%',
              background:dark?'#0d0d0d':'#f8f8f8',
              border:`2px solid ${interim?cfg.color:bdr}`,
              padding:'10px 12px',
              fontFamily:'"Noto Sans TC",sans-serif',fontSize:'13px',
              color:dark?'#e0e0e0':'#222',lineHeight:1.6,
              minHeight:48,
            }}>
              {interim || transcript}
              {interim && <span style={{ animation:'pulseRing 0.8s infinite',display:'inline-block',marginLeft:2 }}>▋</span>}
            </div>
          )}
        </div>

        {/* ── History ── */}
        {history.length > 0 && (
          <div style={{ borderTop:`1px solid ${bdr}`, padding:'10px 20px 14px', maxHeight:160, overflowY:'auto' }} className="voice-hist">
            <div style={{ fontFamily:'"DM Mono",monospace',fontSize:'9px',color:sub,letterSpacing:'0.1em',fontWeight:900,marginBottom:6 }}>
              RECENT INPUTS
            </div>
            {history.map((h, i) => {
              const hCfg = FIELD_CONFIG[h.field] ?? FIELD_CONFIG.objective
              return (
                <div key={h.ts} style={{
                  display:'flex',gap:'8px',alignItems:'flex-start',
                  padding:'4px 0', borderBottom:i<history.length-1?`1px dashed ${dark?'#1e1e1e':'#eee'}`:'none',
                  opacity: i===0?1:0.6,
                }}>
                  <span style={{
                    fontFamily:'"Space Grotesk",sans-serif',fontWeight:900,fontSize:'9px',
                    background:hCfg.color,color:'#fff',padding:'1px 4px',flexShrink:0,marginTop:1,
                  }}>{hCfg.icon}</span>
                  <span style={{
                    fontFamily:'"Noto Sans TC",sans-serif',fontSize:'11px',color:dark?'#888':'#666',
                    flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                  }}>{h.text}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>,
    document.body
  )
}