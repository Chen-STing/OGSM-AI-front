import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  DEFAULT_CONFIG, ORIGINAL_STARS, ORIGINAL_CIRCLES, ORIGINAL_TRIS, ORIGINAL_CROSSES,
  MODAL_DEFAULT_CONFIGS, MODAL_SS_KEYS, MODAL_ORIGINAL_SHAPES,
  genItems, ssLoad, ssSave, ssClear, loadSavedBgConfig,
  SS_EXP_KEY, DEFAULT_EXP, loadSavedExpSettings,
} from '../bgConfig.js'

export { loadSavedExpSettings }

export { loadSavedBgConfig }

// ─── Konami sequence ──────────────────────────────────────────────────────────
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']

// ─── Tokens ───────────────────────────────────────────────────────────────────
const BLUE   = '#0000FF'
const PINK   = '#FF00FF'
const YELLOW = '#FFFF00'
const GREEN  = '#00FF00'
const CURSOR_HAND_URL = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M14 6 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%23000000" /><path d="M10 2 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%2300FF00" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></svg>') 10 2, pointer`

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes konami-flash {
    0%{opacity:0} 15%{opacity:1} 35%{opacity:0.6} 50%{opacity:1} 70%{opacity:0.3} 85%{opacity:0.8} 100%{opacity:0}
  }
  @keyframes konami-glitch-h {
    0%,100%{clip-path:inset(0 0 100% 0);transform:skewX(0deg)}
    10%{clip-path:inset(10% 0 80% 0);transform:skewX(-6deg)}
    20%{clip-path:inset(40% 0 40% 0);transform:skewX(3deg)}
    30%{clip-path:inset(70% 0 10% 0);transform:skewX(-4deg)}
    40%{clip-path:inset(20% 0 60% 0);transform:skewX(5deg)}
    50%{clip-path:inset(0% 0 85% 0);transform:skewX(-2deg)}
    60%{clip-path:inset(55% 0 20% 0);transform:skewX(6deg)}
    70%{clip-path:inset(80% 0 5% 0);transform:skewX(-3deg)}
    80%{clip-path:inset(30% 0 50% 0);transform:skewX(4deg)}
    90%{clip-path:inset(5% 0 90% 0);transform:skewX(-5deg)}
  }
  @keyframes konami-panel-in {
    0%{transform:translate(-50%,-50%) scale(0.4) rotate(-8deg);opacity:0}
    60%{transform:translate(-50%,-50%) scale(1.06) rotate(1deg);opacity:1}
    80%{transform:translate(-50%,-50%) scale(0.97) rotate(-0.5deg)}
    100%{transform:translate(-50%,-50%) scale(1) rotate(0deg);opacity:1}
  }
  @keyframes konami-scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
  @keyframes konami-title-glitch {
    0%,90%,100%{text-shadow:3px 0 ${PINK},-3px 0 ${BLUE};letter-spacing:0.06em}
    92%{text-shadow:-4px 0 ${GREEN},4px 0 ${YELLOW};letter-spacing:0.12em}
    95%{text-shadow:5px 0 ${PINK},-2px 0 ${BLUE};letter-spacing:0.02em}
  }
  @keyframes konami-blink{0%,49%{opacity:1}50%,100%{opacity:0}}
  @keyframes konami-rgb-border {
    0%{border-color:${BLUE};box-shadow:8px 8px 0 0 #00007a}
    33%{border-color:${PINK};box-shadow:8px 8px 0 0 #7a007a}
    66%{border-color:${GREEN};box-shadow:8px 8px 0 0 #007a00}
    100%{border-color:${BLUE};box-shadow:8px 8px 0 0 #00007a}
  }
  @keyframes konami-cheat-in{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
  .k-btn{transition:all 0.15s}
  .konami-tab{cursor:pointer;transition:all 0.12s;user-select:none}
  .custom-cursor .konami-tab{cursor:${CURSOR_HAND_URL}!important}
  .konami-tab:hover{opacity:1!important}
  .k-slider{-webkit-appearance:none;appearance:none;width:100%;height:4px;outline:none;cursor:${CURSOR_HAND_URL};background:rgba(128,128,128,0.2);border-radius:2px}
  .k-slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border:3px solid #000;border-radius:0;cursor:${CURSOR_HAND_URL}}
  .k-slider::-moz-range-thumb{width:18px;height:18px;border:3px solid #000;border-radius:0;appearance:none;cursor:${CURSOR_HAND_URL}}
  .k-slider-star::-webkit-slider-thumb{background:${YELLOW}}
  .k-slider-circle::-webkit-slider-thumb{background:${PINK}}
  .k-slider-cross::-webkit-slider-thumb{background:${GREEN}}
  .k-slider-tri::-webkit-slider-thumb{background:${BLUE}}
  .k-slider-star::-moz-range-thumb{background:${YELLOW}}
  .k-slider-circle::-moz-range-thumb{background:${PINK}}
  .k-slider-cross::-moz-range-thumb{background:${GREEN}}
  .k-slider-tri::-moz-range-thumb{background:${BLUE}}
`

// ─── Slider row ───────────────────────────────────────────────────────────────
function SliderRow({ label, icon, value, onChange, accent, sliderCls, defaultVal, max = 7, dark = true }) {
  const ta = safeAccent(accent, dark)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ width:54, flexShrink:0, display:'flex', alignItems:'center', gap:5 }}>
        <span style={{ fontSize:13 }}>{icon}</span>
        <span style={{ fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:10, color:ta, letterSpacing:'0.04em', textTransform:'uppercase' }}>{label}</span>
      </div>
      <input data-nodrag type="range" min={0} max={max} step={1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={`k-slider ${sliderCls}`} style={{ flex:1, accentColor:accent }} />
      <div style={{ width:28, height:28, flexShrink:0, background:value===0?'transparent':accent, border:`2px solid ${accent}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'"DM Mono",monospace', fontWeight:700, fontSize:13, color:value===0?ta:'#000', transition:'all 0.15s', position:'relative' }}>
        {value}
        <span style={{ position:'absolute', top:-5, right:-5, width:8, height:8, borderRadius:'50%', background:value===defaultVal?accent:'transparent', border:`1.5px solid ${accent}`, transition:'background 0.2s' }} title="原始預設值" />
      </div>
    </div>
  )
}

// ─── BG Customizer (for BrutalistBackground) ──────────────────────────────────
function BgCustomizer({ dark, onApply }) {
  const [draft, setDraft]             = useState(() => ssLoad() ?? { ...DEFAULT_CONFIG })
  const [justApplied, setJ]           = useState(false)
  const [previewSeed, setPreviewSeed] = useState(() => ssLoad()?.seed ?? null)
  const timer = useRef(null)

  const fg      = dark ? '#E8E8E8' : '#111'
  const inputBg = dark ? '#1C1C1C' : '#fafafa'
  const borderC = dark ? '#505050' : '#C8C8C8'

  const upd = (key, val) => {
    setDraft(d => ({ ...d, [key]: val }))
    setJ(false)
    setPreviewSeed(Math.floor(Math.random() * 0x7FFFFFFF) + 1)
  }

  const handleApply = () => {
    const cfg = previewSeed !== null ? { ...draft, seed: previewSeed } : { ...draft }
    ssSave(cfg)
    onApply(cfg)
    setJ(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setJ(false), 2500)
  }
  const handleReset = () => {
    ssClear()
    setDraft({ ...DEFAULT_CONFIG })
    onApply({ ...DEFAULT_CONFIG })
    setJ(false)
    setPreviewSeed(null)
  }
  useEffect(() => () => clearTimeout(timer.current), [])

  // mini preview
  const resolveColor = (c) => c === '__DARK__' ? (dark ? '#FFF' : '#000') : c
  const pStars   = previewSeed === null ? ORIGINAL_STARS   : genItems(draft.starCount,   (previewSeed ^ 0xdeadbeef) >>> 0, 80, 260)
  const pCircles = previewSeed === null ? ORIGINAL_CIRCLES : genItems(draft.circleCount, (previewSeed ^ 0xcafebabe) >>> 0, 30, 90)
  const pCrosses = previewSeed === null ? ORIGINAL_CROSSES : genItems(draft.crossCount,  (previewSeed ^ 0xbeefdead) >>> 0, 15, 40)
  const pTris    = previewSeed === null ? ORIGINAL_TRIS    : genItems(draft.triCount,    (previewSeed ^ 0xfeedface) >>> 0, 20, 55)
  const sc = 0.22

  const sliders = [
    { key:'starCount',   label:'星星', accent:YELLOW, cls:'k-slider-star',   def:DEFAULT_CONFIG.starCount   },
    { key:'circleCount', label:'圓形', accent:PINK,   cls:'k-slider-circle', def:DEFAULT_CONFIG.circleCount },
    { key:'crossCount',  label:'十字', accent:GREEN,  cls:'k-slider-cross',  def:DEFAULT_CONFIG.crossCount  },
    { key:'triCount',    label:'三角', accent:BLUE,   cls:'k-slider-tri',    def:DEFAULT_CONFIG.triCount    },
  ]

  return (
    <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
      {/* watermark */}
      <div>
        <div style={{ fontSize:10, fontFamily:'"DM Mono",monospace', color:dark?'#909090':'#777777', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>浮水印文字</div>
        <div style={{ position:'relative' }}>
          <input data-nodrag type="text" value={draft.watermarkText}
            onChange={e => upd('watermarkText', e.target.value.toUpperCase())}
            maxLength={32} placeholder={DEFAULT_CONFIG.watermarkText}
            style={{ width:'100%', boxSizing:'border-box', background:inputBg, border:`2px solid ${borderC}`, color:fg, fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:13, padding:'8px 10px', outline:'none', letterSpacing:'0.05em', transition:'border-color 0.15s' }}
            onFocus={e=>{ e.target.style.borderColor=YELLOW }}
            onBlur={e=> { e.target.style.borderColor=borderC }}
          />
          <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', fontSize:10, fontFamily:'"DM Mono",monospace', color:dark?'#606060':'#AAAAAA' }}>{draft.watermarkText.length}/32</span>
        </div>
      </div>

      {/* sliders */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ fontSize:10, fontFamily:'"DM Mono",monospace', color:dark?'#909090':'#777777', letterSpacing:'0.1em', textTransform:'uppercase', display:'flex', justifyContent:'space-between' }}>
          <span>形狀數量 <span style={{ color:dark?'#666666':'#A0A0A0' }}>（0–7）</span></span>
          <span style={{ color:dark?'#606060':'#AAAAAA' }}>● = 原始預設</span>
        </div>
        {sliders.map(s => <SliderRow key={s.key} label={s.label} accent={s.accent} sliderCls={s.cls} value={draft[s.key]} defaultVal={s.def} onChange={v=>upd(s.key,v)} dark={dark} />)}
      </div>

      {/* mini preview */}
      <div>
        <div style={{ fontSize:10, fontFamily:'"DM Mono",monospace', color:dark?'#909090':'#777777', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:5 }}>
          即時預覽
        </div>
        <div style={{ position:'relative', width:'100%', height:80, background:dark?'#202020':'#f8f9fa', border:`2px solid ${dark?'#505050':'#C8C8C8'}`, overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:dark?'linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)':'linear-gradient(rgba(0,0,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.05) 1px,transparent 1px)', backgroundSize:'20px 20px' }} />
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', pointerEvents:'none' }}>
            <span style={{ transform:'rotate(-15deg)', opacity:0.07, fontSize:26, fontWeight:900, textTransform:'uppercase', whiteSpace:'nowrap', fontFamily:'"Space Grotesk",sans-serif', color:dark?'#fff':'#000' }}>{draft.watermarkText||' '}</span>
          </div>
          {pStars.map((s,i)=>{ const sz=s.size*sc; const pos=s.bottom!==undefined?{position:'absolute',bottom:'8%',right:'2%'}:{position:'absolute',top:s.top,left:s.left}; return <div key={`ps${i}`} style={{...pos,color:resolveColor(s.color),opacity:0.3}}><svg width={sz} height={sz} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" style={{overflow:'visible'}}><path d="M12 2.5L14.7 8.8L21.5 9.5L16.3 14L17.8 20.7L12 17.2L6.2 20.7L7.7 14L2.5 9.5L9.3 8.8L12 2.5Z"/></svg></div> })}
          {pCircles.map((c,i)=>{ const sz=c.size*sc; return <div key={`pc${i}`} style={{position:'absolute',top:c.top,left:c.left,color:resolveColor(c.color),opacity:0.3}}><svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/></svg></div> })}
          {pCrosses.map((c,i)=>{ const sz=c.size*sc; return <div key={`px${i}`} style={{position:'absolute',top:c.top,left:c.left,color:resolveColor(c.color),opacity:0.3}}><svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div> })}
          {pTris.map((t,i)=>{ const sz=t.size*sc; return <div key={`pt${i}`} style={{position:'absolute',top:t.top,left:t.left,color:resolveColor(t.color),opacity:0.3}}><svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter"><polygon points="12,2 22,20 2,20"/></svg></div> })}
        </div>
      </div>

      {/* buttons */}
      <div style={{ display:'flex', gap:8 }}>
        <button data-nodrag className="k-btn" onClick={handleApply}
          style={{ flex:1, padding:'9px 0', background:justApplied?GREEN:YELLOW, color:'#000', border:`3px solid ${dark?'#888888':'#111111'}`, boxShadow:`4px 4px 0 0 ${dark?'#000000':'#000000'}`, fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:13, textTransform:'uppercase', letterSpacing:'0.08em', transition:'all 0.15s' }}
          onMouseEnter={e=>{ e.currentTarget.style.transform='translate(-2px,-2px)'; e.currentTarget.style.boxShadow='6px 6px 0 0 #000000'; e.currentTarget.style.background=dark?'#1a35c4':'#3B5BDB'; e.currentTarget.style.color=YELLOW }}
          onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='4px 4px 0 0 #000000'; e.currentTarget.style.background=justApplied?GREEN:YELLOW; e.currentTarget.style.color='#000' }}
          onMouseDown={e=>{ e.currentTarget.style.transform='translate(2px,2px)'; e.currentTarget.style.boxShadow='2px 2px 0 0 #000000' }}
          onMouseUp={e=>{ e.currentTarget.style.transform='translate(-2px,-2px)'; e.currentTarget.style.boxShadow='6px 6px 0 0 #000000' }}>
          {justApplied?'✓ 已套用！':'▶ 套用預覽'}
        </button>
        <button data-nodrag className="k-btn" onClick={handleReset}
          style={{ padding:'9px 14px', background:'transparent', color:dark?'#999999':'#888888', border:`2px solid ${dark?'#505050':'#C0C0C0'}`, boxShadow:`2px 2px 0 0 ${dark?'#000000':'#A0A0A0'}`, fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:12, textTransform:'uppercase', letterSpacing:'0.06em', transition:'all 0.15s' }}
          onMouseEnter={e=>{ e.currentTarget.style.transform='translate(-2px,-2px)'; e.currentTarget.style.borderColor='#FF0000'; e.currentTarget.style.color='#FF0000'; e.currentTarget.style.boxShadow='4px 4px 0 0 #880000' }}
          onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.borderColor=dark?'#505050':'#C0C0C0'; e.currentTarget.style.color=dark?'#999999':'#888888'; e.currentTarget.style.boxShadow=`2px 2px 0 0 ${dark?'#000000':'#A0A0A0'}` }}
          onMouseDown={e=>{ e.currentTarget.style.transform='translate(2px,2px)'; e.currentTarget.style.boxShadow='1px 1px 0 0 #880000' }}
          onMouseUp={e=>{ e.currentTarget.style.transform='translate(-2px,-2px)'; e.currentTarget.style.boxShadow='4px 4px 0 0 #880000' }}>
          ↺ 還原預設
        </button>
      </div>
      {justApplied && <div style={{ textAlign:'center', fontSize:10, fontFamily:'"DM Mono",monospace', color:GREEN, letterSpacing:'0.08em', animation:'konami-cheat-in 0.3s ease' }}>背景已更新，刷新後仍保持（關閉分頁後重設）</div>}
    </div>
  )
}

// ─── Modal Shape Customizer ───────────────────────────────────────────────────
function ModalCustomizer({ modalKey, label, dark, onApply }) {
  const ssKey    = MODAL_SS_KEYS[modalKey]
  const defaults = MODAL_DEFAULT_CONFIGS[modalKey]

  const [draft, setDraft]             = useState(() => ssLoad(ssKey) ?? { ...defaults })
  const [justApplied, setJ]           = useState(false)
  const [previewSeed, setPreviewSeed] = useState(() => ssLoad(ssKey)?.seed ?? null)
  const timer = useRef(null)

  const upd = (key, val) => {
    setDraft(d => ({ ...d, [key]: val }))
    setJ(false)
    setPreviewSeed(Math.floor(Math.random() * 0x7FFFFFFF) + 1)
  }

  const handleApply = () => {
    const cfg = previewSeed !== null ? { ...draft, seed: previewSeed } : { ...draft }
    ssSave(cfg, ssKey)
    onApply(modalKey, cfg)
    setJ(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setJ(false), 2500)
  }
  const handleReset = () => {
    ssClear(ssKey)
    setDraft({ ...defaults })
    onApply(modalKey, { ...defaults })
    setJ(false)
    setPreviewSeed(null)
  }
  useEffect(() => () => clearTimeout(timer.current), [])

  const sliders = [
    { key:'starCount',   label:'星星', accent:YELLOW, cls:'k-slider-star',   def:defaults.starCount   },
    { key:'circleCount', label:'圓形', accent:PINK,   cls:'k-slider-circle', def:defaults.circleCount },
    { key:'crossCount',  label:'十字', accent:GREEN,  cls:'k-slider-cross',  def:defaults.crossCount  },
    { key:'triCount',    label:'三角', accent:BLUE,   cls:'k-slider-tri',    def:defaults.triCount    },
  ]

  // mini modal preview — null seed = original positions, number seed = random
  const SC = 0.15
  const origNp  = (pos) => Object.fromEntries(Object.entries(pos).map(([k,v]) => [k, typeof v==='string'&&v.endsWith('px') ? `${parseFloat(v)*SC}px` : v]))
  const origPrv = MODAL_ORIGINAL_SHAPES[modalKey]
  const prvStars   = previewSeed !== null ? genItems(draft.starCount,   (previewSeed ^ 0xAA112233) >>> 0, 12, 22) : null
  const prvCrosses = previewSeed !== null ? genItems(draft.crossCount,  (previewSeed ^ 0xBB224466) >>> 0, 8,  16) : null
  const prvCircles = previewSeed !== null ? genItems(draft.circleCount, (previewSeed ^ 0xCC336699) >>> 0, 8,  16) : null
  const prvTris    = previewSeed !== null ? genItems(draft.triCount,    (previewSeed ^ 0xDD44AACC) >>> 0, 9,  18) : null

  return (
    <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:10, fontFamily:'"DM Mono",monospace', color:dark?'#909090':'#777777', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:2 }}>
        {label} 浮動形狀數量 <span style={{ color:dark?'#666666':'#A0A0A0' }}>（每種 0–3）</span>
      </div>

      {sliders.map(s => <SliderRow key={s.key} label={s.label} accent={s.accent} sliderCls={s.cls} value={draft[s.key]} defaultVal={s.def} onChange={v=>upd(s.key,v)} max={3} dark={dark} />)}

      {/* mini preview */}
      <div>
        <div style={{ fontSize:10, fontFamily:'"DM Mono",monospace', color:dark?'#909090':'#777777', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:5 }}>
          即時預覽
        </div>
        <div style={{ position:'relative', width:'100%', height:80, background:dark?'#1E1E1E':'#FAFAFA', border:`2px solid ${dark?'#505050':'#C8C8C8'}`, overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:`linear-gradient(to right,${dark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.04)'} 1px,transparent 1px),linear-gradient(to bottom,${dark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.04)'} 1px,transparent 1px)`, backgroundSize:'20px 20px' }} />
          {(prvStars ?? origPrv.stars).map((s,i) => { const rnd=prvStars!==null; const sz=rnd?s.size:Math.max(8,s.size*SC); const ps=rnd?{position:'absolute',top:s.top,left:s.left}:{position:'absolute',...origNp(s.pos)}; return <div key={`s${i}`} style={{...ps,color:s.color,opacity:0.45}}><svg width={sz} height={sz} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 2.5L14.7 8.8L21.5 9.5L16.3 14L17.8 20.7L12 17.2L6.2 20.7L7.7 14L2.5 9.5L9.3 8.8L12 2.5Z"/></svg></div> })}
          {(prvCrosses ?? origPrv.crosses).map((c,i) => { const rnd=prvCrosses!==null; const sz=rnd?c.size:Math.max(8,c.size*SC); const ps=rnd?{position:'absolute',top:c.top,left:c.left}:{position:'absolute',...origNp(c.pos)}; return <div key={`x${i}`} style={{...ps,color:c.color,opacity:0.45}}><svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div> })}
          {(prvCircles ?? origPrv.circles).map((c,i) => { const rnd=prvCircles!==null; const sz=rnd?c.size:Math.max(8,c.size*SC); const ps=rnd?{position:'absolute',top:c.top,left:c.left}:{position:'absolute',...origNp(c.pos)}; return <div key={`c${i}`} style={{...ps,color:c.color,opacity:0.45}}><svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/></svg></div> })}
          {(prvTris ?? origPrv.tris).map((t,i) => { const rnd=prvTris!==null; const sz=rnd?t.size:Math.max(8,t.size*SC); const ps=rnd?{position:'absolute',top:t.top,left:t.left}:{position:'absolute',...origNp(t.pos)}; return <div key={`t${i}`} style={{...ps,color:t.color,opacity:0.45}}><svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter"><polygon points="12,2 22,20 2,20"/></svg></div> })}
        </div>
      </div>

      <div style={{ display:'flex', gap:8 }}>
        <button data-nodrag className="k-btn" onClick={handleApply}
          style={{ flex:1, padding:'9px 0', background:justApplied?GREEN:YELLOW, color:'#000', border:`3px solid ${dark?'#888888':'#111111'}`, boxShadow:`4px 4px 0 0 ${dark?'#000000':'#000000'}`, fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:13, textTransform:'uppercase', letterSpacing:'0.08em', transition:'all 0.15s' }}
          onMouseEnter={e=>{ e.currentTarget.style.transform='translate(-2px,-2px)'; e.currentTarget.style.boxShadow='6px 6px 0 0 #000000'; e.currentTarget.style.background=dark?'#1a35c4':'#3B5BDB'; e.currentTarget.style.color=YELLOW }}
          onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='4px 4px 0 0 #000000'; e.currentTarget.style.background=justApplied?GREEN:YELLOW; e.currentTarget.style.color='#000' }}
          onMouseDown={e=>{ e.currentTarget.style.transform='translate(2px,2px)'; e.currentTarget.style.boxShadow='2px 2px 0 0 #000000' }}
          onMouseUp={e=>{ e.currentTarget.style.transform='translate(-2px,-2px)'; e.currentTarget.style.boxShadow='6px 6px 0 0 #000000' }}>
          {justApplied?'✓ 已套用！':'▶ 套用預覽'}
        </button>
        <button data-nodrag className="k-btn" onClick={handleReset}
          style={{ padding:'9px 14px', background:'transparent', color:dark?'#999999':'#888888', border:`2px solid ${dark?'#505050':'#C0C0C0'}`, boxShadow:`2px 2px 0 0 ${dark?'#000000':'#A0A0A0'}`, fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:12, textTransform:'uppercase', letterSpacing:'0.06em', transition:'all 0.15s' }}
          onMouseEnter={e=>{ e.currentTarget.style.transform='translate(-2px,-2px)'; e.currentTarget.style.borderColor='#FF0000'; e.currentTarget.style.color='#FF0000'; e.currentTarget.style.boxShadow='4px 4px 0 0 #880000' }}
          onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.borderColor=dark?'#505050':'#C0C0C0'; e.currentTarget.style.color=dark?'#999999':'#888888'; e.currentTarget.style.boxShadow=`2px 2px 0 0 ${dark?'#000000':'#A0A0A0'}` }}
          onMouseDown={e=>{ e.currentTarget.style.transform='translate(2px,2px)'; e.currentTarget.style.boxShadow='1px 1px 0 0 #880000' }}
          onMouseUp={e=>{ e.currentTarget.style.transform='translate(-2px,-2px)'; e.currentTarget.style.boxShadow='4px 4px 0 0 #880000' }}>
          ↺ 還原預設
        </button>
      </div>
      {justApplied && <div style={{ textAlign:'center', fontSize:10, fontFamily:'"DM Mono",monospace', color:GREEN, letterSpacing:'0.08em', animation:'konami-cheat-in 0.3s ease' }}>設定已套用，刷新後仍保持（關閉分頁後重設）</div>}
    </div>
  )
}

// ─── Experience Settings ──────────────────────────────────────────────────────
const CURSOR_SVGS = {
  arrow:   `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><polygon points="6,6 16,28 20,20 28,16" fill="%23000000" /><polygon points="2,2 12,24 16,16 24,12" fill="%23FFFF00" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></svg>') 2 2, auto`,
  hand:    `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M14 6 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%23000000" /><path d="M10 2 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%2300FF00" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></svg>') 10 2, pointer`,
  text:    `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M10 6 h16 v4 h-6 v12 h6 v4 h-16 v-4 h6 v-12 h-6 z" fill="%23000000" /><path d="M6 2 h16 v4 h-6 v12 h6 v4 h-16 v-4 h6 v-12 h-6 z" fill="%2300FFFF" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></svg>') 14 16, text`,
  redStar: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><polygon points="18,4 22,14 32,18 22,22 18,32 14,22 4,18 14,14" fill="%23000000" /><polygon points="16,2 20,12 30,16 20,20 16,30 12,20 2,16 12,12" fill="%23FF0000" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></svg>') 16 16, crosshair`,
}
const extractSvgUrl = (cursorStr) => cursorStr.match(/url\('([^']+)'\)/)?.[1] ?? ''

// In light mode, pure yellow/green/pink are near-invisible on white — darken them for text use
const safeAccent = (accent, dark) => {
  if (dark) return accent
  if (accent === YELLOW) return '#9C7C00'
  if (accent === GREEN)  return '#0A7A0A'
  if (accent === PINK)   return '#CC00CC'
  return accent
}

function ExpToggleRow({ icon, label, desc, on, onToggle, accent, dark, animDelay = '0s' }) {
  const fg     = dark ? '#E8E8E8' : '#111'
  const dimBg  = dark ? '#1a1a1a' : '#f5f5f5'
  const borderC= dark ? '#343434' : '#E4E4E4'

  return (
    <div className="konami-cheat-row"
      style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:`1px solid ${borderC}`, animationDelay:animDelay, background: on ? `${accent}14` : 'transparent', transition:'background 0.2s' }}>
      {/* status dot */}
      <div style={{ width:8, height:8, background: on ? accent : 'transparent', border:`2px solid ${accent}`, flexShrink:0, transition:'background 0.2s' }} />

      {/* icon + text */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:900, fontSize:12, color: on ? safeAccent(accent, dark) : fg, textTransform:'uppercase', letterSpacing:'0.06em', display:'flex', alignItems:'center', gap:6, transition:'color 0.2s' }}>
          <span style={{ fontSize:15 }}>{icon}</span> {label}
        </div>
        <div style={{ fontSize:10, color: dark?'#747474':'#888888', fontFamily:'"Noto Sans TC",sans-serif', marginTop:3 }}>
          {on ? '✓ 已啟用' : desc}
        </div>
      </div>

      {/* ON/OFF button — cheat style */}
      <button data-nodrag
        onClick={onToggle}
        style={{ background: on ? accent : 'transparent', color: on ? '#000' : safeAccent(accent, dark), border:`2px solid ${safeAccent(accent, dark)}`, fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:10, padding:'5px 12px', textTransform:'uppercase', letterSpacing:'0.08em', boxShadow:`3px 3px 0 0 #000`, flexShrink:0, cursor:'pointer', transition:'all 0.15s', minWidth:48 }}
        onMouseEnter={e=>{ e.currentTarget.style.transform='translate(-2px,-2px)'; e.currentTarget.style.boxShadow='5px 5px 0 0 #000' }}
        onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='3px 3px 0 0 #000' }}
        onMouseDown={e=>{ e.currentTarget.style.transform='translate(2px,2px)'; e.currentTarget.style.boxShadow='1px 1px 0 0 #000' }}
        onMouseUp={e=>{ e.currentTarget.style.transform='translate(-2px,-2px)'; e.currentTarget.style.boxShadow='5px 5px 0 0 #000' }}
      >
        {on ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}

function ExperienceSettings({ dark, onExpChange }) {
  const [settings, setSettings] = useState(() => loadSavedExpSettings())
  const fg    = dark ? '#fff' : '#000'

  const toggle = (key) => {
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    try { sessionStorage.setItem(SS_EXP_KEY, JSON.stringify(next)) } catch {}
    onExpChange?.(next)
  }

  const ITEMS = [
    {
      key: 'clickEffect',
      icon: '✦',
      label: '滑鼠點擊效果',
      desc: '每次點擊會爆出粉紅圓圈漣漪',
      accent: PINK,
    },
    {
      key: 'customCursor',
      icon: '⬡',
      label: '自訂義滑鼠樣式',
      desc: '使用霓虹箭頭 / 綠色手指 / 青色游標 / 紅色讀取',
      accent: GREEN,
    },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      {/* section label */}
      <div style={{ padding:'10px 16px 6px', fontSize:10, color:dark?'#606060':'#999999', fontFamily:'"DM Mono",monospace', letterSpacing:'0.1em', textTransform:'uppercase' }}>
        ── Experience Controls ──
      </div>

      {ITEMS.map((item, i) => (
        <ExpToggleRow key={item.key}
          icon={item.icon} label={item.label} desc={item.desc}
          accent={item.accent} dark={dark}
          on={settings[item.key]}
          onToggle={() => toggle(item.key)}
          animDelay={`${i * 0.08}s`}
        />
      ))}

      {/* cursor preview strip */}
      <div style={{ padding:'12px 16px', borderTop:`1px solid ${dark?'#343434':'#E4E4E4'}` }}>
        <div style={{ fontSize:10, fontFamily:'"DM Mono",monospace', color:dark?'#707070':'#999999', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>
          游標預覽
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          {[
            { label:'預設', svg: CURSOR_SVGS.arrow,   color: '#c9b113'    },
            { label:'點擊', svg: CURSOR_SVGS.hand,    color: GREEN     },
            { label:'輸入', svg: CURSOR_SVGS.text,    color: '#00FFFF' },
            { label:'讀取', svg: CURSOR_SVGS.redStar, color: '#FF0000' },
          ].map(({ label, svg, color }) => (
            <div key={label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, opacity: settings.customCursor ? 1 : 0.25, transition:'opacity 0.3s' }}>
              <div style={{ width:34, height:34, background:dark?'#191919':'#F4F4F4', border:`2px solid ${settings.customCursor ? color : (dark?'#484848':'#C4C4C4')}`, display:'flex', alignItems:'center', justifyContent:'center', cursor: settings.customCursor ? svg : 'default', transition:'border-color 0.2s', overflow:'hidden' }}>
                <img src={extractSvgUrl(svg)} alt={label} width={28} height={28} style={{ display:'block', imageRendering:'pixelated', pointerEvents:'none' }} />
              </div>
              <span style={{ fontSize:9, fontFamily:'"DM Mono",monospace', color: settings.customCursor ? color : (dark?'#666666':'#888888'), letterSpacing:'0.06em', transition:'color 0.2s' }}>{label}</span>
            </div>
          ))}
          {!settings.customCursor && (
            <span style={{ fontSize:10, fontFamily:'"DM Mono",monospace', color:dark?'#666666':'#999999', letterSpacing:'0.06em' }}>← 已停用，使用系統游標</span>
          )}
        </div>
      </div>

      {/* reset */}
      <div style={{ padding:'0 16px 14px' }}>
        <button data-nodrag className="k-btn"
          onClick={() => {
            setSettings({ ...DEFAULT_EXP })
            try { sessionStorage.setItem(SS_EXP_KEY, JSON.stringify(DEFAULT_EXP)) } catch {}
            onExpChange?.({ ...DEFAULT_EXP })
          }}
          style={{ width:'100%', padding:'8px 0', background:'transparent', color:dark?'#999999':'#888888', border:`2px solid ${dark?'#505050':'#C0C0C0'}`, boxShadow:`2px 2px 0 0 ${dark?'#000000':'#A0A0A0'}`, fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em', transition:'all 0.15s' }}
          onMouseEnter={e=>{ e.currentTarget.style.transform='translate(-2px,-2px)'; e.currentTarget.style.borderColor='#FF0000'; e.currentTarget.style.color='#FF0000'; e.currentTarget.style.boxShadow='4px 4px 0 0 #880000' }}
          onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.borderColor=dark?'#505050':'#C0C0C0'; e.currentTarget.style.color=dark?'#999999':'#888888'; e.currentTarget.style.boxShadow=`2px 2px 0 0 ${dark?'#000000':'#A0A0A0'}` }}
          onMouseDown={e=>{ e.currentTarget.style.transform='translate(2px,2px)'; e.currentTarget.style.boxShadow='1px 1px 0 0 #880000' }}
          onMouseUp={e=>{ e.currentTarget.style.transform='translate(-2px,-2px)'; e.currentTarget.style.boxShadow='4px 4px 0 0 #880000' }}>
          ↺ 還原預設（全部開啟）
        </button>
      </div>
    </div>
  )
}

// ─── Flash ────────────────────────────────────────────────────────────────────
function FlashOverlay({ onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 900); return () => clearTimeout(t) }, [onDone])
  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:999990, pointerEvents:'none', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, background:'#fff', animation:'konami-flash 0.9s ease forwards' }} />
      <div style={{ position:'absolute', inset:0, background:'cyan', opacity:0.6, animation:'konami-glitch-h 0.6s steps(1) forwards', mixBlendMode:'screen' }} />
      <div style={{ position:'absolute', inset:0, background:PINK, opacity:0.4, animation:'konami-glitch-h 0.6s steps(1) 0.1s forwards', mixBlendMode:'screen' }} />
      <div style={{ position:'absolute', left:0, right:0, height:'4px', background:'rgba(255,255,255,0.8)', animation:'konami-scanline 0.5s linear forwards' }} />
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:8 }}>
        <div style={{ fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'clamp(48px,10vw,120px)', color:'#000', textTransform:'uppercase', animation:'konami-flash 0.9s ease forwards', textShadow:`4px 0 ${PINK},-4px 0 ${BLUE}` }}>↑↑↓↓←→←→BA</div>
        <div style={{ fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'clamp(18px,3vw,36px)', color:BLUE, letterSpacing:'0.15em', textTransform:'uppercase', animation:'konami-flash 0.9s ease 0.1s forwards' }}>⚡ CHEAT CODE ACTIVATED ⚡</div>
      </div>
    </div>,
    document.body
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────
function KonamiPanel({ onClose, dark, onBgApply, onModalApply, onExpApply, initExpSettings }) {
  const panelRef  = useRef(null)
  const dragState = useRef(null)
  const [pos, setPos]               = useState({ x: window.innerWidth/2, y: window.innerHeight/2 })
  const [cursor, setCursor]         = useState('grab')
  const [tab, setTab]               = useState('exp')
  const [customCursor, setCustomCursor]   = useState(() => initExpSettings?.customCursor ?? false)
  const [clickEffectOn, setClickEffectOn] = useState(() => initExpSettings?.clickEffect  ?? false)
  const [bursts, setBursts]         = useState([])

  const handleExpApply = useCallback((exp) => {
    setCustomCursor(exp.customCursor ?? false)
    setClickEffectOn(exp.clickEffect  ?? false)
    onExpApply?.(exp)
  }, [onExpApply])

  const handlePanelClick = useCallback((e) => {
    if (!clickEffectOn) return
    const id = Date.now() + Math.random()
    setBursts(b => [...b, { id, x: e.clientX, y: e.clientY }])
    setTimeout(() => setBursts(b => b.filter(v => v.id !== id)), 520)
  }, [clickEffectOn])

  const onMouseDown = useCallback((e) => {
    if (e.target.closest('[data-nodrag]')) return
    e.preventDefault()
    const rect = panelRef.current.getBoundingClientRect()
    dragState.current = { startX: e.clientX-(rect.left+rect.width/2), startY: e.clientY-(rect.top+rect.height/2) }
    setCursor('grabbing')
  }, [])

  useEffect(() => {
    const onMove = (e) => { if (!dragState.current) return; setPos({ x: e.clientX-dragState.current.startX, y: e.clientY-dragState.current.startY }) }
    const onUp   = () => { if (dragState.current) { dragState.current=null; setCursor('grab') } }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  const bg    = dark ? '#141414'  : '#fff'
  const border= dark ? '#fff'    : '#000'
  const dimBg = dark ? '#1D1D1D' : '#f5f5f5'

  const TABS = [
    { id:'exp',        label:'⚙ 樣式設定',    accent:PINK },
    { id:'bg',         label:'🌐 主背景',  accent:'#d0bd27' },
    { id:'generate',   label:'⚡ AI生成',  accent:'#00ccff' },
    { id:'member',     label:'👥 負責人',    accent:'#ff3300' },
    { id:'aiconfirm',  label:'🤖 再生成',  accent:'#d400ff' },
  ]

  return createPortal(
    <>
      <div ref={panelRef}
        className={customCursor ? 'custom-cursor' : undefined}
        style={{ position:'fixed', left:pos.x, top:pos.y, transform:'translate(-50%,-50%)', zIndex:999995, width:'clamp(340px,92vw,500px)', background:bg, border:`4px solid ${border}`, animation:'8s linear 0s infinite konami-rgb-border, konami-panel-in 0.5s cubic-bezier(0.16,1,0.3,1) both', fontFamily:'"Space Grotesk",sans-serif', userSelect:'none', cursor, display:'flex', flexDirection:'column', maxHeight:'88vh' }}
        onMouseDown={onMouseDown}
        onMouseEnter={() => { if (!dragState.current) setCursor('grab') }}
        onClick={handlePanelClick}
      >
      {/* Title bar */}
      <div style={{ background:'#000', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:`3px solid ${border}`, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {['#FF0000','#FFFF00','#00FF00'].map((c,i)=><div key={i} style={{ width:12,height:12,background:c,border:'1.5px solid rgba(255,255,255,0.3)',borderRadius:2 }}/>)}
          <span style={{ color:YELLOW, fontWeight:900, fontSize:13, letterSpacing:'0.12em', textTransform:'uppercase', animation:'konami-title-glitch 3s infinite' }}>// BG CUSTOMIZER</span>
        </div>
        <button data-nodrag onClick={onClose}
          style={{ background:'transparent', border:'2px solid #fff', color:'#fff', fontWeight:900, fontSize:14, width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', lineHeight:1, transition:'all 0.15s' }}
          onMouseEnter={e=>{ e.currentTarget.style.background='#FF0000'; e.currentTarget.style.borderColor='#FF0000' }}
          onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='#fff' }}>✕</button>
      </div>

      {/* Key strip */}
      <div style={{ background:dimBg, padding:'6px 16px', borderBottom:`2px solid ${dark?'#383838':'#DEDEDE'}`, display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <span style={{ fontSize:10, color:'#42ba1d', fontFamily:'"DM Mono",monospace', letterSpacing:'0.08em' }}>INPUT:</span>
        <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
          {['↑','↑','↓','↓','←','→','←','→','B','A'].map((k,i)=><span key={i} style={{ display:'inline-block', background:'#000', color:YELLOW, border:`1.5px solid ${YELLOW}`, fontFamily:'"DM Mono",monospace', fontWeight:700, fontSize:10, padding:'2px 5px', lineHeight:1.4 }}>{k}</span>)}
        </div>
        <span style={{ fontSize:11, color:'#42ba1d', fontFamily:'"DM Mono",monospace', animation:'konami-blink 1s step-end infinite', marginLeft:'auto' }}>█</span>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', flexWrap:'wrap', borderBottom:`3px solid ${dark?'#383838':'#DEDEDE'}`, flexShrink:0, background:dimBg }}>
        {TABS.map(t=>(
          <div key={t.id} className="konami-tab" data-nodrag onClick={()=>setTab(t.id)}
            style={{ flex:'0 0 auto', padding:'8px 12px', textAlign:'center', fontWeight:900, fontSize:11, letterSpacing:'0.04em', textTransform:'uppercase', whiteSpace:'nowrap', color:tab===t.id?t.accent:(dark?'#666666':'#999999'), borderBottom:tab===t.id?`3px solid ${t.accent}`:'3px solid transparent', marginBottom:-3, background:tab===t.id?(dark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.03)'):'transparent', opacity:tab===t.id?1:0.55 }}>
            {t.label}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ overflowY:'auto', flex:1 }}>
        {tab === 'bg'        && <BgCustomizer dark={dark} onApply={onBgApply} />}
        {tab === 'generate'  && <ModalCustomizer modalKey="generate"  label="AI生成"  dark={dark} onApply={onModalApply} />}
        {tab === 'member'    && <ModalCustomizer modalKey="member"    label="負責人設定" dark={dark} onApply={onModalApply} />}
        {tab === 'aiconfirm' && <ModalCustomizer modalKey="aiconfirm" label="再生成"  dark={dark} onApply={onModalApply} />}
        {tab === 'exp'       && <ExperienceSettings dark={dark} onExpChange={handleExpApply} />}
      </div>

      {/* Footer */}
      <div style={{ padding:'7px 16px', borderTop:`2px solid ${dark?'#303030':'#E8E8E8'}`, display:'flex', alignItems:'center', justifyContent:'space-between', background:dimBg, flexShrink:0 }}>
        <span style={{ fontFamily:'"DM Mono",monospace', fontSize:10, color:dark?'#686868':'#999999', letterSpacing:'0.08em' }}>拖移移動 · ESC 關閉</span>
        <span style={{ fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:10, color:dark?'#585858':'#AAAAAA' }}>v30</span>
      </div>
    </div>
    {bursts.map(b => (
      <div key={b.id} style={{ position:'fixed', left:b.x-20, top:b.y-20, width:40, height:40, borderRadius:'50%', border:'4px solid #FF00FF', pointerEvents:'none', zIndex:999999, animation:'click-burst 0.5s ease-out forwards' }} />
    ))}
    </>,
    document.body
  )
}

// ─── Cursor override: handled by App.jsx via .custom-cursor class ─────────────
// App.jsx adds/removes .custom-cursor on the root div based on expSettings.
// No injection needed here anymore.
function useCursorOverride(_customCursor) {
  // intentionally empty — App.jsx owns this via CSS class
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function KonamiCode({ dark = false, onBgChange, onModalChange, onExpChange }) {
  const progress = useRef([])
  const [phase, setPhase] = useState('idle')
  const [expSettings, setExpSettings] = useState(() => loadSavedExpSettings())

  useCursorOverride(expSettings.customCursor)

  useEffect(() => {
    const onKey = (e) => {
      const key = e.key
      const expected = KONAMI[progress.current.length]
      if (key === expected || key.toLowerCase() === expected) {
        progress.current = [...progress.current, key]
        if (progress.current.length === KONAMI.length) { progress.current = []; setPhase('flash') }
      } else {
        progress.current = (key === KONAMI[0] || key.toLowerCase() === KONAMI[0]) ? [key] : []
      }
    }
    const onEsc = (e) => { if (e.key === 'Escape') setPhase('idle') }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keydown', onEsc)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keydown', onEsc) }
  }, [])

  const handleBgApply    = useCallback((cfg) => { onBgChange?.(cfg) }, [onBgChange])
  const handleModalApply = useCallback((modalKey, cfg) => { onModalChange?.(modalKey, cfg) }, [onModalChange])
  const handleExpApply   = useCallback((exp) => {
    setExpSettings(exp)
    onExpChange?.(exp)
  }, [onExpChange])

  return (
    <>
      <style>{CSS}</style>
      {phase === 'flash' && <FlashOverlay onDone={() => setPhase('panel')} />}
      {phase === 'panel' && <KonamiPanel onClose={() => setPhase('idle')} dark={dark} onBgApply={handleBgApply} onModalApply={handleModalApply} onExpApply={handleExpApply} initExpSettings={expSettings} />}
    </>
  )
}