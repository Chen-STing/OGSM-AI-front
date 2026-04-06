/**
 * AIStrategistPanel.jsx
 *
 * AI 策略審查員 — 分析 OGSM 結構並給出具體建議
 *
 * 使用方式：
 *   <AIStrategistPanel
 *     project={project}        // 包含 objective, goals, strategies, measures 的專案
 *     dark={darkMode}
 *     onClose={() => ...}
 *     // AI 呼叫方式選一：
 *     apiKey={anthropicApiKey}         // 直接傳 key（前端直連）
 *     // 或
 *     apiEndpoint="/api/ai/strategist" // 後端 proxy（推薦）
 *   />
 *
 * 後端 proxy 規格（若使用 apiEndpoint）：
 *   POST /api/ai/strategist
 *   Body: { projectData: {...} }
 *   Response: { analysis: string }   // 或 streaming text
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

// ─── 常數 ──────────────────────────────────────────────────────────────────────

const REVIEW_DIMENSIONS = [
  { id: 'alignment',   label: '目標對齊度',   icon: '🎯', desc: 'Goal 是否支撐 Objective？' },
  { id: 'specificity', label: '具體性',        icon: '📏', desc: 'Measure 是否有數字？' },
  { id: 'feasibility', label: '可行性',        icon: '⚙️',  desc: 'Strategy 是否切實際？' },
  { id: 'completeness', label: '完整性',       icon: '📋', desc: '四個維度是否都填寫？' },
  { id: 'consistency', label: '一致性',        icon: '🔗', desc: 'OGSM 各層是否邏輯連貫？' },
]

// ─── 建立分析 prompt ──────────────────────────────────────────────────────────

function buildPrompt(project) {
  const safe = (v) => {
    if (!v) return '（未填寫）'
    if (typeof v === 'string') return v.trim() || '（未填寫）'
    if (Array.isArray(v)) {
      const items = v.map(i => {
        if (typeof i === 'string') return i
        return i?.content || i?.text || i?.title || JSON.stringify(i)
      }).filter(Boolean)
      return items.length ? items.map((t,i) => `${i+1}. ${t}`).join('\n') : '（未填寫）'
    }
    return JSON.stringify(v)
  }

  return `你是一位資深策略顧問，專精 OGSM 框架（Objective, Goals, Strategies, Measures）。
請以繁體中文審查以下 OGSM 計畫，並給出深度、具體、有建設性的分析。

【專案名稱】
${project.name || '未命名'}

【Objective（目標）】
${safe(project.objective)}

【Goals（目的）】
${safe(project.goals)}

【Strategies（策略）】
${safe(project.strategies)}

【Measures（衡量指標）】
${safe(project.measures)}

---

請依以下五個維度進行審查，每個維度給出：
1. 評分（1-10）
2. 主要發現（2-3 句）
3. 具體改善建議（2-3 條可執行的行動建議）

審查維度：
- 🎯 目標對齊度：Goals 是否緊密支撐 Objective？有沒有偏離核心目標的 Goal？
- 📏 具體性：Measures 是否有明確數字、時間點、負責人？是否可以被客觀衡量？
- ⚙️ 可行性：Strategies 是否務實？資源、時間、能力是否匹配？
- 📋 完整性：四個維度是否都填寫完整？有無明顯缺漏？
- 🔗 一致性：從 O→G→S→M 的邏輯鏈是否流暢？有無矛盾或跳躍？

最後給出：
- 整體評分（1-10）與一句話總結
- 最優先應解決的 3 個問題（按重要性排序）
- 一個激勵性的收尾評語

請保持犀利誠實，不要只說好話。格式清晰，每個段落用標題分隔。`
}

// ─── 串流 API 呼叫 ─────────────────────────────────────────────────────────────

async function callAI({ project, apiKey, apiEndpoint, onChunk, onDone, onError, signal }) {
  const projectData = {
    name: project.name,
    objective: project.objective,
    goals: project.goals,
    strategies: project.strategies,
    measures: project.measures,
  }

  try {
    if (apiEndpoint) {
      // 後端 proxy（推薦）
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectData }),
        signal,
      })
      if (!res.ok) {
        let detail = ''
        try {
          const data = await res.json()
          detail = data?.message || data?.error || data?.title || JSON.stringify(data)
        } catch {
          try { detail = await res.text() } catch {}
        }
        throw new Error(detail || `HTTP ${res.status}`)
      }

      // 嘗試 streaming
      if (res.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = res.body.getReader()
        const dec    = new TextDecoder()
        let buf = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') break
              try { onChunk(JSON.parse(data).text ?? '') } catch {}
            }
          }
        }
      } else {
        const data = await res.json()
        onChunk(data.analysis ?? data.text ?? '')
      }
      onDone()
      return
    }

    if (apiKey) {
      // 直連 Anthropic（前端用，建議只在開發時使用）
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'messages-2023-12-15',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 2000,
          stream: true,
          messages: [{ role: 'user', content: buildPrompt(project) }],
        }),
        signal,
      })
      if (!res.ok) throw new Error(`Anthropic API ${res.status}`)
      const reader = res.body.getReader()
      const dec    = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'content_block_delta') {
              onChunk(parsed.delta?.text ?? '')
            }
          } catch {}
        }
      }
      onDone()
      return
    }

    throw new Error('請提供 apiKey 或 apiEndpoint')
  } catch (e) {
    if (e.name !== 'AbortError') onError(e.message)
  }
}

// ─── Markdown-ish renderer (輕量) ────────────────────────────────────────────

function RenderAnalysis({ text, dark }) {
  if (!text) return null

  const lines = text.split('\n')
  return (
    <div style={{ fontFamily:'"Noto Sans TC",sans-serif', fontSize:'13px', lineHeight:1.8, color: dark?'#e0e0e0':'#222' }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height:8 }} />

        // H2: ## Title
        if (line.startsWith('## ')) return (
          <div key={i} style={{
            fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'15px',
            color: dark?'#fff':'#000', marginTop:16, marginBottom:6,
            borderBottom:`2px solid ${dark?'#333':'#e0e0e0'}`, paddingBottom:4,
          }}>{line.slice(3)}</div>
        )

        // H3: ### Title or emoji + bold
        if (line.startsWith('### ') || /^[🎯📏⚙️📋🔗]/.test(line)) return (
          <div key={i} style={{
            fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'13px',
            color:'#FF6600', marginTop:12, marginBottom:4, letterSpacing:'0.02em',
          }}>{line.replace(/^### /, '')}</div>
        )

        // Bold score lines: **評分：X/10**
        if (line.includes('評分') && line.includes('/10')) return (
          <div key={i} style={{
            display:'inline-block',
            fontFamily:'"DM Mono",monospace', fontWeight:900, fontSize:'13px',
            background: dark?'rgba(255,255,0,0.1)':'rgba(255,255,0,0.3)',
            border:'1px solid rgba(255,255,0,0.5)',
            padding:'1px 8px', marginBottom:4,
            color: dark?'#ffff88':'#886600',
          }}>{line.replace(/\*\*/g,'')}</div>
        )

        // Bullet: - item
        if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) return (
          <div key={i} style={{ display:'flex', gap:'6px', marginBottom:3, paddingLeft:8 }}>
            <span style={{ color:'#2222f0', flexShrink:0, marginTop:2 }}>▸</span>
            <span>{line.trim().slice(2)}</span>
          </div>
        )

        // Numbered: 1. item
        if (/^\d+\.\s/.test(line.trim())) return (
          <div key={i} style={{ display:'flex', gap:'6px', marginBottom:3, paddingLeft:8 }}>
            <span style={{
              fontFamily:'"DM Mono",monospace', fontSize:'11px', fontWeight:900,
              color:'#FF00FF', flexShrink:0, minWidth:'18px',
            }}>{line.trim().match(/^\d+/)[0]}.</span>
            <span>{line.trim().replace(/^\d+\.\s/, '')}</span>
          </div>
        )

        // Bold text **...**
        const parts = line.split(/(\*\*[^*]+\*\*)/)
        return (
          <div key={i} style={{ marginBottom:2 }}>
            {parts.map((p, j) =>
              p.startsWith('**') && p.endsWith('**')
                ? <strong key={j}>{p.slice(2,-2)}</strong>
                : p
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── 主組件 ────────────────────────────────────────────────────────────────────

export default function AIStrategistPanel({ project, dark = false, onClose, apiKey, apiEndpoint }) {
  const [status,  setStatus]  = useState('idle')   // 'idle' | 'loading' | 'done' | 'error'
  const [text,    setText]    = useState('')
  const [error,   setError]   = useState('')
  const abortRef = useRef(null)
  const bodyRef  = useRef(null)

  // Escape 關閉
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') { abortRef.current?.abort(); onClose() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // 自動捲動到底
  useEffect(() => {
    if (bodyRef.current && status === 'loading') {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [text, status])

  const startAnalysis = useCallback(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setText('')
    setError('')
    setStatus('loading')

    callAI({
      project,
      apiKey,
      apiEndpoint,
      signal: ctrl.signal,
      onChunk: (chunk) => setText(prev => prev + chunk),
      onDone:  () => setStatus('done'),
      onError: (msg) => { setError(msg); setStatus('error') },
    })
  }, [project, apiKey, apiEndpoint])

  const stopAnalysis = () => {
    abortRef.current?.abort()
    setStatus('done')
  }

  const bg   = dark ? '#111' : '#fff'
  const text_c = dark ? '#e0e0e0' : '#000'
  const sub  = dark ? '#555' : '#aaa'
  const bdr  = dark ? '#222' : '#e0e0e0'

  return createPortal(
    <>
      <style>{`
        @keyframes aiFadeIn{from{opacity:0;transform:translate(-50%,-50%) translateY(8px)}to{opacity:1;transform:translate(-50%,-50%) translateY(0)}}
        @keyframes aiPulse{0%,100%{opacity:0.4;transform:scale(1)}50%{opacity:1;transform:scale(1.2)}}
        .ai-body::-webkit-scrollbar{width:5px} .ai-body::-webkit-scrollbar-track{background:${dark?'#0a0a0a':'#f0f0f0'}} .ai-body::-webkit-scrollbar-thumb{background:${dark?'#333':'#ccc'}}
      `}</style>

      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:99990,background:dark?'rgba(0,0,0,0.7)':'rgba(0,0,0,0.4)' }} />

      <div style={{
        position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
        zIndex:99991,
        width:'min(760px,94vw)',height:'min(680px,92vh)',
        background:bg,
        border:`3px solid ${dark?'#fff':'#000'}`,
        boxShadow:'10px 10px 0 0 #00AA44',
        display:'flex',flexDirection:'column',
        animation:'aiFadeIn 0.2s ease',overflow:'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding:'12px 20px', borderBottom:`2px solid ${dark?'#222':'#000'}`,
          background:dark?'#0a0a0a':'#f0f0f0',
          display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,
        }}>
          <div>
            <div style={{ fontFamily:'"DM Mono",monospace',fontSize:'10px',color:'#00AA44',fontWeight:900,letterSpacing:'0.1em' }}>
              [ AI STRATEGIST ]
            </div>
            <div style={{ fontFamily:'"Space Grotesk",sans-serif',fontWeight:900,fontSize:'18px',color:text_c }}>
              策略審查員 — {project.name || '未命名'}
            </div>
          </div>
          <div style={{ display:'flex',gap:'8px',alignItems:'center' }}>
            {status === 'loading' && (
              <button
                onClick={stopAnalysis}
                style={{
                  fontFamily:'"Space Grotesk",sans-serif',fontWeight:900,fontSize:'11px',
                  textTransform:'uppercase',letterSpacing:'0.08em',
                  padding:'5px 14px',background:'#FF3333',color:'#fff',
                  border:'2px solid #000',boxShadow:'3px 3px 0 0 #000',cursor:'pointer',
                }}
              >⏹ 停止</button>
            )}
            <button onClick={onClose} style={{ background:'none',border:'none',fontSize:'22px',cursor:'pointer',color:text_c,fontWeight:900,lineHeight:1 }}
              onMouseEnter={e=>e.currentTarget.style.color='#FF3333'} onMouseLeave={e=>e.currentTarget.style.color=text_c}>×</button>
          </div>
        </div>

        {/* ── OGSM Preview strip ── */}
        <div style={{
          padding:'8px 20px', borderBottom:`1px solid ${bdr}`,
          display:'flex',gap:'10px',flexWrap:'wrap',
          background:dark?'#0d0d0d':'#f8f8f8',flexShrink:0,
        }}>
          {[
            { key:'O', label: project.objective, color:'#2222f0' },
            { key:'G', label: `${Array.isArray(project.goals)?project.goals.length:0} Goals`, color:'#FF00FF' },
            { key:'S', label: `${Array.isArray(project.strategies)?project.strategies.length:0} Strategies`, color:'#FF6600' },
            { key:'M', label: `${Array.isArray(project.measures)?project.measures.length:0} Measures`, color:'#00AA44' },
          ].map(({ key, label, color }) => (
            <div key={key} style={{ display:'flex',alignItems:'center',gap:'5px' }}>
              <span style={{
                fontFamily:'"Space Grotesk",sans-serif',fontWeight:900,fontSize:'11px',
                background:color,color:'#fff',padding:'1px 5px',
                border:'1.5px solid #000',
              }}>{key}</span>
              <span style={{
                fontFamily:'"Noto Sans TC",sans-serif',fontSize:'11px',color:dark?'#999':'#555',
                maxWidth:'160px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
              }}>{label || '未填寫'}</span>
            </div>
          ))}
        </div>

        {/* ── Body ── */}
        <div
          ref={bodyRef}
          className="ai-body"
          style={{ flex:1, overflowY:'auto', padding:'20px' }}
        >
          {status === 'idle' && (
            <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:'16px' }}>
              <div style={{ fontSize:'48px', animation:'float 3s ease-in-out infinite' }}>🧐</div>
              <div style={{ fontFamily:'"Space Grotesk",sans-serif',fontWeight:900,fontSize:'18px',color:text_c }}>
                準備好接受策略審查了嗎？
              </div>
              <div style={{ fontFamily:'"Noto Sans TC",sans-serif',fontSize:'13px',color:sub,textAlign:'center',maxWidth:'360px',lineHeight:1.7 }}>
                AI 將從目標對齊度、具體性、可行性、完整性、一致性五個維度深度分析你的 OGSM 計畫，並給出具體可執行的改善建議。
              </div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:'6px',justifyContent:'center',maxWidth:'400px' }}>
                {REVIEW_DIMENSIONS.map(d => (
                  <div key={d.id} style={{
                    fontFamily:'"DM Mono",monospace',fontSize:'10px',
                    background:dark?'rgba(0,170,68,0.1)':'rgba(0,170,68,0.08)',
                    border:'1px solid rgba(0,170,68,0.3)',
                    padding:'2px 8px',color:'#00AA44',
                    title: d.desc,
                  }}>{d.icon} {d.label}</div>
                ))}
              </div>
              <button
                onClick={startAnalysis}
                style={{
                  fontFamily:'"Space Grotesk",sans-serif',fontWeight:900,fontSize:'14px',
                  textTransform:'uppercase',letterSpacing:'0.1em',
                  padding:'12px 32px',background:'#00AA44',color:'#fff',
                  border:'3px solid #000',boxShadow:'6px 6px 0 0 #000',cursor:'pointer',
                  transition:'all 0.15s',
                }}
                onMouseEnter={e=>{e.currentTarget.style.transform='translate(-2px,-2px)';e.currentTarget.style.boxShadow='8px 8px 0 0 #000'}}
                onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='6px 6px 0 0 #000'}}
                onMouseDown={e=>{e.currentTarget.style.transform='translate(2px,2px)';e.currentTarget.style.boxShadow='4px 4px 0 0 #000'}}
              >
                🧠 開始審查
              </button>
            </div>
          )}

          {(status === 'loading' || status === 'done') && (
            <div>
              {status === 'loading' && !text && (
                <div style={{ display:'flex',alignItems:'center',gap:'10px',color:'#00AA44',fontFamily:'"DM Mono",monospace',fontSize:'12px' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width:8,height:8,background:'#00AA44',borderRadius:'50%',
                      animation:`aiPulse 1s ease-in-out ${i*0.2}s infinite`,
                    }} />
                  ))}
                  AI 分析中，請稍候…
                </div>
              )}
              <RenderAnalysis text={text} dark={dark} />
              {status === 'loading' && text && (
                <span style={{ display:'inline-block',width:8,height:14,background:'#00AA44',animation:'aiPulse 0.8s ease-in-out infinite',verticalAlign:'middle',marginLeft:2 }} />
              )}
            </div>
          )}

          {status === 'error' && (
            <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'12px',padding:'40px 0' }}>
              <div style={{ fontSize:'32px' }}>⚠️</div>
              <div style={{ fontFamily:'"Space Grotesk",sans-serif',fontWeight:900,fontSize:'16px',color:'#FF3333' }}>
                分析失敗
              </div>
              <div style={{ fontFamily:'"DM Mono",monospace',fontSize:'11px',color:sub,textAlign:'center' }}>
                {error}
              </div>
              <button
                onClick={startAnalysis}
                style={{
                  fontFamily:'"Space Grotesk",sans-serif',fontWeight:900,fontSize:'12px',
                  textTransform:'uppercase',padding:'8px 20px',background:'#FF3333',color:'#fff',
                  border:'2px solid #000',boxShadow:'3px 3px 0 0 #000',cursor:'pointer',
                }}
              >重新嘗試</button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {status === 'done' && (
          <div style={{
            padding:'8px 20px', borderTop:`1px solid ${bdr}`,
            display:'flex',gap:'8px',justifyContent:'flex-end',
            background:dark?'#0a0a0a':'#f5f5f5',flexShrink:0,
          }}>
            <button
              onClick={() => navigator.clipboard.writeText(text).catch(()=>{})}
              style={{
                fontFamily:'"Space Grotesk",sans-serif',fontWeight:900,fontSize:'11px',
                textTransform:'uppercase',letterSpacing:'0.08em',
                padding:'5px 14px',background:'#FFFF00',color:'#000',
                border:'2px solid #000',boxShadow:'3px 3px 0 0 #000',cursor:'pointer',
                transition:'all 0.12s',
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translate(-2px,-2px)';e.currentTarget.style.boxShadow='5px 5px 0 0 #000'}}
              onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='3px 3px 0 0 #000'}}
            >複製報告</button>
            <button
              onClick={startAnalysis}
              style={{
                fontFamily:'"Space Grotesk",sans-serif',fontWeight:900,fontSize:'11px',
                textTransform:'uppercase',letterSpacing:'0.08em',
                padding:'5px 14px',background:'#00AA44',color:'#fff',
                border:'2px solid #000',boxShadow:'3px 3px 0 0 #000',cursor:'pointer',
                transition:'all 0.12s',
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translate(-2px,-2px)';e.currentTarget.style.boxShadow='5px 5px 0 0 #000'}}
              onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='3px 3px 0 0 #000'}}
            >🔄 重新分析</button>
          </div>
        )}
      </div>
    </>,
    document.body
  )
}