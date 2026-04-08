import React, { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import BrutalistBackground from './BrutalistBackground.jsx'
import BrutalistSelect from './BrutalistSelect.jsx'
import { loadSavedBgConfig, genModalShapes, loadSavedModalConfig } from '../bgConfig.js'

// ─── 常數 ──────────────────────────────────────────────────────────────────────

const GRADE_MAP = [
  { min: 90, grade: 'S', color: '#00FF41', bg: '#003311' },
  { min: 75, grade: 'A', color: '#00FFFF', bg: '#003344' },
  { min: 60, grade: 'B', color: '#FFFF00', bg: '#333300' },
  { min: 40, grade: 'C', color: '#FF6600', bg: '#331500' },
  { min:  0, grade: 'D', color: '#FF3333', bg: '#330000' },
]

const ACCENT_COLORS = [
  '#2222f0','#FF00FF','#FF6600','#00AA44',
  '#FF3333','#9933FF','#0099CC','#CC6600',
]

// 亮色模式下較不刺眼的等級顏色
const LIGHT_GRADE_TONES = {
  S: '#00AA33',
  A: '#00A6A6',
  B: '#C7A500',
}

function renderMemberStyleShapes(shapes) {
  return (
    <>
      {shapes.stars.map((s, i) => (
        <div key={`cp-ms-s${i}`} style={{ position:'absolute', ...s.pos, color:s.color, opacity:0.18, pointerEvents:'none', zIndex:0, animation:s.anim }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"><path d="M12 2.5L14.7 8.8L21.5 9.5L16.3 14L17.8 20.7L12 17.2L6.2 20.7L7.7 14L2.5 9.5L9.3 8.8L12 2.5Z"/></svg>
        </div>
      ))}
      {shapes.crosses.map((s, i) => (
        <div key={`cp-ms-x${i}`} style={{ position:'absolute', ...s.pos, color:s.color, opacity:0.18, pointerEvents:'none', zIndex:0, animation:s.anim }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="square"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </div>
      ))}
      {shapes.circles.map((s, i) => (
        <div key={`cp-ms-c${i}`} style={{ position:'absolute', ...s.pos, color:s.color, opacity:0.18, pointerEvents:'none', zIndex:0, animation:s.anim }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/></svg>
        </div>
      ))}
      {shapes.tris.map((s, i) => (
        <div key={`cp-ms-t${i}`} style={{ position:'absolute', ...s.pos, color:s.color, opacity:0.2, pointerEvents:'none', zIndex:0, animation:s.anim }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter"><polygon points="12,2 22,20 2,20"/></svg>
        </div>
      ))}
    </>
  )
}

function pickProjectData(project) {
  const goals = Array.isArray(project.goals) ? project.goals : []

  const nestedStrategies = goals.flatMap(g => Array.isArray(g?.strategies) ? g.strategies : [])
  const nestedMeasures = nestedStrategies.flatMap(s => Array.isArray(s?.measures) ? s.measures : [])

  const strategies = Array.isArray(project.strategies) && project.strategies.length > 0
    ? project.strategies
    : nestedStrategies
  const measures = Array.isArray(project.measures) && project.measures.length > 0
    ? project.measures
    : nestedMeasures

  const todosFromMeasures = measures.flatMap(m => Array.isArray(m?.todos) ? m.todos : [])
  const todos = Array.isArray(project.todos) && project.todos.length > 0
    ? project.todos
    : todosFromMeasures

  return { goals, strategies, measures, todos }
}

// 取得 MD 分數：有文字且有實際值 = 2.5，只有文字 = 2，空白 = 0
function getMeasureScore(m) {
  const hasText = !!(m?.content?.trim() || m?.text?.trim() || m?.kpi?.trim())
  if (!hasText) return 0
  
  const hasActual = (m?.actual !== undefined && String(m.actual).trim() !== '') ||
                    (m?.current !== undefined && String(m.current).trim() !== '') ||
                    (m?.value !== undefined && String(m.value).trim() !== '')
                    
  return hasActual ? 2.5 : 2
}

// 通用逾期判斷：只要標示已完成，即便超過 deadline 也「不算逾期」
function checkIsOverdue(item, today) {
  if (!item || !item.deadline) return false
  if (item.deadline >= today) return false
  
  if (item.done) return false
  if (String(item.done) === 'true') return false
  if (item.status === 'done' || item.status === 'completed') return false
  if (item.progress === 100 || item.progress === '100') return false
  
  return true
}

// ─── 工具函式 ──────────────────────────────────────────────────────────────────

function calcHealthScore(project) {
  let score = 0
  const detail = {}
  const { goals, strategies, measures, todos } = pickProjectData(project)
  const today = new Date().toISOString().slice(0, 10)

  // 1. 完整度（滿分 40 分）
  
  // O (5 分)：有寫就給 5 分
  const hasObjective = !!(project.objective?.trim())
  const objScore = hasObjective ? 5 : 0

  // G (5 分)：至少 2 個。0個=0分，1個=2.5分(扣一半)，2個以上=5分
  const goalsCount = goals.filter(g => g?.content?.trim() || g?.text?.trim()).length
  const goalScore = Math.min(5, goalsCount * 2.5)

  // S (10 分)：至少 4 個。少一個扣2分，0個0分
  const stratCount = strategies.filter(s => s?.content?.trim() || s?.text?.trim()).length
  let stratScore = 0
  if (stratCount >= 4) stratScore = 10
  else if (stratCount === 3) stratScore = 8
  else if (stratCount === 2) stratScore = 6
  else if (stratCount === 1) stratScore = 4

  // MD (20 分)：無實際值 2 分，有實際值 2.5 分
  const mdScoreRaw = measures.reduce((acc, m) => acc + getMeasureScore(m), 0)
  const measureScore = Math.min(20, mdScoreRaw)
  const validMeasuresCount = measures.filter(m => getMeasureScore(m) > 0).length

  const completeness = objScore + goalScore + stratScore + measureScore
  score += completeness
  detail.completeness = Math.round(completeness)
  detail.goalCount = goalsCount
  detail.strategyCount = stratCount
  detail.measureCount = validMeasuresCount

  // 2. Todo 執行率（45 分）- 無 MP 0分；少於 16 個微幅扣分
  const todoDone = todos.filter(t => t.done).length
  let todoScore = 0
  let todoRate = 0
  if (todos.length > 0) {
    todoRate = todoDone / todos.length
    let baseScore = todoRate * 45
    // 未滿 16 個，每個缺口扣 1 分做為懲罰
    if (todos.length < 16) {
      baseScore -= (16 - todos.length) * 1
    }
    todoScore = Math.max(0, baseScore)
  }
  score += todoScore
  detail.todoRate = todos.length > 0 ? Math.round(todoRate * 100) : null
  detail.todoScore = Math.round(todoScore)
  detail.todoDone = todoDone
  detail.todoTotal = todos.length

  // 3. 逾期懲罰（最高 -30）- 每項扣 5 分
  const overdue  = todos.filter(t => checkIsOverdue(t, today)).length
  const overdueP = Math.min(30, overdue * 5)
  score -= overdueP
  detail.overdue = overdue
  detail.overduePenalty = overdueP

  // 4. 活躍度（滿分 15 分）
  const updatedAt = project.updatedAt || project.createdAt
  let actScore = 0
  if (updatedAt) {
    const daysSince = (Date.now() - new Date(updatedAt).getTime()) / 86400000
    if (daysSince <= 7)  actScore = 15
    else if (daysSince <= 14) actScore = 8
    else if (daysSince <= 30) actScore = 4
    else actScore = 0
  }
  score += actScore
  detail.actScore = actScore

  const finalScore = Math.max(0, Math.min(100, Math.round(score)))
  const gradeInfo  = GRADE_MAP.find(g => finalScore >= g.min) ?? GRADE_MAP[GRADE_MAP.length - 1]

  return { score: finalScore, grade: gradeInfo.grade, color: gradeInfo.color, bg: gradeInfo.bg, detail }
}

function formatRelative(isoString) {
  if (!isoString) return '—'
  const d = (Date.now() - new Date(isoString).getTime()) / 86400000
  if (d < 1) return '今天'
  if (d < 2) return '昨天'
  if (d < 7) return `${Math.floor(d)} 天前`
  if (d < 14) return `${Math.floor(d)} 天前`
  if (d < 30) return `${Math.floor(d / 7)} 週前`
  return `${Math.floor(d / 30)} 個月前`
}

// ─── 迷你環型進度 ──────────────────────────────────────────────────────────────

function RingProgress({ value, color, size = 48, stroke = 4 }) {
  const r   = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (value / 100) * circ

  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition:'stroke-dasharray 0.5s ease' }}
      />
    </svg>
  )
}

// ─── Mini Bar ─────────────────────────────────────────────────────────────────

function MiniBar({ label, value, max, color, dark }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ marginBottom:4 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
        <span style={{ fontFamily:'"DM Mono",monospace', fontSize:'9px', color: dark ? '#cfcfcf' : '#666', letterSpacing:'0.05em' }}>{label}</span>
        <span style={{ fontFamily:'"DM Mono",monospace', fontSize:'9px', color: dark ? '#cfcfcf' : '#666' }}>{value}/{max}</span>
      </div>
      <div style={{ height:3, background: dark ? '#222' : '#e8e8e8', borderRadius:99, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:99, transition:'width 0.4s ease' }} />
      </div>
    </div>
  )
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, index, dark, onSelect }) {
  const health = useMemo(() => calcHealthScore(project), [project])
  const [hovered, setHovered] = useState(false)
  const accentColor = ACCENT_COLORS[index % ACCENT_COLORS.length]

  const displayColor = dark ? health.color : (LIGHT_GRADE_TONES[health.grade] ?? health.color)

  const { goals, strategies: strats, measures, todos } = pickProjectData(project)
  const today    = new Date().toISOString().slice(0, 10)
  
  const overdueMD = measures.filter(m => checkIsOverdue(m, today))
  const overdueMP = todos.filter(t => checkIsOverdue(t, today))

  return (
    <div
      onClick={() => onSelect(project)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: dark ? 'rgba(94, 92, 92, 0.3)' : 'rgba(179, 175, 175, 0.15)',
        backdropFilter: 'blur(1px)',
        WebkitBackdropFilter: 'blur(1px)',
        border: `2px solid ${hovered ? accentColor : (dark ? '#2a2a2a' : '#e0e0e0')}`,
        boxShadow: hovered ? `6px 6px 0 0 ${accentColor}` : `3px 3px 0 0 ${dark ? '#2a2a2a' : '#ccc'}`,
        padding:'16px 16px 14px',
        cursor:'pointer',
        transition:'all 0.15s',
        transform: hovered ? 'translate(-2px,-2px)' : 'none',
        display:'flex', flexDirection:'column', gap:'10px',
      }}
    >
      {/* Top row: name + grade */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'8px' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{
            fontFamily:'"Space Grotesk",sans-serif', fontWeight:900,
            fontSize:'15px', color: dark ? '#fff' : '#000',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          }}>
            {project.isLocked && '🔒 '}{project.name}
          </div>
          <div style={{
            fontFamily:'"DM Mono",monospace', fontSize:'10px',
            color: dark ? '#cfcfcf' : '#666', marginTop:2,
          }}>
            更新於 {formatRelative(project.updatedAt || project.createdAt)}
            {project.members?.length > 0 ? ` · ${project.members.length} 人` : ''}
          </div>
        </div>

        {/* Grade badge */}
        <div style={{
          display:'flex', flexDirection:'column', alignItems:'center', gap:2, flexShrink:0,
        }}>
            <div style={{ position:'relative', width:48, height:48 }}>
            <RingProgress value={health.score} color={displayColor} size={48} stroke={4} />
            <div style={{
              position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'15px',
                color: displayColor,
            }}>
              {health.grade}
            </div>
          </div>
          <span style={{ fontFamily:'"DM Mono",monospace', fontSize:'9px', color: dark ? '#cfcfcf' : '#666' }}>
            {health.score}/100
          </span>
        </div>
      </div>

      {/* Objective preview */}
      {project.objective && (
        <div style={{
          fontFamily:'"Noto Sans TC",sans-serif', fontSize:'11px',
          color: dark ? '#cfcfcf' : '#666', lineHeight:1.5,
          borderLeft:`2px solid ${accentColor}`, paddingLeft:'8px',
          overflow:'hidden', display:'-webkit-box',
          WebkitLineClamp:2, WebkitBoxOrient:'vertical',
        }}>
          {project.objective}
        </div>
      )}

      {/* OGSM completeness bars */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 12px' }}>
        <MiniBar label="GOALS"     value={goals.filter(g=>g?.content?.trim()||g?.text?.trim()).length}    max={Math.max(1,goals.length)}    color={accentColor} dark={dark} />
        <MiniBar label="STRATEGIES" value={strats.filter(s=>s?.content?.trim()||s?.text?.trim()).length}  max={Math.max(1,strats.length)}   color={accentColor} dark={dark} />
        {/* MD 進度條連動有效值檢測 */}
        <MiniBar label="MD(含實績)" value={measures.filter(m=>getMeasureScore(m)>0).length} max={Math.max(1,measures.length)} color={accentColor} dark={dark} />
        <MiniBar label="MP"        value={todos.filter(t=>t.done).length} max={Math.max(1,todos.length)}    color={accentColor}     dark={dark} />
      </div>

      {/* Overdue warnings 分別顯示 MD / MP */}
      <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
        {overdueMD.length > 0 && (
          <div style={{
            display:'flex', alignItems:'center', gap:'5px',
            background:'rgba(255,51,51,0.1)', border:'1px solid rgba(255,51,51,0.3)',
            padding:'3px 8px',
            fontFamily:'"DM Mono",monospace', fontSize:'10px', color:'#FF3333',
          }}>
            ⚠ {overdueMD.length} 項 MD 逾期
          </div>
        )}
        {overdueMP.length > 0 && (
          <div style={{
            display:'flex', alignItems:'center', gap:'5px',
            background:'rgba(255,51,51,0.1)', border:'1px solid rgba(255,51,51,0.3)',
            padding:'3px 8px',
            fontFamily:'"DM Mono",monospace', fontSize:'10px', color:'#FF3333',
          }}>
            ⚠ {overdueMP.length} 項 MP 逾期
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 主組件 ────────────────────────────────────────────────────────────────────

export default function CrossProjectDashboard({ projects = [], dark = false, onSelectProject, onClose }) {
  const [sortBy, setSort]   = useState('health')  // 'health' | 'name' | 'updated'
  const [gradeFilter, setGradeFilter] = useState(null)
  const [search, setSearch] = useState('')
  const [detailProject, setDetailProject] = useState(null)
  const [showHeaderHelp, setShowHeaderHelp] = useState(false)
  const [bgConfig, setBgConfig] = useState(() => loadSavedBgConfig())

  useEffect(() => {
    const handleBgChange = () => setBgConfig(loadSavedBgConfig())
    window.addEventListener('brutalistBgChanged', handleBgChange)
    return () => window.removeEventListener('brutalistBgChanged', handleBgChange)
  }, [])

  // Escape 關閉
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const enriched = useMemo(() =>
    projects.filter(p => !p.isLocked).map(p => ({ ...p, _health: calcHealthScore(p) })),
    [projects]
  )

  const filtered = useMemo(() => {
    let list = enriched
    if (search.trim()) list = list.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
    if (gradeFilter) list = list.filter(p => p._health.grade === gradeFilter)
    if (sortBy === 'health')   list = [...list].sort((a,b) => b._health.score - a._health.score)
    if (sortBy === 'name')     list = [...list].sort((a,b) => (a.name||'').localeCompare(b.name||''))
    if (sortBy === 'updated')  list = [...list].sort((a,b) => new Date(b.updatedAt||0) - new Date(a.updatedAt||0))
    return list
  }, [enriched, search, gradeFilter, sortBy])

  // Summary stats
  const stats = useMemo(() => {
    const scores = enriched.map(p => p._health.score)
    const avg    = scores.length ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : 0
    const totalTodos  = enriched.reduce((s,p) => s + (p.todos?.length ?? 0), 0)
    const doneTodos   = enriched.reduce((s,p) => s + (p.todos?.filter(t=>t.done).length ?? 0), 0)
    const today = new Date().toISOString().slice(0,10)
    
    // 計算全局逾期數 (包含 MD 與 MP)
    const overdueAll  = enriched.reduce((s,p) => {
      const { measures, todos } = pickProjectData(p)
      const mdO = measures.filter(m => checkIsOverdue(m, today)).length
      const mpO = todos.filter(t => checkIsOverdue(t, today)).length
      return s + mdO + mpO
    }, 0)
    
    return { avg, totalTodos, doneTodos, overdueAll }
  }, [enriched])

  const bg   = 'transparent'
  const text = dark ? '#e0e0e0' : '#000'
  const sub  = dark ? '#cfcfcf' : '#666'

  const modalBorder = dark ? '#222' : '#000'
  const modalShadow = dark ? '#555' : '#999'
  const bdr  = dark ? '#222' : '#e0e0e0'
  const panelBg = dark ? 'rgba(17,17,17,0.6)' : 'rgba(248,248,248,0.8)'

  return createPortal(
    <>
      <style>{`
        @keyframes cpFadeIn{from{opacity:0;transform:translate(-50%,-50%) translateY(10px)}to{opacity:1;transform:translate(-50%,-50%) translateY(0)}}
        .cp-grid::-webkit-scrollbar{width:5px} .cp-grid::-webkit-scrollbar-track{background:${dark?'#111':'#f0f0f0'}} .cp-grid::-webkit-scrollbar-thumb{background:${dark?'#333':'#ccc'}}
        .cp-search:focus{border-color:#2222f0 !important; outline:none}
        .cp-btn{transition:background-color .15s ease,color .15s ease,border-color .15s ease,filter .15s ease}
        .cp-btn:hover{filter:brightness(1.16)}
      `}</style>

      <div
        onClick={onClose}
        style={{
          position:'fixed', inset:0, zIndex:99990,
          background: dark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.45)',
          backdropFilter:'blur(2px)',
          WebkitBackdropFilter:'blur(2px)',
          transition:'background 0.3s ease',
        }}
      />

      <div style={{
        position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
        zIndex:99991,
        width:'min(1100px,96vw)',height:'min(720px,92vh)',
        background:bg,
        backgroundImage:'none',
        border:`3px solid ${modalBorder}`,
        boxShadow:`10px 10px 0 0 ${modalShadow}`,
        display:'flex',flexDirection:'column',
        animation:'cpFadeIn 0.2s ease', overflow:'hidden',
      }}>
        <BrutalistBackground dark={dark} bgConfig={bgConfig} />

        {/* ── Header ── */}
        <div style={{
          padding:'12px 20px', borderBottom:`2px solid ${dark?'#222':'#000'}`,
          background:'transparent',
          display:'flex',alignItems:'center',justifyContent:'space-between', flexShrink:0,
          position:'relative', zIndex:5,
        }}>
          <div>
            <div style={{ fontFamily:'"DM Mono",monospace',fontSize:'10px',color:'#FF00FF',fontWeight:900,letterSpacing:'0.1em' }}>
              [ CROSS-PROJECT DASHBOARD ]
            </div>
            <div style={{ fontFamily:'"Space Grotesk",sans-serif',fontWeight:900,fontSize:'18px',color:text }}>
              所有專案總覽
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', position:'relative' }}>
            <div
              onMouseEnter={e => {
                setShowHeaderHelp(true)
                e.currentTarget.style.color = '#FF00FF'
                e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'
                e.currentTarget.style.borderRadius = '4px'
              }}
              onMouseLeave={e => {
                setShowHeaderHelp(false)
                e.currentTarget.style.color = text
                e.currentTarget.style.background = 'none'
              }}
              style={{
                width:'16px', height:'16px',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'14px', fontWeight:900, lineHeight:1,
                color:text, cursor:'help', userSelect:'none',
                background:'none', border:'none',
              }}
            >
              ?
              {showHeaderHelp && (
                <div style={{
                  position:'absolute', right:'28px', top:'34px', width:'340px', maxWidth:'48vw',
                  background: dark ? '#2e2e2e' : '#f0f0f0',
                  backgroundImage: dark
                    ? 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)'
                    : 'linear-gradient(rgba(0,0,0,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.09) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  border: `1px solid ${dark ? 'rgba(120,140,255,0.5)' : 'rgba(0,0,0,0.2)'}`,
                  boxShadow: dark ? '3px 3px 0 rgba(120,140,255,0.25)' : '3px 3px 0 rgba(0,0,0,0.12)',
                  padding:'14px 16px', zIndex:30,
                  fontFamily:'"Noto Sans TC",sans-serif', fontSize:'12px',
                  color:text, lineHeight:1.5, textAlign:'left', borderRadius:8,
                }}>
                  {/* Title */}
                  <div style={{ fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'13px', marginBottom:'4px', letterSpacing:'0.01em' }}>健康分是什麼？</div>
                  <div style={{ fontSize:'11px', color: dark ? '#bfbfbf' : '#555', marginBottom:'10px' }}>0–100 分，衡量完整度、執行力、時效與活躍度。</div>

                  {/* 評分機制 */}
                  <div style={{ fontFamily:'"DM Mono",monospace', fontWeight:700, fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color: dark ? '#aaa' : '#888', marginBottom:'5px', paddingBottom:'3px', borderBottom:`1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'}` }}>評分機制</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'10px' }}>
                    {[
                      { label:'完整度', score:'+40', desc:'O 有填即可 ; G 至少2個 ; S 至少4項 ; MD 至少8項，有無實際值填寫再評分' },
                      { label:'執行率', score:'+45', desc:'MP完成比例(至少16項 ; 無MP為0)' },
                      { label:'逾期扣分', score:'−30', desc:'每項逾期扣 5 分，最高扣 30 分' },
                      { label:'活躍度', score:'+15', desc:'近7天+15 / 近14天+8 / 近30天+4 / 其餘+0' },
                    ].map(r => (
                      <div key={r.label} style={{ display:'flex', alignItems:'flex-start', gap:'6px' }}>
                        <span style={{ fontFamily:'"DM Mono",monospace', fontWeight:700, fontSize:'10px', minWidth:'52px', flexShrink:0, color: dark ? '#e0e0e0' : '#222' }}>{r.label}</span>
                        <span style={{ fontFamily:'"DM Mono",monospace', fontWeight:900, fontSize:'10px', minWidth:'28px', flexShrink:0, color:'#FF00FF', textAlign:'right' }}>{r.score}</span>
                        <span style={{ fontSize:'10px', color: dark ? '#bfbfbf' : '#555', lineHeight:1.3 }}>{r.desc}</span>
                      </div>
                    ))}
                  </div>

                  {/* 評級級距 */}
                  <div style={{ fontFamily:'"DM Mono",monospace', fontWeight:700, fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color: dark ? '#aaa' : '#888', marginBottom:'6px', paddingBottom:'3px', borderBottom:`1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'}` }}>評級級距</div>
                  <div style={{ display:'flex', gap:'8px', flexWrap:'nowrap', overflowX:'auto', alignItems:'center', paddingBottom:'4px' }}>
                    {GRADE_MAP.map(({ min, grade, color }) => {
                      const gc = dark ? color : (LIGHT_GRADE_TONES[grade] ?? color)
                        return (
                        <div key={grade} style={{
                          width: '64px',
                          height: '56px',
                          display:'flex',
                          flexDirection:'column',
                          alignItems:'center',
                          justifyContent:'center',
                          gap:'4px',
                          padding:'6px',
                          boxSizing:'border-box',
                          background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                          border:`1px solid ${gc}55`,
                          borderRadius:6,
                        }}>
                          <span style={{ fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'14px', color:gc, lineHeight:1 }}>{grade}</span>
                          <span style={{ fontFamily:'"DM Mono",monospace', fontSize:'10px', color: dark ? '#aaa' : '#666' }}>{min}+</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              className="cp-btn"
              onClick={onClose}
              style={{ background:'none',border:'none',fontSize:'22px',cursor:'pointer',color:text,fontWeight:900,lineHeight:1 }}
              onMouseEnter={e=>e.currentTarget.style.color='#FF3333'}
              onMouseLeave={e=>e.currentTarget.style.color=text}
            >
              ×
            </button>
          </div>
        </div>

        {/* ── Summary stats ── */}
        <div style={{
          padding:'12px 20px', borderBottom:`1px solid ${bdr}`,
          display:'flex',gap:'24px',flexWrap:'wrap',
          background:'transparent', flexShrink:0,
          backdropFilter:'blur(5px)', WebkitBackdropFilter:'blur(5px)',
          position:'relative', zIndex:1,
        }}>
          {[
            { label:'平均健康分', val:stats.avg, color:'#FF00FF', suffix:'/100' },
            { label:'專案總數',   val:enriched.length, color:'#2222f0' },
            { label:'任務完成',   val:stats.doneTodos, color:'#00AA44', suffix:`/${stats.totalTodos}` },
            { label:'逾期任務',   val:stats.overdueAll, color:stats.overdueAll>0?'#FF3333':'#00AA44' },
          ].map(s => (
            <div key={s.label} style={{ display:'flex',alignItems:'baseline',gap:'4px' }}>
              <span style={{ fontFamily:'"Space Grotesk",sans-serif',fontWeight:900,fontSize:'28px',color:s.color }}>
                {s.val}
              </span>
              {s.suffix && <span style={{ fontFamily:'"DM Mono",monospace',fontSize:'12px',color:sub }}>{s.suffix}</span>}
              <span style={{ fontFamily:'"DM Mono",monospace',fontSize:'10px',color:sub,marginLeft:'2px' }}>{s.label}</span>
            </div>
          ))}

          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', justifyContent:'flex-end' }}>
            {['S', 'A', 'B', 'C', 'D'].map(g => {
              const active = gradeFilter === g
              const baseColor = GRADE_MAP.find(m => m.grade === g).color
              const gradeColor = dark ? baseColor : (LIGHT_GRADE_TONES[g] ?? baseColor)
              return (
                <button
                  className="cp-btn"
                  key={g}
                  onClick={() => setGradeFilter(prev => prev === g ? null : g)}
                  onMouseEnter={e => {
                    e.currentTarget.style.border = `3px solid ${gradeColor}`
                    e.currentTarget.style.background = active ? `${gradeColor}66` : `${gradeColor}44`
                    e.currentTarget.style.color = active ? '#ffffff' : gradeColor
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.border = `2px solid ${active ? gradeColor : (dark ? '#444' : '#bbb')}`
                    e.currentTarget.style.background = active ? `${gradeColor}33` : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
                    e.currentTarget.style.color = active ? gradeColor : (dark ? '#ddd' : '#444')
                  }}
                  style={{
                    fontFamily:'"DM Mono",monospace',
                    fontSize:'10px',
                    fontWeight:900,
                    padding:'3px 7px',
                    border:`2px solid ${active ? gradeColor : (dark ? '#444' : '#bbb')}`,
                    background: active ? `${gradeColor}33` : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                    color: active ? gradeColor : (dark ? '#ddd' : '#444'),
                    cursor:'pointer',
                    lineHeight:1.2,
                  }}
                  title={`篩選 ${g} 級`}
                >
                  {g}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div style={{
          padding:'8px 20px', borderBottom:`1px solid ${bdr}`,
          display:'flex', gap:'8px', alignItems:'center', flexShrink:0,
          background:panelBg,
          backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)',
          position:'relative', zIndex:1,
        }}>
          <div style={{ position:'relative', flex:1, display:'flex' }}>
            <input
              className="cp-search"
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜尋專案名稱…"
              style={{
                flex:1, padding:'6px 30px 6px 10px', fontSize:'12px',
                background:dark?'#1a1a1a':'#fff',
                border:`2px solid ${dark?'#333':'#ccc'}`,
                color:text, fontFamily:'"Noto Sans TC",sans-serif',
              }}
            />
            {search && (
              <button
                className="cp-btn"
                onClick={() => setSearch('')}
                title="清除搜尋"
                style={{
                  position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer',
                  color:sub, fontSize:'14px', fontWeight:900, lineHeight:1,
                  padding:'2px 4px',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#FF3333' }}
                onMouseLeave={e => { e.currentTarget.style.color = sub }}
              >
                ✕
              </button>
            )}
          </div>
          <BrutalistSelect
            value={sortBy}
            onChange={setSort}
            darkMode={dark}
            options={[
              { value:'health', label:'按健康分排序' },
              { value:'name', label:'按名稱排序' },
              { value:'updated', label:'按更新時間' },
            ]}
            style={{
              width:'150px',
              fontFamily:'"DM Mono",monospace',
              fontSize:'11px',
              fontWeight:700,
              minHeight:'30px',
            }}
          />
          <span style={{ fontFamily:'"DM Mono",monospace',fontSize:'10px',color:sub,flexShrink:0 }}>
            {filtered.length}/{enriched.length} 個專案
          </span>
        </div>

        {/* ── Grid ── */}
        <div style={{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:'1fr', gap:'10px', padding:'10px 14px 14px', position:'relative', zIndex:1 }}>
          <div className="cp-grid" style={{ minHeight:0, overflowY:'auto', overflowX:'hidden', padding:'6px', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'12px', alignContent:'start', background:'transparent', border:`1px solid ${dark ? '#2e2e2e' : '#dddddd'}` }}>
            {filtered.length === 0 ? (
              <div style={{
                gridColumn:'1/-1', textAlign:'center', padding:'100px',
                fontFamily:'"DM Mono",monospace',fontSize:'20px',color:sub,
                background: 'transparent',
              }}>
                {search ? `找不到「${search}」` : '沒有符合條件的專案'}
              </div>
            ) : (
              filtered.map((p, i) => (
                <ProjectCard
                  key={p.id ?? i}
                  project={p}
                  index={i}
                  dark={dark}
                  onSelect={() => setDetailProject(p)}
                />
              ))
            )}
          </div>
        </div>

        {detailProject && (
          <ProjectDetailModal
            project={detailProject}
            dark={dark}
            onClose={() => setDetailProject(null)}
            onOpenProject={(p) => {
              setDetailProject(null)
              onSelectProject?.(p)
            }}
          />
        )}
      </div>
    </>,
    document.body
  )
}

function ProjectDetailModal({ project, dark, onClose, onOpenProject }) {
  const health = useMemo(() => calcHealthScore(project), [project])
  const data = useMemo(() => pickProjectData(project), [project])
  const [showHelp, setShowHelp] = useState(false)
  const [modalCfg, setModalCfg] = useState(() => loadSavedModalConfig('member'))
  
  const overdueItems = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const items = []

    const goals = Array.isArray(project.goals) ? project.goals : []
    if (goals.length > 0) {
      goals.forEach((g, gIdx) => {
        const strats = Array.isArray(g.strategies) ? g.strategies : []
        strats.forEach((s, sIdx) => {
          const measures = Array.isArray(s.measures) ? s.measures : []
          measures.forEach((m, mIdx) => {
            if (checkIsOverdue(m, today)) {
              items.push({ type: 'MD', idStr: `D${gIdx + 1}.${sIdx + 1}.${mIdx + 1}`, ...m })
            }
            const todos = Array.isArray(m.todos) ? m.todos : []
            todos.forEach((t, tIdx) => {
              if (checkIsOverdue(t, today)) {
                items.push({ type: 'MP', idStr: `P${gIdx + 1}.${sIdx + 1}.${mIdx + 1}.${tIdx + 1}`, ...t })
              }
            })
          })
        })
      })
    } else {
      const measures = Array.isArray(project.measures) ? project.measures : []
      measures.forEach((m, mIdx) => {
        if (checkIsOverdue(m, today)) {
          items.push({ type: 'MD', idStr: `D${mIdx + 1}`, ...m })
        }
      })
      const todos = Array.isArray(project.todos) ? project.todos : []
      todos.forEach((t, tIdx) => {
        if (checkIsOverdue(t, today)) {
          items.push({ type: 'MP', idStr: `P${tIdx + 1}`, ...t })
        }
      })
    }
    return items
  }, [project])

  const overdueMDs = useMemo(() => overdueItems.filter(i => i.type === 'MD'), [overdueItems])
  const overdueMPs = useMemo(() => overdueItems.filter(i => i.type === 'MP'), [overdueItems])

  const modalShapes = useMemo(() => genModalShapes('member', modalCfg, modalCfg.seed), [modalCfg])

  useEffect(() => {
    const handleModalCfgChange = () => setModalCfg(loadSavedModalConfig('member'))
    window.addEventListener('brutalistBgChanged', handleModalCfgChange)
    return () => window.removeEventListener('brutalistBgChanged', handleModalCfgChange)
  }, [])

  const text = dark ? '#e0e0e0' : '#000'
  const sub  = dark ? '#cfcfcf' : '#666'
  const detailDisplayColor = dark ? health.color : (LIGHT_GRADE_TONES[health.grade] ?? health.color)

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, width:'100vw', height:'100vh', zIndex:99995,
        background: dark ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
        backdropFilter:'grayscale(100%) blur(2px)',
        WebkitBackdropFilter:'grayscale(100%) blur(2px)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:'20px',
      }}
    >
      <style>{`
        @keyframes ms-starFloat   { 0%{transform:translate(0,0) rotate(0deg) scale(1)} 25%{transform:translate(20px,-30px) rotate(90deg) scale(1.25)} 50%{transform:translate(-10px,20px) rotate(180deg) scale(0.85)} 75%{transform:translate(30px,10px) rotate(270deg) scale(1.15)} 100%{transform:translate(0,0) rotate(360deg) scale(1)} }
        @keyframes ms-crossFloat  { 0%{transform:translate(0,0) rotate(0deg) scale(1)} 33%{transform:translate(-25px,20px) rotate(120deg) scale(1.2)} 66%{transform:translate(15px,-15px) rotate(240deg) scale(0.8)} 100%{transform:translate(0,0) rotate(360deg) scale(1)} }
        @keyframes ms-circleFloat { 0%{transform:translate(0,0) scale(0.88)} 33%{transform:translate(20px,-25px) scale(2)} 66%{transform:translate(-15px,15px) scale(1.5)} 100%{transform:translate(0,0) scale(0.88)} }
        @keyframes ms-triFloat    { 0%{transform:translate(0,0) rotate(0deg) scale(1)} 50%{transform:translate(-20px,-30px) rotate(180deg) scale(1.2)} 100%{transform:translate(0,0) rotate(360deg) scale(1)} }
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:'min(680px, 86vw)', maxHeight:'86vh', overflowY:'auto', overflowX:'hidden',
          position:'relative',
          backgroundColor: dark ? '#222222' : '#FFFFFF',
          backgroundImage: dark
            ? 'linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)'
            : 'linear-gradient(rgba(0,0,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.05) 1px,transparent 1px)',
          backgroundSize:'20px 20px',
          backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
          border:`3px solid ${dark ? '#DDDDDD' : '#111111'}`,
          boxShadow:`8px 8px 0px ${dark ? '#3B5BDB' : '#4A6CF7'}`,
          padding:'16px 18px',
        }}
      >
        {renderMemberStyleShapes(modalShapes)}

        <div style={{ position:'relative', zIndex:1 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px', gap:'8px' }}>
          <div style={{ fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'20px', color:text, flex:1, minWidth:0, wordBreak:'break-word', overflowWrap:'anywhere' }}>{project.name}</div>
          <button
            className="cp-btn"
            onClick={onClose}
            onMouseEnter={e => { e.currentTarget.style.color = '#FF3333' }}
            onMouseLeave={e => { e.currentTarget.style.color = text; e.currentTarget.style.transform = 'none' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'none' }}
            style={{ background:'none', border:'none', color:text, fontSize:'22px', cursor:'pointer', lineHeight:1, transition:'color .15s ease, transform .1s ease' }}
          >
            ×
          </button>
        </div>

        <div style={{ position:'relative', zIndex:2, border:`1px solid ${dark ? '#3a3a3a' : '#ddd'}`, background: dark ? 'rgba(25,25,25,0.46)' : 'rgba(255,255,255,0.46)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', padding:'12px 12px 10px 12px', marginBottom:'12px' }}>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px', marginBottom:'6px' }}>
            <span style={{ fontFamily:'"DM Mono",monospace', fontSize:'10px', color:sub }}>HEALTH SCORE</span>
            <div
              onMouseEnter={e => {
                setShowHelp(true)
                e.currentTarget.style.background = dark ? 'rgba(120,140,255,0.06)' : 'rgba(0,0,0,0.04)'
                e.currentTarget.style.borderColor = dark ? 'rgba(120,140,255,0.8)' : 'rgba(0,0,0,0.3)'
                e.currentTarget.style.color = dark ? '#fff' : '#000'
              }}
              onMouseLeave={e => {
                setShowHelp(false)
                e.currentTarget.style.background = ''
                e.currentTarget.style.borderColor = dark ? '#777' : '#555'
                e.currentTarget.style.color = sub
              }}
              style={{ width:20, height:20, borderRadius:'50%', border:`1px solid ${dark ? '#777' : '#555'}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'"DM Mono",monospace', fontSize:'11px', color:sub, cursor:'help', position:'relative', zIndex:30, flexShrink:0 }}
            >
              ?
              {showHelp && (
                <div
                  onMouseEnter={e => {
                    e.currentTarget.style.border = `1px solid ${dark ? 'rgba(120,140,255,0.8)' : 'rgba(0,0,0,0.28)'}`
                    e.currentTarget.style.boxShadow = dark ? '4px 4px 0 rgba(120,140,255,0.32)' : '4px 4px 0 rgba(0,0,0,0.16)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.border = `1px solid ${dark ? 'rgba(120,140,255,0.5)' : 'rgba(0,0,0,0.2)'}`
                    e.currentTarget.style.boxShadow = dark ? '3px 3px 0 rgba(120,140,255,0.25)' : '3px 3px 0 rgba(0,0,0,0.12)'
                    setShowHelp(false)
                  }}
                  style={{ position:'absolute', right:0, top:'24px', width:'340px', background: dark ? '#2e2e2e' : '#f0f0f0', backgroundImage: dark ? 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)' : 'linear-gradient(rgba(0,0,0,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.09) 1px, transparent 1px)', backgroundSize:'20px 20px', border: `1px solid ${dark ? 'rgba(120,140,255,0.5)' : 'rgba(0,0,0,0.2)'}`, boxShadow: dark ? '3px 3px 0 rgba(120,140,255,0.25)' : '3px 3px 0 rgba(0,0,0,0.12)', padding:'10px 12px', zIndex:100, fontFamily:'"Noto Sans TC",sans-serif', fontSize:'11px', color:text, lineHeight:1.5, textAlign:'left', borderRadius:6 }}>
                  <div style={{ fontFamily:'"DM Mono",monospace', fontWeight:700, fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color: dark ? '#aaa' : '#888', marginBottom:'6px', paddingBottom:'3px', borderBottom:`1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'}` }}>本專案得分明細</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                    {[
                      { label:'完整度',  val:`${health.detail.completeness}`, max:'/40', desc:'O 有填即可 (5分) ; G 至少2個 (5分) ; S 至少4項 (10分) ; MD 至少8項 (20分)，有無實際值填寫再評分' },
                      { label:'執行率',  val:`${health.detail.todoScore}`,  max:'/45', desc:'MP完成比例(至少16項 ; 無MP為0)' },
                      { label:'逾期扣分', val:`-${health.detail.overduePenalty}`, max:'/30', desc:'每項逾期扣 5 分，最高扣 30 分' },
                      { label:'活躍度',  val:`${health.detail.actScore}`,   max:'/15', desc:'近7天+15 / 近14天+8 / 近30天+4 / 其餘+0' },
                    ].map(r => (
                      
                      <div key={r.label} style={{ display:'flex', alignItems:'flex-start', gap:'5px' }}>
                        <span style={{ fontFamily:'"DM Mono",monospace', fontSize:'10px', fontWeight:700, minWidth:'52px', flexShrink:0, color: dark ? '#ddd' : '#222' }}>{r.label}</span>
                        <span style={{ fontFamily:'"DM Mono",monospace', fontSize:'11px', fontWeight:900, color:'#FF00FF', minWidth:'22px', textAlign:'right', flexShrink:0 }}>{r.val}</span>
                        <span style={{ fontFamily:'"DM Mono",monospace', fontSize:'9px', color: dark ? '#888' : '#777', flexShrink:0 }}>{r.max}</span>
                        <span style={{ fontSize:'10px', color: dark ? '#bbb' : '#555', lineHeight:1.3 }}>{r.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:'10px' }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:'8px' }}>
              <span style={{ fontFamily:'"DM Mono",monospace', fontSize:'11px', color:sub }}>評級</span>
              <span style={{ fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'30px', color:detailDisplayColor }}>{health.grade}</span>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:'8px' }}>
              <span style={{ fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'30px', color:detailDisplayColor }}>{health.score}</span>
              <span style={{ fontFamily:'"DM Mono",monospace', fontSize:'11px', color:sub }}>/100</span>
            </div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'8px', marginBottom:'12px' }}>
          {[
            ['Goals', data.goals.length],
            ['Strategies', data.strategies.length],
            ['MD', data.measures.length],
            ['MP', data.todos.length],
          ].map(([k, v]) => (
            <div key={k} style={{ border:`1px solid ${dark ? '#333' : '#ddd'}`, background: dark ? 'rgba(20,20,20,0.3)' : 'rgba(255,255,255,0.3)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', padding:'6px 8px' }}>
              <div style={{ fontFamily:'"DM Mono",monospace', fontSize:'9px', color:sub }}>{k}</div>
              <div style={{ fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'18px', color:text }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ fontFamily:'"Noto Sans TC",sans-serif', fontSize:'12px', lineHeight:1.7, color: dark ? '#c7c7c7' : '#444', background: dark ? 'rgba(20,20,20,0.4)' : 'rgba(255,255,255,0.4)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', border:`1px solid ${dark ? '#333' : '#ddd'}`, padding:'10px', marginBottom:'14px', whiteSpace:'pre-wrap', wordBreak:'break-word', overflowWrap:'anywhere' }}>
          <div style={{ fontFamily:'"DM Mono",monospace', fontSize:'10px', fontWeight:700, color:sub, marginBottom:'4px' }}>OBJECTIVE</div>
          {project.objective?.trim() || '此專案尚未填寫 Objective。'}
        </div>

        {/* 顯示 OVERDUE MD (有逾期才顯示) */}
        {overdueMDs.length > 0 && (
          <div style={{ border:`1px solid ${dark ? '#5a2222' : '#f0b7b7'}`, background: dark ? 'rgba(80,18,18,0.35)' : 'rgba(255,70,70,0.08)', padding:'10px', marginBottom:'14px' }}>
            <div style={{ fontFamily:'"DM Mono",monospace', fontSize:'10px', fontWeight:700, color:'#FF3333', marginBottom:'8px' }}>
              OVERDUE MD ({overdueMDs.length})
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {overdueMDs.map((item, idx) => (
                <div key={`${item.idStr}-${idx}`} style={{ border:`1px solid ${dark ? '#6a2a2a' : '#f3c6c6'}`, padding:'6px 8px', fontFamily:'"Noto Sans TC",sans-serif', fontSize:'12px', lineHeight:1.6, color: dark ? '#ffd2d2' : '#9e1d1d', whiteSpace:'pre-wrap', wordBreak:'break-word', overflowWrap:'anywhere' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'"DM Mono",monospace', fontSize:'10px', marginBottom:'2px' }}>
                    <span style={{ fontWeight:'bold' }}>{item.idStr}</span>
                    <span>截止：{item.deadline}</span>
                  </div>
                  {item.text || item.content || item.title || item.kpi || '未命名 MD'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 顯示 OVERDUE MP (有逾期才顯示) */}
        {overdueMPs.length > 0 && (
          <div style={{ border:`1px solid ${dark ? '#5a2222' : '#f0b7b7'}`, background: dark ? 'rgba(80,18,18,0.35)' : 'rgba(255,70,70,0.08)', padding:'10px', marginBottom:'14px' }}>
            <div style={{ fontFamily:'"DM Mono",monospace', fontSize:'10px', fontWeight:700, color:'#FF3333', marginBottom:'8px' }}>
              OVERDUE MP ({overdueMPs.length})
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {overdueMPs.map((item, idx) => (
                <div key={`${item.idStr}-${idx}`} style={{ border:`1px solid ${dark ? '#6a2a2a' : '#f3c6c6'}`, padding:'6px 8px', fontFamily:'"Noto Sans TC",sans-serif', fontSize:'12px', lineHeight:1.6, color: dark ? '#ffd2d2' : '#9e1d1d', whiteSpace:'pre-wrap', wordBreak:'break-word', overflowWrap:'anywhere' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'"DM Mono",monospace', fontSize:'10px', marginBottom:'2px' }}>
                    <span style={{ fontWeight:'bold' }}>{item.idStr}</span>
                    <span>截止：{item.deadline}</span>
                  </div>
                  {item.text || item.content || item.title || '未命名 MP'}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          className="cp-btn"
          onClick={() => onOpenProject(project)}
          onMouseDown={e => {
            e.currentTarget.style.transform = 'translate(2px,2px)'
            e.currentTarget.style.boxShadow = '1px 1px 0 0 #000'
          }}
          onMouseUp={e => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = '3px 3px 0 0 #000'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = '3px 3px 0 0 #000'
          }}
          style={{ width:'100%', background:'#2222f0', color:'#fff', border:'2px solid #000', boxShadow:'3px 3px 0 0 #000', padding:'8px 10px', cursor:'pointer', fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.08em' }}
        >
          前往專案編輯
        </button>
        </div>
      </div>
    </div>,
    document.body
  )
}