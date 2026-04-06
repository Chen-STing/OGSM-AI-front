/**
 * CrossProjectDashboard.jsx
 *
 * 跨專案儀表板 — 一眼掌握所有 OGSM 專案健康度
 *
 * 使用方式：
 *   <CrossProjectDashboard
 *     projects={projects}          // Project[] — 你現有的專案陣列
 *     dark={darkMode}
 *     onSelectProject={(p) => ...}  // 點擊專案卡片跳入該專案
 *     onClose={() => ...}
 *   />
 *
 * Project 型別（與你現有資料結構一致即可，只需以下欄位）：
 *   {
 *     id: string
 *     name: string
 *     objective?: string
 *     goals?: any[]
 *     strategies?: any[]
 *     measures?: any[]
 *     todos?: TodoItem[]          // { done: boolean, deadline: string }[]
 *     updatedAt?: string          // ISO
 *     createdAt?: string
 *     isLocked?: boolean
 *     members?: string[]
 *   }
 */

import React, { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import BrutalistBackground from './BrutalistBackground.jsx'
import BrutalistSelect from './BrutalistSelect.jsx'
import { loadSavedBgConfig } from '../bgConfig.js'

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

// ─── 工具函式 ──────────────────────────────────────────────────────────────────

function calcHealthScore(project) {
  let score = 0
  const detail = {}
  const { goals, strategies, measures, todos } = pickProjectData(project)

  // 1. 完整度（40 分）
  const hasObjective  = !!(project.objective?.trim())
  const goalsCount    = goals.filter(g => g?.content?.trim() || g?.text?.trim()).length
  const stratCount    = strategies.filter(s => s?.content?.trim() || s?.text?.trim()).length
  const measureCount  = measures.filter(m => m?.content?.trim() || m?.text?.trim() || m?.kpi?.trim()).length

  const completeness = (
    (hasObjective ? 10 : 0) +
    Math.min(10, goalsCount * 2.5) +
    Math.min(10, stratCount * 2.5) +
    Math.min(10, measureCount * 2.5)
  )
  score += completeness
  detail.completeness = Math.round(completeness)
  detail.goalCount = goalsCount
  detail.strategyCount = stratCount
  detail.measureCount = measureCount

  // 2. Todo 執行率（30 分）
  const todoDone = todos.filter(t => t.done).length
  const todoRate = todos.length > 0 ? todoDone / todos.length : 0
  const todoScore = todos.length > 0 ? todoRate * 30 : 15 // 沒有 todo 給一半
  score += todoScore
  detail.todoRate = todos.length > 0 ? Math.round(todoRate * 100) : null
  detail.todoScore = Math.round(todoScore)
  detail.todoDone = todoDone
  detail.todoTotal = todos.length

  // 3. 逾期懲罰（-15）
  const today    = new Date().toISOString().slice(0, 10)
  const overdue  = todos.filter(t => !t.done && t.deadline && t.deadline < today).length
  const overdueP = Math.min(15, overdue * 3)
  score -= overdueP
  detail.overdue = overdue
  detail.overduePenalty = overdueP

  // 4. 活躍度（30 分：最近 7 天有更新 +30，30天內 +15，以上都沒 +5）
  const updatedAt = project.updatedAt || project.createdAt
  let actScore = 5
  if (updatedAt) {
    const daysSince = (Date.now() - new Date(updatedAt).getTime()) / 86400000
    if (daysSince <= 7)  actScore = 30
    else if (daysSince <= 30) actScore = 15
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
        <span style={{ fontFamily:'"DM Mono",monospace', fontSize:'9px', color: dark ? '#666' : '#aaa', letterSpacing:'0.05em' }}>{label}</span>
        <span style={{ fontFamily:'"DM Mono",monospace', fontSize:'9px', color: dark ? '#888' : '#888' }}>{value}/{max}</span>
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

  const { goals, strategies: strats, measures, todos } = pickProjectData(project)
  const today    = new Date().toISOString().slice(0, 10)
  const overdue  = todos.filter(t => !t.done && t.deadline && t.deadline < today)

  return (
    <div
      onClick={() => onSelect(project)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: dark ? 'rgba(22,22,22,0.62)' : 'rgba(255,255,255,0.62)',
        backdropFilter:'blur(6px)',
        WebkitBackdropFilter:'blur(6px)',
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
            color: dark ? '#555' : '#bbb', marginTop:2,
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
            <RingProgress value={health.score} color={health.color} size={48} stroke={4} />
            <div style={{
              position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'15px',
              color: health.color,
            }}>
              {health.grade}
            </div>
          </div>
          <span style={{ fontFamily:'"DM Mono",monospace', fontSize:'9px', color: dark ? '#555' : '#aaa' }}>
            {health.score}/100
          </span>
        </div>
      </div>

      {/* Objective preview */}
      {project.objective && (
        <div style={{
          fontFamily:'"Noto Sans TC",sans-serif', fontSize:'11px',
          color: dark ? '#888' : '#666', lineHeight:1.5,
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
        <MiniBar label="MD"        value={measures.filter(m=>m?.content?.trim()||m?.text?.trim()||m?.kpi?.trim()).length} max={Math.max(1,measures.length)} color={accentColor} dark={dark} />
        <MiniBar label="MP"        value={todos.filter(t=>t.done).length}                                  max={Math.max(1,todos.length)}    color="#00AA44"     dark={dark} />
      </div>

      {/* Overdue warning */}
      {overdue.length > 0 && (
        <div style={{
          display:'flex', alignItems:'center', gap:'5px',
          background:'rgba(255,51,51,0.1)', border:'1px solid rgba(255,51,51,0.3)',
          padding:'3px 8px',
          fontFamily:'"DM Mono",monospace', fontSize:'10px', color:'#FF3333',
        }}>
          ⚠ {overdue.length} 項任務逾期
        </div>
      )}
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
    const overdueAll  = enriched.reduce((s,p) => s + (p.todos?.filter(t=>!t.done&&t.deadline&&t.deadline<today).length ?? 0), 0)
    return { avg, totalTodos, doneTodos, overdueAll }
  }, [enriched])

  const bg   = 'transparent'
  const text = dark ? '#e0e0e0' : '#000'
  const sub  = dark ? '#555' : '#aaa'
  const bdr  = dark ? '#222' : '#e0e0e0'
  const accent = '#FF00FF'
  const accentShadow = dark ? '#3d1472' : '#7c3aed'
  const panelBg = dark ? 'rgba(17,17,17,0.6)' : 'rgba(248,248,248,0.8)'
  const sectionBg = dark ? 'rgba(25,25,25,0.48)' : 'rgba(255,255,255,0.48)'

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
        border:`3px solid ${accent}`,
        boxShadow:`10px 10px 0 0 ${accentShadow}`,
        display:'flex',flexDirection:'column',
        animation:'cpFadeIn 0.2s ease', overflow:'hidden',
      }}>
        <BrutalistBackground dark={dark} bgConfig={bgConfig} />

        {/* ── Header ── */}
        <div style={{
          padding:'12px 20px', borderBottom:`2px solid ${dark?'#222':'#000'}`,
          background:panelBg,
          backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
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
              onMouseEnter={() => setShowHeaderHelp(true)}
              onMouseLeave={() => setShowHeaderHelp(false)}
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
                  position:'absolute', right:'32px', top:'28px', width:'360px',
                  background: dark ? '#111' : '#fff',
                  border:`1px solid ${dark ? '#444' : '#ccc'}`,
                  boxShadow:'3px 3px 0 0 #000', padding:'10px 12px', zIndex:30,
                  fontFamily:'"Noto Sans TC",sans-serif', fontSize:'12px',
                  color:text, lineHeight:1.75, textAlign:'left',
                }}>
                  <div style={{ fontWeight:700, marginBottom:'4px' }}>健康分是什麼？</div>
                  <div>健康分（0-100）用來衡量專案完整度、執行力、時效與活躍度。</div>
                  <div style={{ marginTop:'6px', fontWeight:700 }}>評分機制</div>
                  <div>完整度：最多 40 分（Objective + Goals/Strategies/Measures）。</div>
                  <div>執行率：最多 30 分（MP 完成比例）。</div>
                  <div>逾期扣分：最多扣 15 分（每項逾期扣 3）。</div>
                  <div>活躍度：最多 30 分（近 7 天 +30、30 天內 +15、其餘 +5）。</div>
                  <div style={{ marginTop:'6px', fontWeight:700 }}>評級級距</div>
                  {GRADE_MAP.map(({ min, grade }) => (
                    <div key={grade}>{grade}：{min} 分以上</div>
                  ))}
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
          background:panelBg, flexShrink:0,
          backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)',
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
            <span style={{ fontFamily:'"DM Mono",monospace', fontSize:'10px', color:sub }}>
              僅顯示未上鎖專案
            </span>
            {['S', 'A', 'B', 'C', 'D'].map(g => {
              const active = gradeFilter === g
              return (
                <button
                  className="cp-btn"
                  key={g}
                  onClick={() => setGradeFilter(prev => prev === g ? null : g)}
                  style={{
                    fontFamily:'"DM Mono",monospace',
                    fontSize:'10px',
                    fontWeight:900,
                    padding:'3px 7px',
                    border:`2px solid ${active ? '#FF00FF' : (dark ? '#444' : '#bbb')}`,
                    background: active ? (dark ? 'rgba(255,0,255,0.2)' : 'rgba(255,0,255,0.12)') : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                    color: active ? '#FF00FF' : (dark ? '#ddd' : '#444'),
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
          <div className="cp-grid" style={{ minHeight:0, overflowY:'auto', overflowX:'hidden', padding:'6px', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'12px', alignContent:'start', background:sectionBg, backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', border:`1px solid ${dark ? '#2e2e2e' : '#dddddd'}` }}>
            {filtered.length === 0 ? (
              <div style={{
                gridColumn:'1/-1', textAlign:'center', padding:'40px',
                fontFamily:'"DM Mono",monospace',fontSize:'12px',color:sub,
                background: dark ? 'rgba(20,20,20,0.45)' : 'rgba(255,255,255,0.45)',
                backdropFilter:'blur(4px)',
                WebkitBackdropFilter:'blur(4px)',
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
  const overdueItems = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return (data.todos || []).filter(t => !t.done && t.deadline && t.deadline < today)
  }, [data.todos])

  const text = dark ? '#e0e0e0' : '#000'
  const sub  = dark ? '#8a8a8a' : '#666'

  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, zIndex:99995,
        background: dark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
        backdropFilter:'grayscale(100%) blur(4px)',
        WebkitBackdropFilter:'grayscale(100%) blur(4px)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:'20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:'min(900px, 96vw)', maxHeight:'86vh', overflowY:'auto', overflowX:'hidden',
          backgroundColor: dark ? '#222222' : '#FFFFFF',
          backgroundImage: dark
            ? 'linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)'
            : 'linear-gradient(rgba(0,0,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.05) 1px,transparent 1px)',
          backgroundSize:'20px 20px',
          backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
          border:`3px solid ${dark ? '#fff' : '#000'}`,
          boxShadow:`8px 8px 0 0 ${dark ? '#3d1472' : '#7c3aed'}`,
          padding:'16px 18px',
        }}
      >
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px', gap:'8px' }}>
          <div style={{ fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'20px', color:text, flex:1, minWidth:0, wordBreak:'break-word', overflowWrap:'anywhere' }}>{project.name}</div>
          <button className="cp-btn" onClick={onClose} style={{ background:'none', border:'none', color:text, fontSize:'22px', cursor:'pointer', lineHeight:1 }}>×</button>
        </div>

        <div style={{ border:`1px solid ${dark ? '#3a3a3a' : '#ddd'}`, background: dark ? 'rgba(25,25,25,0.46)' : 'rgba(255,255,255,0.46)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', padding:'10px', marginBottom:'12px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
            <div
              onMouseEnter={() => setShowHelp(true)}
              onMouseLeave={() => setShowHelp(false)}
              style={{ width:'18px', height:'18px', borderRadius:'50%', border:`1px solid ${dark ? '#777' : '#555'}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'"DM Mono",monospace', fontSize:'11px', color:sub, cursor:'help', position:'relative', flexShrink:0 }}
            >
              ?
              {showHelp && (
                <div style={{ position:'absolute', left:'-2px', top:'24px', width:'320px', background: dark ? '#111' : '#fff', border:`1px solid ${dark ? '#444' : '#ccc'}`, boxShadow:'3px 3px 0 0 #000', padding:'8px 10px', zIndex:2, fontFamily:'"Noto Sans TC",sans-serif', fontSize:'12px', color:text, lineHeight:1.7, textAlign:'left' }}>
                  <div>完整度：{health.detail.completeness}/40（Objective + G/S/M 完整程度）</div>
                  <div>執行率：{health.detail.todoScore}/30（Todo 完成比例）</div>
                  <div>逾期扣分：-{health.detail.overduePenalty}（逾期每項扣 3，最多 15）</div>
                  <div>活躍度：{health.detail.actScore}/30（近 7 天 +30，30 天內 +15）</div>
                </div>
              )}
            </div>
            <span style={{ fontFamily:'"DM Mono",monospace', fontSize:'10px', color:sub }}>HEALTH SCORE</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:'10px' }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:'8px' }}>
              <span style={{ fontFamily:'"DM Mono",monospace', fontSize:'11px', color:sub }}>評級</span>
              <span style={{ fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'30px', color:health.color }}>{health.grade}</span>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:'8px' }}>
              <span style={{ fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'30px', color:health.color }}>{health.score}</span>
              <span style={{ fontFamily:'"DM Mono",monospace', fontSize:'11px', color:sub }}>/100</span>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:'6px', marginTop:'10px' }}>
            {[
              `完整度 ${health.detail.completeness}/40`,
              `執行率 ${health.detail.todoScore}/30`,
              `逾期扣分 -${health.detail.overduePenalty}`,
              `活躍度 ${health.detail.actScore}/30`,
              `MD ${health.detail.measureCount} 項`,
              `MP ${health.detail.todoDone}/${health.detail.todoTotal}`,
            ].map((item) => (
              <div key={item} style={{ border:`1px solid ${dark ? '#333' : '#e1e1e1'}`, padding:'5px 7px', fontFamily:'"DM Mono",monospace', fontSize:'10px', color:sub }}>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'8px', marginBottom:'12px' }}>
          {[
            ['Goals', data.goals.length],
            ['Strategies', data.strategies.length],
            ['MD', data.measures.length],
            ['MP', data.todos.length],
          ].map(([k, v]) => (
            <div key={k} style={{ border:`1px solid ${dark ? '#333' : '#ddd'}`, background: dark ? 'rgba(20,20,20,0.44)' : 'rgba(255,255,255,0.44)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', padding:'6px 8px' }}>
              <div style={{ fontFamily:'"DM Mono",monospace', fontSize:'9px', color:sub }}>{k}</div>
              <div style={{ fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'18px', color:text }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ fontFamily:'"Noto Sans TC",sans-serif', fontSize:'12px', lineHeight:1.7, color: dark ? '#c7c7c7' : '#444', background: dark ? 'rgba(20,20,20,0.4)' : 'rgba(255,255,255,0.4)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', border:`1px solid ${dark ? '#333' : '#ddd'}`, padding:'10px', marginBottom:'14px', whiteSpace:'pre-wrap', wordBreak:'break-word', overflowWrap:'anywhere' }}>
          {project.objective?.trim() || '此專案尚未填寫 Objective。'}
        </div>

        {overdueItems.length > 0 && (
          <div style={{ border:`1px solid ${dark ? '#5a2222' : '#f0b7b7'}`, background: dark ? 'rgba(80,18,18,0.35)' : 'rgba(255,70,70,0.08)', padding:'10px', marginBottom:'14px' }}>
            <div style={{ fontFamily:'"DM Mono",monospace', fontSize:'10px', fontWeight:700, color:'#FF3333', marginBottom:'8px' }}>
              OVERDUE MP ({overdueItems.length})
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {overdueItems.map((item, idx) => (
                <div key={`${item.deadline}-${item.text || item.content || item.title || idx}`} style={{ border:`1px solid ${dark ? '#6a2a2a' : '#f3c6c6'}`, padding:'6px 8px', fontFamily:'"Noto Sans TC",sans-serif', fontSize:'12px', lineHeight:1.6, color: dark ? '#ffd2d2' : '#9e1d1d', whiteSpace:'pre-wrap', wordBreak:'break-word', overflowWrap:'anywhere' }}>
                  <div style={{ fontFamily:'"DM Mono",monospace', fontSize:'10px', marginBottom:'2px' }}>截止：{item.deadline}</div>
                  {item.text || item.content || item.title || '未命名 MP'}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          className="cp-btn"
          onClick={() => onOpenProject(project)}
          style={{ width:'100%', background:'#2222f0', color:'#fff', border:'2px solid #000', boxShadow:'3px 3px 0 0 #000', padding:'8px 10px', cursor:'pointer', fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.08em' }}
        >
          前往專案編輯
        </button>
      </div>
    </div>
  )
}