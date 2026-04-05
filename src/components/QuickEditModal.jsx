import { useState, useRef, useEffect } from 'react'
import BrutalistSelect from './BrutalistSelect.jsx'
import AiConfirmDialog from './AiConfirmDialog.jsx'
import { api } from '../services/api.js'
import BrutalistBackground from './BrutalistBackground.jsx'
import { loadSavedBgConfig } from '../bgConfig.js'

// ── Empty factories ───────────────────────────────────────────────────────────
const emptyMeasure  = () => ({ id: null, kpi: '', target: '', actual: '', progress: 0, status: 'NotStarted', deadline: '', assignees: [], todos: [], sortOrder: 0 })
const emptyStrategy = () => ({ id: null, text: '', sortOrder: 0, measures: [emptyMeasure()], todos: [] })

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const B_YELLOW = '#b7b717'
const B_GREEN  = '#00FF00'
const B_BLUE   = '#5e5eea'
const B_PINK   = '#FF00FF'
const B_RED    = 'rgb(255,15,15)'
const B_PURPLE = '#a78bfa'

const DARK  = { bg:'transparent', border:'#DDDDDD', text:'#F0F0F0', textSub:'#B8B8B8', textMuted:'#888888', inputBg:'rgba(255,255,255,0.06)', altBg:'rgba(255,255,255,0.04)', grid:'rgba(255,255,255,0.04)', scanline:'rgba(255,255,255,0.10)', headerBg:'rgba(17,17,17,0.6)' }
const LIGHT = { bg:'transparent', border:'#111111', text:'#111111', textSub:'#484848', textMuted:'#777777', inputBg:'rgba(0,0,0,0.04)',         altBg:'rgba(0,0,0,0.02)',   grid:'rgba(0,0,0,0.04)',         scanline:'rgba(0,0,0,0.08)',         headerBg:'rgba(13,13,13,0.6)' }

// ─── ICONS ────────────────────────────────────────────────────────────────────
const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const CheckIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const ChevronIcon = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.18s', flexShrink: 0 }}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)
const DragHandle = ({ color }) => (
  <svg width="11" height="16" viewBox="0 0 11 16" fill={color || '#888'} style={{ flexShrink: 0 }}>
    <circle cx="3" cy="3"  r="1.5"/><circle cx="8" cy="3"  r="1.5"/>
    <circle cx="3" cy="8"  r="1.5"/><circle cx="8" cy="8"  r="1.5"/>
    <circle cx="3" cy="13" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
  </svg>
)

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const taRef    = el => { if (el) { el.style.height = '0px'; el.style.height = el.scrollHeight + 'px' } }
const taChange = (e, cb) => { e.target.style.height = '0px'; e.target.style.height = e.target.scrollHeight + 'px'; cb(e.target.value) }
const todayStr = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}` }
const uid      = () => crypto.randomUUID()
const reorder  = (arr, from, to) => { const a = [...arr]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return a }
const clampDateToMax = (date, maxDate) => {
  if (!date || !maxDate) return date || ''
  return date > maxDate ? maxDate : date
}
const parseAssignees = (assignees, assignee) => {
  let arr = [];
  if (Array.isArray(assignees)) arr = assignees;
  else if (typeof assignees === 'string') arr = assignees.split(',');
  else if (Array.isArray(assignee)) arr = assignee;
  else if (typeof assignee === 'string') arr = assignee.split(',');
  return arr.map(s => String(s).trim()).filter(Boolean);
}

// ─── BRUTALIST BUTTON EFFECTS ─────────────────────────────────────────────────
const brutalistBtn = (shadowColor) => ({
  onMouseEnter: e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${shadowColor}`; e.currentTarget.style.background = e.currentTarget.dataset.hover },
  onMouseLeave: e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `4px 4px 0 0 ${shadowColor}`; e.currentTarget.style.background = e.currentTarget.dataset.bg },
  onMouseDown:  e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = `2px 2px 0 0 ${shadowColor}` },
  onMouseUp:    e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${shadowColor}` },
})

// ─── ADD CHOICE DIALOG ────────────────────────────────────────────────────────
function AddChoiceDialog({ itemLabel, dark, onManual, onAi, onClose }) {
  const overlayRef = useRef(null)
  const T = dark ? DARK : LIGHT
  const sh = dark ? '#686868' : '#000'
  const dialogBg = dark ? 'rgba(34,34,34,0.85)' : 'rgba(255,255,255,0.7)'
  const headerBg = dark ? T.headerBg : 'rgba(248,248,248,0.8)'
  const textColor = dark ? '#F0F0F0' : '#111'
  const closeColor = dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'
  const overlayBg = dark ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.6)'
  const aiAccent = dark ? B_YELLOW : '#bb9900'

  return (
    <div ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose() }}
      style={{ position:'fixed', inset:0, background:overlayBg, backdropFilter:'blur(4px)', zIndex:10100, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div style={{ background:dialogBg, backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', border:`3px solid ${T.border}`, boxShadow:`6px 6px 0 ${sh}`, width:'100%', maxWidth:'400px', animation:'qe-pop 0.2s cubic-bezier(0.34,1.56,0.64,1) both', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', backgroundImage:`linear-gradient(to right,${T.grid} 1px,transparent 1px),linear-gradient(to bottom,${T.grid} 1px,transparent 1px)`, backgroundSize:'20px 20px' }} />

        <div style={{ position:'relative', zIndex:1, padding:'14px 20px', borderBottom:`2px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', background:headerBg }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ background:aiAccent, color:dark?'#000':'#fff', padding:'3px 8px', fontSize:'9px', fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase' }}>新增</div>
            <span style={{ fontSize:'13px', fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, textTransform:'uppercase', fontStyle:'italic', color:textColor }}>{itemLabel}</span>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:closeColor, cursor:'pointer', fontSize:'20px', lineHeight:1, fontWeight:900, transition:'color 0.15s' }}
            onMouseEnter={e=>e.currentTarget.style.color=dark?B_PINK:'#FF0000'} onMouseLeave={e=>e.currentTarget.style.color=closeColor}>✕</button>
        </div>

        <div style={{ position:'relative', zIndex:1, padding:'16px 20px', display:'flex', flexDirection:'column', gap:'10px' }}>
          {[
            { icon:'✏️', label:'手動輸入', sub:'新增空白項目，自行填寫內容', onClick:onManual, accent:T.border },
            { icon:'⚡', label:'AI 生成',  sub:'根據現有內容，由 AI 自動生成建議', onClick:onAi,    accent:aiAccent },
          ].map(({ icon, label, sub, onClick, accent }) => (
            <button key={label} onClick={onClick}
              style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px 16px', background:dark?'rgba(255,255,255,0.06)':'rgba(255,255,255,0.4)', border:`2px solid ${dark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.15)'}`, cursor:'pointer', textAlign:'left', transition:'border-color 0.15s,background 0.15s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=accent;e.currentTarget.style.background=dark?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.8)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=dark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.15)';e.currentTarget.style.background=dark?'rgba(255,255,255,0.06)':'rgba(255,255,255,0.4)'}}>
              <span style={{ fontSize:'22px', flexShrink:0 }}>{icon}</span>
              <div>
                <div style={{ fontSize:'12px', fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, color:accent===T.border?T.text:accent, textTransform:'uppercase', marginBottom:'3px' }}>{label}</div>
                <div style={{ fontSize:'11px', fontFamily:'"Space Grotesk",sans-serif', fontWeight:700, color:T.textMuted }}>{sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── COLLAPSE BLOCK ───────────────────────────────────────────────────────────
function CollapseBlock({ label, headerTitle, headerColor, badge, defaultOpen=false, dark, indent=false, onDelete, onTitleChange, dragHandleProps, isDragOver, children }) {
  const [open, setOpen] = useState(defaultOpen)
  const T = dark ? DARK : LIGHT
  const _shadowMap = { [B_YELLOW]: dark?'#3a3800':'#4a4a00', [B_GREEN]: dark?'#004400':'#006600', [B_BLUE]: dark?'#16168c':'#2020b0', [B_PURPLE]: dark?'#3d1472':'#5020a0' }
  const baseShadow = _shadowMap[headerColor] ?? (dark ? '#444' : '#ccc')

  return (
    <div style={{
      border:       `2px solid ${isDragOver ? headerColor : T.border}`,
      marginBottom: '6px',
      marginLeft:   indent ? '14px' : 0,
      overflow:     'hidden',
      background:   'transparent',
      boxShadow:    `2px 2px 0 ${baseShadow}`,
      transition:   'border-color 0.12s, box-shadow 0.12s',
    }}>
      {/* header row */}
      <div style={{ display:'flex', alignItems:'center', background:open?T.altBg:'rgba(0,0,0,0.15)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', borderLeft:`4px solid ${headerColor}`, transition:'background 0.15s' }}>
        {/* drag grip */}
        {dragHandleProps && (
          <div {...dragHandleProps} title="拖拉排序"
            style={{ padding:'0 10px', display:'flex', alignItems:'center', cursor:'grab', opacity:0.3, flexShrink:0, alignSelf:'stretch', transition:'opacity 0.15s' }}
            onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0.3'}>
            <DragHandle color={headerColor} />
          </div>
        )}

        {/* toggle */}
        <button onClick={()=>setOpen(o=>!o)}
          style={{ flex:1, display:'flex', alignItems:'center', gap:'8px', background:'none', border:'none', padding:dragHandleProps?'9px 10px 9px 0':'9px 12px', cursor:'pointer', minWidth:0 }}>
          <span style={{ color:headerColor, display:'flex', alignItems:'center', flexShrink:0 }}><ChevronIcon open={open} /></span>
          <span style={{ fontSize:'10px', fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase', color:headerColor, flexShrink:0 }}>{label}</span>
          {headerTitle != null && (
            onTitleChange ? (
              <input onClick={e=>e.stopPropagation()}
                style={{ flex:1, minWidth:0, background:'transparent', border:'none', borderBottom:`1px solid ${dark?'rgba(255,255,255,0.18)':'rgba(0,0,0,0.18)'}`, outline:'none', fontSize:'11px', fontFamily:'"Space Grotesk",sans-serif', fontWeight:700, color:T.text, padding:'1px 4px', cursor:'text' }}
                value={headerTitle} placeholder="描述…" onChange={e=>onTitleChange(e.target.value)} />
            ) : (
              <span style={{ fontSize:'11px', fontFamily:'"Space Grotesk",sans-serif', fontWeight:700, color:T.textSub, flex:1, textAlign:'left', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{headerTitle}</span>
            )
          )}
          {headerTitle == null && <span style={{ flex:1 }} />}
          {badge != null && (
            <span style={{ fontSize:'9px', fontFamily:'"DM Mono",monospace', fontWeight:700, color:T.textMuted, background:T.altBg, border:`1px solid ${T.border}`, padding:'2px 7px', flexShrink:0 }}>{badge}</span>
          )}
        </button>

        {/* delete */}
        {onDelete && (
          <button onClick={e=>{e.stopPropagation();onDelete()}} title="刪除"
            style={{ flexShrink:0, background:'transparent', border:`2px solid rgba(255,80,80,0.3)`, color:'rgba(255,80,80,0.5)', cursor:'pointer', fontSize:'12px', lineHeight:1, padding:'4px 8px', margin:'0 8px', fontWeight:900, transition:'all 0.15s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,80,80,0.12)';e.currentTarget.style.borderColor=B_RED;e.currentTarget.style.color=B_RED;e.currentTarget.style.transform='translate(-1px,-1px)';e.currentTarget.style.boxShadow='2px 2px 0 '+B_RED}}
            onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='rgba(255,80,80,0.3)';e.currentTarget.style.color='rgba(255,80,80,0.5)';e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}
            onMouseDown={e=>{e.currentTarget.style.transform='translate(1px,1px)';e.currentTarget.style.boxShadow='1px 1px 0 '+B_RED}}
            onMouseUp={e=>{e.currentTarget.style.transform='translate(-1px,-1px)';e.currentTarget.style.boxShadow='2px 2px 0 '+B_RED}}>✕</button>
        )}
      </div>

      {open && (
        <div style={{ padding:'12px 14px 14px', borderTop:`2px solid ${T.border}` }}>
          {children}
        </div>
      )}
    </div>
  )
}

const STATUS_OPTIONS = [
  { value:'NotStarted', label:'未開始' },
  { value:'InProgress', label:'進行中' },
  { value:'Completed',  label:'已完成' },
  { value:'Overdue',    label:'已逾期' },
]
const STATUS_COLOR = { NotStarted:'#a8b4c9', InProgress:'#3b9ede', Completed:'#4caf7d', Overdue:'#e05252' }

// ─── MP LIST with drag ────────────────────────────────────────────────────────
function MpList({ todos, mpLabel, members, dark, onChange, maxDate = '' }) {
  const T = dark ? DARK : LIGHT
  const today = todayStr()
  const overdueRed = '#f12222'
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)
  const dragReadyRef = useRef(null)

  const inputSm = {
    background:T.inputBg, border:`1px solid ${T.border}`, color:T.text,
    fontFamily:'"Space Grotesk",sans-serif', fontWeight:700, fontSize:'11px',
    borderRadius:0, outline:'none', padding:'2px 6px', boxSizing:'border-box', height:'22px',
  }

  const update  = (ti,f,v) => onChange(todos.map((t,i)=>i===ti?{...t,[f]:v}:t))
  const remove  = ti        => onChange(todos.filter((_,i)=>i!==ti))
  const addTodo = ()        => onChange([...todos,{id:uid(),text:'',done:false,assignees:[],deadline:'',createdAt:new Date().toISOString()}])

  const onDragStart = (e,ti) => { if(dragReadyRef.current!==ti){e.preventDefault();return} setDragIdx(ti); e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',String(ti)) }
  const onDragOver  = (e,ti) => { e.preventDefault(); e.stopPropagation(); if(ti!==overIdx) setOverIdx(ti) }
  const onDrop      = (e,ti) => { e.preventDefault(); e.stopPropagation(); if(dragIdx!=null&&dragIdx!==ti) onChange(reorder(todos,dragIdx,ti)); setDragIdx(null); setOverIdx(null) }
  const onDragEnd   = ()     => { setDragIdx(null); setOverIdx(null); dragReadyRef.current=null }

  return (
    <div>
      {todos.length===0 && (
        <div style={{ fontSize:'11px', color:T.textMuted, fontFamily:'"DM Mono",monospace', fontWeight:600, padding:'4px 0 8px' }}>NO MP STEPS YET.</div>
      )}

      {todos.map((t,ti) => {
        const overdue = t.deadline && t.deadline < today && !t.done
        const isOver  = overIdx===ti && dragIdx!==ti
        return (
          <div key={t.id??ti} draggable
            onDragStart={e=>onDragStart(e,ti)} onDragOver={e=>onDragOver(e,ti)}
            onDrop={e=>onDrop(e,ti)} onDragEnd={onDragEnd}
            onMouseUp={()=>{dragReadyRef.current=null}}
            style={{
              display:'flex', alignItems:'flex-start', gap:'6px',
              padding:'5px 8px', marginBottom:'3px',
              background:isOver?(dark?'rgba(94,94,234,0.18)':'rgba(94,94,234,0.08)'):(dark?'rgba(94,94,234,0.06)':'rgba(94,94,234,0.025)'),
              border:`1px solid ${isOver?B_BLUE:T.border}`,
              borderLeft:`3px solid ${overdue?overdueRed:B_BLUE}`,
              opacity:dragIdx===ti?0.35:1, transition:'opacity 0.12s,border-color 0.12s,background 0.12s',
            }}>

            {/* drag handle */}
            <div title="拖拉排序"
              onMouseDown={()=>{dragReadyRef.current=ti}}
              style={{ flexShrink:0, marginTop:'3px', opacity:0.3, cursor:'grab', transition:'opacity 0.15s', userSelect:'none' }}
              onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0.3'}>
              <DragHandle color={B_BLUE} />
            </div>

            {/* index */}
            <span onMouseDown={()=>{dragReadyRef.current=ti}} style={{ fontSize:'10px', fontFamily:'"DM Mono",monospace', color:B_BLUE, fontWeight:700, flexShrink:0, marginTop:'4px', lineHeight:1.4, cursor:'grab' }}>{mpLabel}.{ti+1}</span>

            {/* checkbox */}
            <button onClick={()=>update(ti,'done',!t.done)}
              style={{ width:'14px', height:'14px', flexShrink:0, marginTop:'3px', border:`2px solid ${t.done?B_GREEN:T.border}`, borderRadius:0, background:t.done?B_GREEN:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, outline:'none', transition:'border-color 0.15s,background 0.15s' }}>
              {t.done && <CheckIcon />}
            </button>

            {/* text */}
            <textarea ref={taRef} rows={1}
              style={{ flex:1, background:'none', border:'none', borderBottom:`1px solid ${dark?'rgba(255,255,255,0.12)':'rgba(0,0,0,0.12)'}`, color:t.done?T.textMuted:(overdue?overdueRed:T.text), fontSize:'12px', fontFamily:'"Space Grotesk",sans-serif', fontWeight:700, outline:'none', padding:'2px 0', resize:'none', overflow:'hidden', lineHeight:1.5, textDecoration:t.done?'line-through':'none', minWidth:0 }}
              value={t.text} placeholder="MP 步驟描述…"
              onChange={e=>taChange(e,v=>update(ti,'text',v))} />

            {/* controls */}
            <div style={{ display:'flex', gap:'4px', flexShrink:0, alignItems:'center', marginTop:'2px' }}>
              <BrutalistSelect multiple
                value={parseAssignees(t.assignees, t.assignee)}
                onChange={v=>update(ti,'assignees',v)}
                options={members.map(mb=>({value:mb,label:mb}))}
                placeholder="負責人" darkMode={dark}
                overdue={overdue}
                style={{ width:'120px', fontSize:'11px', fontWeight:700, minHeight:'22px' }} />
              <input type="date"
                className={overdue ? 'qe-date-overdue' : ''}
                style={{ ...inputSm, width:'110px', fontFamily:'monospace', fontSize:'11px', color:overdue?overdueRed:(dark?'rgba(255,255,255,0.6)':'rgba(0,0,0,0.6)'), colorScheme:dark?'dark':'light', ...(overdue?{border:`1px solid ${overdueRed}`}:{}) }}
                value={t.deadline||''} max={maxDate||undefined} onChange={e=>update(ti,'deadline',e.target.value)} />
              <button onClick={()=>remove(ti)}
                style={{ background:'transparent', border:`2px solid ${B_RED}`, color:B_RED, cursor:'pointer', padding:0, width:'22px', height:'22px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'14px', lineHeight:1, fontWeight:900, transition:'all 0.15s' }}
                onMouseEnter={e=>{e.currentTarget.style.background=B_RED;e.currentTarget.style.color='#000';e.currentTarget.style.transform='translate(-1px,-1px)';e.currentTarget.style.boxShadow='2px 2px 0 #000'}}
                onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=B_RED;e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}
                onMouseDown={e=>{e.currentTarget.style.transform='translate(1px,1px)'}}
                onMouseUp={e=>{e.currentTarget.style.transform='translate(-1px,-1px)'}}>✕</button>
            </div>
          </div>
        )
      })}

      <button onClick={addTodo}
        style={{ marginTop:'8px', background:'none', border:'none', borderTop:`2px dashed ${T.border}`, color:T.textMuted, cursor:'pointer', fontSize:'11px', fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em', padding:'9px 8px', width:'100%', textAlign:'left', display:'flex', alignItems:'center', gap:'6px', transition:'all 0.15s' }}
        onMouseEnter={e=>{e.currentTarget.style.background = dark ? B_BLUE : '#4338ca'; e.currentTarget.style.color = dark ? '#000' : '#fff'; e.currentTarget.style.borderTopStyle = 'solid'}}
        onMouseLeave={e=>{e.currentTarget.style.background = 'none'; e.currentTarget.style.color = T.textMuted; e.currentTarget.style.borderTopStyle = 'dashed'}}>
        <span style={{ fontSize:'14px', lineHeight:1 }}>＋</span>新增 MP 步驟
      </button>
    </div>
  )
}

// ─── MEASURE CARD ─────────────────────────────────────────────────────────────
function MeasureCard({ m, mdLabel, members, dark, onField, onTodosChange, indent, noCollapse, onDelete, hideKpi, dragHandleProps, isDragOver, planDeadline = '' }) {
  const T = dark ? DARK : LIGHT

  const inputBase = {
    background:T.inputBg, border:`2px solid ${T.border}`, color:T.text,
    fontFamily:'"Space Grotesk",sans-serif', fontWeight:700, fontSize:'13px',
    lineHeight:1.5, borderRadius:0, outline:'none', width:'100%', resize:'none',
    padding:'8px 12px', boxSizing:'border-box', overflowY:'hidden',
  }
  const lbl = { fontSize:'9px', fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, letterSpacing:'0.12em', textTransform:'uppercase', color:T.textMuted, marginBottom:'5px', display:'block' }

  const todos     = m.todos || []
  const doneCount = todos.filter(t=>t.done).length
  const pct       = todos.length ? Math.round((doneCount/todos.length)*100) : (m.progress||0)

  const handleTodosChange = (nextTodos) => {
    const done   = nextTodos.filter(t=>t.done).length
    const newPct = nextTodos.length ? Math.round((done/nextTodos.length)*100) : 0
    const today  = todayStr()
    const isOver = m.deadline && m.deadline < today
    const newStatus = isOver&&newPct<100?'Overdue':newPct>=100?'Completed':newPct>0?'InProgress':'NotStarted'
    
    onTodosChange({ todos:nextTodos, progress:newPct, status:newStatus })
  }

  const handleDeadlineChange = (v) => {
    const nextDeadline = clampDateToMax(v, planDeadline)
    const isOver = nextDeadline && nextDeadline < todayStr()
    const newStatus = isOver&&pct<100?'Overdue':pct>=100?'Completed':pct>0?'InProgress':'NotStarted'
    onField('deadline', nextDeadline)
    onField('status', newStatus)
  }

  const rg = { marginBottom:'10px' }

  const inner = (
    <>
      {!hideKpi && (
        <div style={rg}>
          <span style={lbl}>MD 定量指標名稱</span>
          <textarea style={inputBase} value={m.kpi} rows={2} ref={taRef} onChange={e=>taChange(e,v=>onField('kpi',v))} placeholder="KPI 名稱…" />
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', ...rg }}>
        <div>
          <span style={lbl}>目標值</span>
          <textarea style={{ ...inputBase, color:B_YELLOW, fontStyle:'italic' }} value={m.target} rows={1} ref={taRef} onChange={e=>taChange(e,v=>onField('target',v))} placeholder="目標…" />
        </div>
        <div>
          <span style={lbl}>實際值</span>
          <textarea style={{ ...inputBase, color:B_GREEN, fontStyle:'italic' }} value={m.actual||''} rows={1} ref={taRef} onChange={e=>taChange(e,v=>onField('actual',v))} placeholder="實際…" />
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', ...rg }}>
        <div>
          <span style={lbl}>負責人</span>
          <BrutalistSelect multiple value={parseAssignees(m.assignees, m.assignee)} onChange={v=>onField('assignees',v)} options={members.map(mb=>({value:mb,label:mb}))} placeholder="負責人" darkMode={dark} style={{ fontSize:'12px', fontWeight:700, minHeight:'34px' }} />
        </div>
        <div>
          <span style={lbl}>期限</span>
          <input type="date" style={{ ...inputBase, fontFamily:'monospace', fontSize:'12px', height:'34px', padding:'4px 8px', colorScheme:dark?'dark':'light' }} value={m.deadline||''} max={planDeadline||undefined} onChange={e=>handleDeadlineChange(e.target.value)} />
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'14px' }}>
        <div>
          <span style={lbl}>狀態</span>
          <div style={{ ...inputBase, height:'34px', padding:'0 12px', display:'flex', alignItems:'center', color:STATUS_COLOR[m.status]||STATUS_COLOR.NotStarted, fontSize:'12px', fontWeight:900, userSelect:'none' }}>
            {STATUS_OPTIONS.find(o=>o.value===(m.status||'NotStarted'))?.label??'未開始'}
          </div>
        </div>
        <div>
          <span style={lbl}>進度</span>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'6px' }}>
            <div style={{ flex:1, height:'6px', background:dark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.08)', overflow:'hidden', border:`1px solid ${T.border}` }}>
              <div style={{ height:'100%', width:`${pct}%`, background:pct>=100?B_GREEN:pct>=60?B_BLUE:pct>=30?B_YELLOW:B_RED, transition:'width 0.3s,background 0.3s' }} />
            </div>
            <span style={{ fontSize:'12px', fontFamily:'monospace', fontWeight:900, color:B_PURPLE, flexShrink:0, minWidth:'36px', textAlign:'right' }}>{pct}%</span>
          </div>
        </div>
      </div>
      <CollapseBlock label="MP 檢核步驟" headerColor={B_BLUE} badge={`${doneCount} / ${todos.length} 完成`} defaultOpen={todos.length>0} dark={dark}>
        <MpList todos={todos} mpLabel={mdLabel} members={members} dark={dark} onChange={handleTodosChange} maxDate={m.deadline||''} />
      </CollapseBlock>
    </>
  )

  if (noCollapse) return <div><div style={{ paddingLeft:'2px' }}>{inner}</div></div>

  return (
    <CollapseBlock label={`MD  D${mdLabel}`} headerTitle={m.kpi||''} headerColor={B_PURPLE} defaultOpen={false} dark={dark} indent={indent} onDelete={onDelete} onTitleChange={v=>onField('kpi',v)} dragHandleProps={dragHandleProps} isDragOver={isDragOver}>
      {inner}
    </CollapseBlock>
  )
}

// ─── QUICKEDITMODAL ──────────────────────────────────────────────────────────
export default function QuickEditModal({ type, data, label, members=[], dark, objective='', goalText='', planDeadline='', onSave, onClose }) {
  const [local, setLocal]         = useState(()=>JSON.parse(JSON.stringify(data)))
  const [choice, setChoice]       = useState(null)
  const [aiDialog, setAiDialog]   = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  // drag: strategies (goal mode)
  const [dragSI, setDragSI] = useState(null)
  const [overSI, setOverSI] = useState(null)
  // drag: measures (strategy mode)
  const [dragMI, setDragMI] = useState(null)
  const [overMI, setOverMI] = useState(null)
  // drag: measures inside strategy (goal mode)
  const [dragGM, setDragGM] = useState(null)  // {si,mi}
  const [overGM, setOverGM] = useState(null)  // {si,mi}

  const [bgConfig, setBgConfig] = useState(() => loadSavedBgConfig())
  useEffect(() => {
    const handleBgChange = () => setBgConfig(loadSavedBgConfig())
    window.addEventListener('brutalistBgChanged', handleBgChange)
    return () => window.removeEventListener('brutalistBgChanged', handleBgChange)
  }, [])

  const overlayRef = useRef(null)
  const T  = dark ? DARK : LIGHT
  const sh = dark ? '#686868' : '#000'
  const accentColor = type==='goal'?B_YELLOW:type==='strategy'?B_GREEN:B_PURPLE
  const _accentShadowMap = { [B_YELLOW]: dark?'#3a3800':'#4a4a00', [B_GREEN]: dark?'#006600':'#004400', [B_PURPLE]: dark?'#3d1472':'#5020a0' }
  const accentShadow = _accentShadowMap[accentColor] ?? (dark?'#223fce':'#7389dd')

  const inputBase = {
    background:T.inputBg, border:`2px solid ${T.border}`, color:T.text,
    fontFamily:'"Space Grotesk",sans-serif', fontWeight:700, fontSize:'13px',
    lineHeight:1.5, borderRadius:0, outline:'none', width:'100%', resize:'none',
    padding:'8px 12px', boxSizing:'border-box', overflowY:'hidden',
  }

  // ── state helpers ─────────────────────────────────────────────────────────
  const setGoalText      = v        => setLocal(l=>({...l,goal:{...l.goal,text:v}}))
  const setStratText     = (si,v)   => setLocal(l=>({...l,strategies:l.strategies.map((s,i)=>i!==si?s:{...s,text:v})}))
  const setGoalMField    = (si,mi,f,v) => setLocal(l=>({...l,strategies:l.strategies.map((s,i)=>i!==si?s:{...s,measures:s.measures.map((m,j)=>j!==mi?m:{...m,[f]:v})})}))
  const setGoalTodos     = (si,mi,p)   => setLocal(l=>({...l,strategies:l.strategies.map((s,i)=>i!==si?s:{...s,measures:s.measures.map((m,j)=>j!==mi?m:{...m,...p})})}))
  const setStrategyText  = v        => setLocal(l=>({...l,strategy:{...l.strategy,text:v}}))
  const setStratMField   = (mi,f,v) => setLocal(l=>({...l,measures:l.measures.map((m,i)=>i!==mi?m:{...m,[f]:v})}))
  const setStratTodos    = (mi,p)   => setLocal(l=>({...l,measures:l.measures.map((m,i)=>i!==mi?m:{...m,...p})}))
  const setMeasureField  = (f,v)    => setLocal(l=>({...l,measure:{...l.measure,[f]:v}}))
  const setMeasureTodos  = p        => setLocal(l=>({...l,measure:{...l.measure,...p}}))

  const addStrategy       = ()       => setLocal(l=>({...l,strategies:[...(l.strategies||[]),emptyStrategy()]}))
  const removeStrategy    = si       => setLocal(l=>({...l,strategies:(l.strategies||[]).filter((_,i)=>i!==si)}))
  const addGoalMeasure    = si       => setLocal(l=>({...l,strategies:l.strategies.map((s,i)=>i!==si?s:{...s,measures:[...s.measures,emptyMeasure()]})}))
  const removeGoalMeasure = (si,mi)  => setLocal(l=>({...l,strategies:l.strategies.map((s,i)=>i!==si?s:{...s,measures:s.measures.filter((_,j)=>j!==mi)})}))
  const addStratMeasure   = ()       => setLocal(l=>({...l,measures:[...(l.measures||[]),emptyMeasure()]}))
  const removeStratMeasure= mi       => setLocal(l=>({...l,measures:(l.measures||[]).filter((_,i)=>i!==mi)}))

  // ── reorder ───────────────────────────────────────────────────────────────
  const reorderStrategies   = (f,t) => setLocal(l=>({...l,strategies:reorder(l.strategies,f,t)}))
  const reorderStratMeasures= (f,t) => setLocal(l=>({...l,measures:reorder(l.measures,f,t)}))
  const reorderGoalMeasures = (si,f,t) => setLocal(l=>({...l,strategies:l.strategies.map((s,i)=>i!==si?s:{...s,measures:reorder(s.measures,f,t)})}))

  // ── AI ────────────────────────────────────────────────────────────────────
  const makeTodos   = arr => (arr||[]).map(t=>({id:crypto.randomUUID(),text:typeof t==='string'?t:(t.text||''),done:false,assignees:[],deadline:typeof t==='object'?(t.deadline||''):'',createdAt:new Date().toISOString()}))
  const makeMeasure = (m,idx) => ({id:null,kpi:m.kpi||'',target:m.target||'',deadline:clampDateToMax(m.deadline||'', planDeadline),assignees:[],actual:'',progress:0,status:'NotStarted',sortOrder:idx,todos:makeTodos(m.todos)})

  const handleAiConfirm = async (text) => {
    if (!aiDialog) return
    const {aiType, si} = aiDialog
    setAiLoading(true)
    try {
      if (aiType==='strategy') {
        const res = await api.generateForStrategy({strategyText:text,goalText:local.goal?.text||goalText,objective})
        const newSt = {id:null,text:text.trim()||res.strategyText||'',sortOrder:(local.strategies||[]).length,todos:[],measures:(res.measures||[]).map(makeMeasure)}
        setLocal(l=>({...l,strategies:[...(l.strategies||[]),newSt]}))
      } else {
        const stratText = si!=null?(local.strategies?.[si]?.text||''):(local.strategy?.text||goalText)
        const res = await api.generateForMeasure({kpiText:text,strategyText:stratText,objective})
        const newM = makeMeasure({kpi:text.trim()||res.kpiText||'',target:res.target||'',deadline:res.deadline||'',todos:res.todos},0)
        if (si!=null) setLocal(l=>({...l,strategies:l.strategies.map((s,i)=>i!==si?s:{...s,measures:[...s.measures,newM]})}))
        else          setLocal(l=>({...l,measures:[...(l.measures||[]),newM]}))
      }
    } catch(e) { alert('AI 生成失敗：'+e.message) }
    finally { setAiLoading(false); setAiDialog(null) }
  }

  // ── body ──────────────────────────────────────────────────────────────────
  const AddRowBtn = ({ label:btnLabel, color, forType, si=null }) => {
    const hoverBg = color ?? (dark ? B_YELLOW : '#b8a800')
    const hoverText = dark ? '#000' : '#fff'
    const baseText = color ?? T.textMuted

    return (
      <button onClick={()=>setChoice({forType,si})}
        style={{ width:'100%', background:'none', border:'none', borderTop:`2px dashed ${color??T.border}`, color:baseText, cursor:'pointer', padding:'9px 8px', fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.1em', textAlign:'left', display:'flex', alignItems:'center', gap:'6px', transition:'all 0.15s' }}
        onMouseEnter={e=>{e.currentTarget.style.background=hoverBg; e.currentTarget.style.color=hoverText; e.currentTarget.style.borderTopStyle='solid'}}
        onMouseLeave={e=>{e.currentTarget.style.background='none'; e.currentTarget.style.color=baseText; e.currentTarget.style.borderTopStyle='dashed'}}>
        <span style={{ fontSize:'14px', lineHeight:1 }}>＋</span>{btnLabel}
      </button>
    )
  }

  const renderBody = () => {

    /* ── GOAL ── */
    if (type==='goal') {
      const gNum = label.replace('G','')
      return (
        <>
          {(local.strategies||[]).map((st,si) => (
            <div key={si}
              onDragOver={e=>{e.preventDefault();if(si!==overSI)setOverSI(si)}}
              onDrop={e=>{e.preventDefault();if(dragSI!=null&&dragSI!==si)reorderStrategies(dragSI,si);setDragSI(null);setOverSI(null)}}
              onDragEnd={()=>{setDragSI(null);setOverSI(null)}}
              style={{ opacity:dragSI===si?0.35:1, transition:'opacity 0.12s' }}>
              <CollapseBlock
                label={`Strategy  S${gNum}.${si+1}`}
                headerTitle={st.text||''} headerColor={dark ? B_GREEN : '#1a9e1a'} indent
                defaultOpen={false} dark={dark}
                onDelete={()=>removeStrategy(si)}
                onTitleChange={v=>setStratText(si,v)}
                isDragOver={overSI===si&&dragSI!==si}
                dragHandleProps={{ draggable:true, onDragStart:e=>{e.stopPropagation();setDragSI(si);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(si))} }}>

                {(st.measures||[]).map((m,mi) => (
                  <div key={mi}
                    onDragOver={e=>{e.preventDefault();e.stopPropagation();if(!(overGM?.si===si&&overGM?.mi===mi))setOverGM({si,mi})}}
                    onDrop={e=>{e.preventDefault();e.stopPropagation();if(dragGM&&dragGM.si===si&&dragGM.mi!==mi)reorderGoalMeasures(si,dragGM.mi,mi);setDragGM(null);setOverGM(null)}}
                    onDragEnd={()=>{setDragGM(null);setOverGM(null)}}
                    style={{ opacity:dragGM?.si===si&&dragGM?.mi===mi?0.35:1, transition:'opacity 0.12s' }}>
                    <MeasureCard m={m} mdLabel={`${gNum}.${si+1}.${mi+1}`} members={members} dark={dark} indent hideKpi planDeadline={planDeadline}
                      onField={(f,v)=>setGoalMField(si,mi,f,v)} onTodosChange={p=>setGoalTodos(si,mi,p)}
                      onDelete={()=>removeGoalMeasure(si,mi)}
                      isDragOver={overGM?.si===si&&overGM?.mi===mi&&!(dragGM?.si===si&&dragGM?.mi===mi)}
                      dragHandleProps={{ draggable:true, onDragStart:e=>{e.stopPropagation();setDragGM({si,mi});e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',`${si}-${mi}`)} }} />
                  </div>
                ))}
                <AddRowBtn label="新增 MD 定量指標" color={dark ? B_PURPLE : '#7c3aed'} forType="measure" si={si} />
              </CollapseBlock>
            </div>
          ))}
          <AddRowBtn label="新增 Strategy" color={dark ? B_GREEN : '#1a9e1a'} forType="strategy" />
        </>
      )
    }

    /* ── STRATEGY ── */
    if (type==='strategy') {
      const sNum = label.replace('S','')
      return (
        <>
          {(local.measures||[]).map((m,mi) => (
            <div key={mi}
              onDragOver={e=>{e.preventDefault();if(mi!==overMI)setOverMI(mi)}}
              onDrop={e=>{e.preventDefault();if(dragMI!=null&&dragMI!==mi)reorderStratMeasures(dragMI,mi);setDragMI(null);setOverMI(null)}}
              onDragEnd={()=>{setDragMI(null);setOverMI(null)}}
              style={{ opacity:dragMI===mi?0.35:1, transition:'opacity 0.12s' }}>
              <MeasureCard m={m} mdLabel={`${sNum}.${mi+1}`} members={members} dark={dark} hideKpi planDeadline={planDeadline}
                onField={(f,v)=>setStratMField(mi,f,v)} onTodosChange={p=>setStratTodos(mi,p)}
                onDelete={()=>removeStratMeasure(mi)}
                isDragOver={overMI===mi&&dragMI!==mi}
                dragHandleProps={{ draggable:true, onDragStart:e=>{e.stopPropagation();setDragMI(mi);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(mi))} }} />
            </div>
          ))}
          <AddRowBtn label="新增 MD 定量指標" color={dark ? B_PURPLE : '#7c3aed'} forType="measure" />
        </>
      )
    }

    /* ── MEASURE ── */
    return <MeasureCard m={local.measure} mdLabel={label.replace('D','')} members={members} dark={dark} noCollapse hideKpi planDeadline={planDeadline} onField={setMeasureField} onTodosChange={setMeasureTodos} />
  }

  const btnH = brutalistBtn(sh)

  return (
    <>
      <style>{`
        @keyframes qe-pop  { from{transform:scale(0.88);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes qe-scan { 0%{top:-4px} 100%{top:100%} }
        @keyframes qe-spin { to{transform:rotate(360deg)} }
        .qe-date-overdue::-webkit-calendar-picker-indicator { filter: brightness(0) saturate(100%) invert(12%) sepia(90%) saturate(6000%) hue-rotate(0deg) brightness(85%) !important; }
      `}</style>

      {/* backdrop */}
      <div ref={overlayRef} onClick={e=>{if(e.target===overlayRef.current)onClose()}}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', backdropFilter:'blur(4px)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
        {/* modal */}
          <div style={{ background:'transparent', border:`3px solid ${accentColor}`, boxShadow:`8px 8px 0 ${accentShadow}`, width:'100%', maxWidth:type==='measure'?'640px':'800px', maxHeight:'90vh', display:'flex', flexDirection:'column', animation:'qe-pop 0.22s cubic-bezier(0.34,1.56,0.64,1) both', position:'relative', overflow:'hidden' }}>
            
            <BrutalistBackground dark={dark} bgConfig={bgConfig} />

          {/* header */}
          <div style={{ position:'relative', zIndex:2, background:T.headerBg, backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', padding:'14px 24px', borderBottom:`3px solid ${accentColor}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', flex:1, minWidth:0 }}>
              <div style={{ background:accentColor, color:'#000', padding:'6px 12px', fontSize:'10px', fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, letterSpacing:'0.12em', textTransform:'uppercase', flexShrink:0 }}>{label}</div>
              <input
                style={{ flex:1, minWidth:0, background:'transparent', border:'none', borderBottom:`2px solid rgba(255,255,255,0.22)`, outline:'none', fontSize:'16px', fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, textTransform:'uppercase', fontStyle:'italic', color:'#F0F0F0', letterSpacing:'-0.01em', padding:'2px 4px' }}
                value={type==='goal'?(local.goal?.text||''):type==='strategy'?(local.strategy?.text||''):(local.measure?.kpi||'')}
                placeholder={type==='goal'?'Goal 描述…':type==='strategy'?'Strategy 描述…':'KPI 名稱…'}
                onChange={e=>{const v=e.target.value;if(type==='goal')setGoalText(v);else if(type==='strategy')setStrategyText(v);else setMeasureField('kpi',v)}} />
            </div>
            <button onClick={onClose}
              style={{ background:'none', border:'none', color:'rgba(255,255,255,0.55)', cursor:'pointer', padding:'4px', marginLeft:'12px', transition:'color 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.color=B_PINK} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.55)'}>
              <XIcon />
            </button>
          </div>

          {/* body */}
          <div style={{ flex:1, minHeight:0, overflowY:'auto', padding:'16px 20px', position:'relative', zIndex:2 }}>
            {renderBody()}
          </div>

          {/* footer */}
          <div style={{ position:'relative', zIndex:2, background:'transparent', padding:'14px 24px', display:'flex', justifyContent:'flex-end', gap:'12px', flexShrink:0 }}>            <button onClick={onClose} data-bg={'transparent'} data-hover={dark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.05)'}
              style={{ background:'transparent', border:`3px solid ${T.border}`, color:T.text, fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'13px', textTransform:'uppercase', letterSpacing:'0.08em', padding:'9px 22px', cursor:'pointer', boxShadow:`4px 4px 0 0 ${sh}`, transition:'all 0.15s' }}
              {...btnH}>取消</button>
            <button onClick={()=>onSave(local)} data-bg={accentColor} data-hover={dark?'#223fce':'#7389dd'}
              style={{ background:accentColor, border:`3px solid ${dark?'#a9a9a9':'#000'}`, color:'#000', fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'13px', textTransform:'uppercase', letterSpacing:'0.08em', padding:'9px 28px', cursor:'pointer', boxShadow:`4px 4px 0 0 ${sh}`, transition:'all 0.15s' }}
              {...btnH}>SAVE</button>
          </div>
        </div>
      </div>

      {choice && (
        <AddChoiceDialog itemLabel={choice.forType==='strategy'?'Strategy':'MD 定量指標'} dark={dark} onClose={()=>setChoice(null)}
          onManual={()=>{if(choice.forType==='strategy')addStrategy();else if(choice.si!=null)addGoalMeasure(choice.si);else addStratMeasure();setChoice(null)}}
          onAi={()=>{setAiDialog({aiType:choice.forType,si:choice.si});setChoice(null)}} />
      )}

      {aiDialog && !aiLoading && (
        <AiConfirmDialog type={aiDialog.aiType==='strategy'?'strategy':'measure'} currentText="" darkMode={dark} onConfirm={handleAiConfirm} onCancel={()=>setAiDialog(null)} />
      )}

      {aiLoading && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', zIndex:10200, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'20px' }}>
          <div style={{ width:'44px', height:'44px', border:'5px solid rgba(255,255,255,0.1)', borderTopColor:B_YELLOW, animation:'qe-spin 0.7s linear infinite' }} />
          <div style={{ color:B_YELLOW, fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'13px', textTransform:'uppercase', letterSpacing:'0.1em' }}>AI 生成中…</div>
        </div>
      )}
    </>
  )
}