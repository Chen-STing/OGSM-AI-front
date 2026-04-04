import { useState } from 'react'
import { genModalShapes, MODAL_DEFAULT_CONFIGS } from '../bgConfig.js'

const ACCENT_BLUE   = "#5e5eea";
const ACCENT_PINK   = "#FF00FF";
const ACCENT_YELLOW = "#FFFF00";
const ACCENT_GREEN  = "#00FF00";

const DARK  = { bg:'#222222', border:'#DDDDDD', text:'#F0F0F0', textSub:'#B8B8B8', textMuted:'#888888', inputBg:'#1A1A1A', altBg:'rgba(255,255,255,0.07)' }
const LIGHT = { bg:'#FFFFFF', border:'#111111', text:'#111111', textSub:'#484848', textMuted:'#777777', inputBg:'#F8F8F8',  altBg:'rgba(0,0,0,0.04)' }

const D = {
  dialog:    { position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'560px', maxWidth:'94vw', borderRadius:'0', padding:'28px', zIndex:601, animation:'scaleIn 0.18s ease', maxHeight:'82vh', display:'flex', flexDirection:'column' },
  header:    { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px', flexShrink:0 },
  input:     { borderRadius:'0', padding:'9px 12px', fontFamily:'"Space Grotesk","Noto Sans TC",sans-serif', fontSize:'14px', fontWeight:600, outline:'none' },
  editInput: { borderRadius:'0', padding:'4px 8px', fontFamily:'"Space Grotesk","Noto Sans TC",sans-serif', fontSize:'13px', fontWeight:600, outline:'none' },
  actionBtn: { padding:'9px 16px', borderRadius:'0', fontFamily:'"Space Grotesk","Noto Sans TC",sans-serif', fontSize:'14px', fontWeight:900, cursor:'pointer', flexShrink:0, letterSpacing:'0.5px' },
  list:      { flex:1, overflowY:'auto', border:'2px solid', borderRadius:'0' },
  memberRow: { display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', borderBottom:'2px solid', transition:'background 0.12s' },
  iconBtn:   { padding:'4px 8px', borderRadius:'0', cursor:'pointer', fontSize:'11px', fontWeight:900, transition:'all 0.15s' },
  closeBtn:  { padding:'9px 32px', borderRadius:'0', fontFamily:'"Space Grotesk","Noto Sans TC",sans-serif', fontSize:'14px', cursor:'pointer', letterSpacing:'1px' },
}

function renderShapes(shapes) {
  return (
    <>
      {shapes.stars.map((s,i)=>(
        <div key={`ms-s${i}`} style={{ position:'absolute',...s.pos, color:s.color, opacity:0.18, pointerEvents:'none', zIndex:0, animation:s.anim }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"><path d="M12 2.5L14.7 8.8L21.5 9.5L16.3 14L17.8 20.7L12 17.2L6.2 20.7L7.7 14L2.5 9.5L9.3 8.8L12 2.5Z"/></svg>
        </div>
      ))}
      {shapes.crosses.map((s,i)=>(
        <div key={`ms-x${i}`} style={{ position:'absolute',...s.pos, color:s.color, opacity:0.18, pointerEvents:'none', zIndex:0, animation:s.anim }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="square"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </div>
      ))}
      {shapes.circles.map((s,i)=>(
        <div key={`ms-c${i}`} style={{ position:'absolute',...s.pos, color:s.color, opacity:0.18, pointerEvents:'none', zIndex:0, animation:s.anim }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/></svg>
        </div>
      ))}
      {shapes.tris.map((s,i)=>(
        <div key={`ms-t${i}`} style={{ position:'absolute',...s.pos, color:s.color, opacity:0.2, pointerEvents:'none', zIndex:0, animation:s.anim }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter"><polygon points="12,2 22,20 2,20"/></svg>
        </div>
      ))}
    </>
  )
}

export default function MemberSettings({ members=[], onChange, onClose, darkMode=true, shapeConfig }) {
  const [draft,      setDraft]      = useState([...members])
  const [inputVal,   setInputVal]   = useState('')
  const [searchVal,  setSearchVal]  = useState('')
  const [editingIdx, setEditingIdx] = useState(null)
  const [editVal,    setEditVal]    = useState('')

  const T = darkMode ? DARK : LIGHT
  const cfg    = shapeConfig ?? MODAL_DEFAULT_CONFIGS.member
  const shapes = genModalShapes('member', cfg, cfg.seed)

  const filteredDraft = searchVal.trim()
    ? draft.map((name,idx)=>({name,idx})).filter(({name})=>name.toLowerCase().includes(searchVal.trim().toLowerCase()))
    : draft.map((name,idx)=>({name,idx}))

  const addMember    = () => { const name=inputVal.trim(); if(!name||draft.includes(name))return; setDraft(p=>[...p,name]); setInputVal('') }
  const removeMember = (idx) => { setDraft(p=>p.filter((_,i)=>i!==idx)); if(editingIdx===idx)setEditingIdx(null) }
  const startEdit    = (idx) => { setEditingIdx(idx); setEditVal(draft[idx]) }
  const confirmEdit  = (idx) => { const name=editVal.trim(); if(!name)return; setDraft(p=>{const n=[...p];n[idx]=name;return n}); setEditingIdx(null) }
  const handleDone   = () => { let f=draft; if(editingIdx!==null&&editVal.trim()){f=[...draft];f[editingIdx]=editVal.trim()}; onChange(f); onClose() }
  const handleCancel = () => { setEditingIdx(null); onClose() }
  const handleKey    = (e) => { if(e.key==='Enter')addMember(); if(e.key==='Escape')handleCancel() }
  const handleEditKey= (e,idx) => { if(e.key==='Enter')confirmEdit(idx); if(e.key==='Escape')setEditingIdx(null) }

  const shadowColor = darkMode?'#686868':'#000'
  const makeBtnHandlers = (bgColor, shadowColor) => ({
    onMouseEnter:(e)=>{ e.currentTarget.style.transform='translate(-2px,-2px)'; e.currentTarget.style.boxShadow=`6px 6px 0 0 ${shadowColor}`; e.currentTarget.style.background=darkMode?'#223fce':'#7389dd'; e.currentTarget.style.color=ACCENT_YELLOW },
    onMouseLeave:(e)=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=`4px 4px 0 0 ${shadowColor}`; e.currentTarget.style.background=bgColor; e.currentTarget.style.color='#000' },
    onMouseDown: (e)=>{ e.currentTarget.style.transform='translate(2px,2px)'; e.currentTarget.style.boxShadow='2px 2px 0 0 #000' },
    onMouseUp:   (e)=>{ e.currentTarget.style.transform='translate(-2px,-2px)'; e.currentTarget.style.boxShadow='6px 6px 0 0 #000' },
  })
  const doneBtnHandlers   = makeBtnHandlers(ACCENT_YELLOW, shadowColor)
  const addBtnHandlers    = makeBtnHandlers(ACCENT_GREEN,  shadowColor)
  const searchBtnHandlers = makeBtnHandlers(ACCENT_BLUE,   shadowColor)

  return (
    <>
      <style>{`
        @keyframes ms-starFloat   { 0%{transform:translate(0,0) rotate(0deg) scale(1)} 25%{transform:translate(20px,-30px) rotate(90deg) scale(1.25)} 50%{transform:translate(-10px,20px) rotate(180deg) scale(0.85)} 75%{transform:translate(30px,10px) rotate(270deg) scale(1.15)} 100%{transform:translate(0,0) rotate(360deg) scale(1)} }
        @keyframes ms-crossFloat  { 0%{transform:translate(0,0) rotate(0deg) scale(1)} 33%{transform:translate(-25px,20px) rotate(120deg) scale(1.2)} 66%{transform:translate(15px,-15px) rotate(240deg) scale(0.8)} 100%{transform:translate(0,0) rotate(360deg) scale(1)} }
        @keyframes ms-circleFloat { 0%{transform:translate(0,0) scale(0.88)} 33%{transform:translate(20px,-25px) scale(2)} 66%{transform:translate(-15px,15px) scale(1.5)} 100%{transform:translate(0,0) scale(0.88)} }
        @keyframes ms-triFloat    { 0%{transform:translate(0,0) rotate(0deg) scale(1)} 50%{transform:translate(-20px,-30px) rotate(180deg) scale(1.2)} 100%{transform:translate(0,0) rotate(360deg) scale(1)} }
      `}</style>
      <div style={{ position:'fixed', inset:0, background:darkMode?'rgba(0,0,0,0.8)':'rgba(255,255,255,0.8)', backdropFilter:'grayscale(100%) blur(4px)', zIndex:600, transition:'background 0.3s ease' }} onClick={handleCancel} />
      <div style={{ ...D.dialog, backgroundColor:T.bg, border:`3px solid ${T.border}`, boxShadow:`8px 8px 0px ${darkMode?'#3B5BDB':'#4A6CF7'}`, backgroundImage:darkMode?'linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)':'linear-gradient(rgba(0,0,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.05) 1px,transparent 1px)', backgroundSize:'20px 20px', overflow:'hidden', transition:'background-color 0.3s ease,background-image 0.3s ease,border 0.3s ease' }}>

        {renderShapes(shapes)}

        <div style={{ ...D.header, position:'relative', zIndex:1 }}>
          <div>
            <div style={{ fontSize:'12px', fontFamily:'"DM Mono",monospace', color:ACCENT_BLUE, fontWeight:900, letterSpacing:'1px', marginBottom:'4px' }}>[ SETTINGS ]</div>
            <div style={{ fontFamily:'"Space Grotesk","Syne",sans-serif', fontWeight:900, fontSize:'20px', color:T.text }}>人員管理</div>
          </div>
          <button style={{ background:'none', border:'none', color:T.text, cursor:'pointer', fontSize:'20px', padding:'4px', fontWeight:900, transition:'color 0.15s' }} onClick={handleCancel}
            onMouseEnter={e=>{e.currentTarget.style.color='#c96e6e'}} onMouseLeave={e=>{e.currentTarget.style.color=T.text}}>✕</button>
        </div>

        <p style={{ position:'relative', zIndex:1, fontSize:'13px', color:T.textSub, lineHeight:1.6, marginBottom:'20px', fontWeight:500 }}>
          新增專案成員後，可在各 MD 定量指標與 MP 檢核步驟的負責人欄位中選取。
        </p>

        <div style={{ position:'relative', zIndex:1, display:'flex', gap:'8px', marginBottom:'16px', alignItems:'stretch' }}>
          <div style={{ position:'relative', flex:1, display:'flex' }}>
            <input type="text"
              style={{ ...D.input, background:T.inputBg, border:`2px solid ${T.border}`, color:T.text, width:'100%', boxSizing:'border-box', paddingRight:inputVal?'32px':'12px', height:'100%', backdropFilter:'blur(2px)', WebkitBackdropFilter:'blur(2px)' }}
              value={inputVal} onChange={e=>setInputVal(e.target.value)} onKeyDown={handleKey}
              placeholder="輸入成員姓名，SEARCH搜尋 或 ADD新增" autoFocus />
            {inputVal && (
              <button onClick={()=>setInputVal('')} title="清除"
                style={{ position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:T.textMuted, fontSize:'14px', fontWeight:900, padding:'2px 4px', lineHeight:1, transition:'color 0.15s' }}
                onMouseEnter={e=>{e.currentTarget.style.color=ACCENT_PINK}} onMouseLeave={e=>{e.currentTarget.style.color=T.textMuted}}>✕</button>
            )}
          </div>
          <button style={{ ...D.actionBtn, background:ACCENT_BLUE, color:'#fff', border:`3px solid ${darkMode?'#a9a9a9':'#000'}`, fontWeight:900, boxShadow:`4px 4px 0 0 ${shadowColor}`, transition:'all 0.15s' }} onClick={()=>setSearchVal(inputVal.trim())} title="搜尋成員" {...searchBtnHandlers}>🔍 SEARCH</button>
          <button style={{ ...D.actionBtn, ...(inputVal.trim()?{background:ACCENT_GREEN,color:'#000',border:`3px solid ${darkMode?'#a9a9a9':'#000'}`,fontWeight:900,boxShadow:`4px 4px 0 0 ${shadowColor}`,transition:'all 0.15s'}:{background:T.altBg,color:T.textMuted,border:`2px dashed ${T.border}`,opacity:0.5,cursor:'not-allowed',transition:'all 0.15s'}) }} onClick={addMember} disabled={!inputVal.trim()} {...(inputVal.trim()?addBtnHandlers:{})}>+ ADD</button>
        </div>

        {searchVal && (
          <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
            <span style={{ fontSize:'12px', fontFamily:'"DM Mono",monospace', color:ACCENT_BLUE, fontWeight:700 }}>SEARCH: "{searchVal}"</span>
            <button style={{ fontSize:'11px', fontWeight:900, padding:'2px 8px', background:'transparent', border:`2px solid ${ACCENT_PINK}`, color:ACCENT_PINK, cursor:'pointer', transition:'all 0.15s' }} onClick={()=>setSearchVal('')}
              onMouseEnter={e=>{e.currentTarget.style.background=ACCENT_PINK;e.currentTarget.style.color='#000'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=ACCENT_PINK}}>✕ 清除</button>
            <span style={{ fontSize:'11px', color:T.textMuted, fontFamily:'"DM Mono",monospace' }}>{filteredDraft.length} / {draft.length} 筆</span>
          </div>
        )}

        <div style={{ ...D.list, position:'relative', zIndex:1, borderColor:T.border, backgroundColor:'transparent', backdropFilter:'blur(2px)', WebkitBackdropFilter:'blur(2px)' }}>
          {draft.length===0 ? (
            <div style={{ padding:'24px', textAlign:'center', color:T.textMuted, fontSize:'13px', fontFamily:'"DM Mono",monospace', fontWeight:600 }}>NO MEMBERS FOUND.</div>
          ) : filteredDraft.length===0 ? (
            <div style={{ padding:'24px', textAlign:'center', color:T.textMuted, fontSize:'13px', fontFamily:'"DM Mono",monospace', fontWeight:600 }}>NO RESULTS FOR "{searchVal}".</div>
          ) : (
            filteredDraft.map(({name:m,idx})=>(
              <div key={idx} style={{ ...D.memberRow, borderBottomColor:T.border, background:idx%2===1?T.altBg:'transparent' }}>
                <span style={{ fontSize:'14px', flexShrink:0 }}>👤</span>
                {editingIdx===idx ? (
                  <input type="text" style={{ ...D.editInput, background:T.inputBg, border:`2px solid ${ACCENT_BLUE}`, color:T.text, flex:1, backdropFilter:'blur(2px)', WebkitBackdropFilter:'blur(2px)' }}
                    value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>handleEditKey(e,idx)} autoFocus />
                ) : (
                  <span style={{ flex:1, fontSize:'14px', color:T.text, fontWeight:700, fontFamily:'"Noto Sans TC","Space Grotesk",sans-serif' }}>{m}</span>
                )}
                <div style={{ display:'flex', gap:'6px', flexShrink:0 }}>
                  {editingIdx===idx ? (
                    <>
                      <button style={{ ...D.iconBtn, background:ACCENT_GREEN, border:'2px solid #000', color:'#000' }} onClick={()=>confirmEdit(idx)}>✓</button>
                      <button style={{ ...D.iconBtn, background:T.bg, border:`2px solid ${T.textMuted}`, color:T.textMuted }} onClick={()=>setEditingIdx(null)}>✕</button>
                    </>
                  ) : (
                    <>
                      <button style={{ ...D.iconBtn, background:'transparent', border:`2px solid ${T.textMuted}`, color:T.textMuted, transition:'all 0.15s' }} onClick={()=>startEdit(idx)} title="編輯"
                        onMouseEnter={e=>{e.currentTarget.style.background=ACCENT_YELLOW;e.currentTarget.style.borderColor='#000';e.currentTarget.style.color='#000';e.currentTarget.style.transform='translate(-2px,-2px)';e.currentTarget.style.boxShadow='3px 3px 0 0 #000'}}
                        onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor=T.textMuted;e.currentTarget.style.color=T.textMuted;e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}
                        onMouseDown={e=>{e.currentTarget.style.transform='translate(2px,2px)';e.currentTarget.style.boxShadow='1px 1px 0 0 #000'}}
                        onMouseUp={e=>{e.currentTarget.style.transform='translate(-2px,-2px)';e.currentTarget.style.boxShadow='3px 3px 0 0 #000'}}>✏</button>
                      <button style={{ ...D.iconBtn, background:'transparent', border:`2px solid ${ACCENT_PINK}`, color:ACCENT_PINK, transition:'all 0.15s' }} onClick={()=>removeMember(idx)} title="移除"
                        onMouseEnter={e=>{e.currentTarget.style.background=ACCENT_PINK;e.currentTarget.style.color='#000';e.currentTarget.style.transform='translate(-2px,-2px)';e.currentTarget.style.boxShadow='3px 3px 0 0 #000'}}
                        onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=ACCENT_PINK;e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}
                        onMouseDown={e=>{e.currentTarget.style.transform='translate(2px,2px)';e.currentTarget.style.boxShadow='1px 1px 0 0 #000'}}
                        onMouseUp={e=>{e.currentTarget.style.transform='translate(-2px,-2px)';e.currentTarget.style.boxShadow='3px 3px 0 0 #000'}}>✕</button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ position:'relative', zIndex:1, display:'flex', justifyContent:'flex-end', marginTop:'20px' }}>
          <button style={{ ...D.closeBtn, background:ACCENT_YELLOW, color:'#000', border:`3px solid ${darkMode?'#a9a9a9':'#000'}`, fontWeight:900, boxShadow:`4px 4px 0 0 ${shadowColor}`, transition:'all 0.15s' }} onClick={handleDone} {...doneBtnHandlers}>DONE</button>
        </div>
      </div>
    </>
  )
}