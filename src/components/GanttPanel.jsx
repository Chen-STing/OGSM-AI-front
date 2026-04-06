/**
 * GanttPanel.jsx
 *
 * 行動項目甘特圖
 *
 * 使用方式：
 *   <GanttPanel
 *     project={project}          // 包含 name 的專案物件
 *     todos={allTodos}           // TodoItem[]（見下方型別）
 *     dark={darkMode}
 *     onClose={() => setShowGantt(false)}
 *   />
 *
 * TodoItem 型別（與你現有的 TodoList.jsx 一致）：
 *   {
 *     id: string
 *     text: string
 *     done: boolean
 *     deadline: string     // 'YYYY-MM-DD'（必填，否則不顯示在圖上）
 *     createdAt: string    // ISO 日期（作為開始日）
 *     assignees: string[]
 *     // 可選：goalLabel, strategyLabel 用於分組顯示
 *     goalLabel?: string
 *   }
 */

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

// ─── 常數 ──────────────────────────────────────────────────────────────────────

const HEADER_H   = 48   // px：日期標頭高度
const ROW_H      = 36   // px：每列高度
const LABEL_W    = 220  // px：左側任務名稱欄寬
const DAY_W      = 28   // px：每天寬度
const TODAY      = new Date(); TODAY.setHours(0,0,0,0)

const COLORS = [
  '#2222f0', '#FF00FF', '#FF6600', '#00AA44',
  '#FF3333', '#9933FF', '#0099CC', '#CC6600',
]

// ─── 工具函式 ──────────────────────────────────────────────────────────────────

function parseDate(str) {
  if (!str) return null
  const d = new Date(str)
  d.setHours(0, 0, 0, 0)
  return isNaN(d.getTime()) ? null : d
}

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000)
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function formatDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatDateFull(date) {
  return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ─── 子組件 ────────────────────────────────────────────────────────────────────

function MonthHeader({ start, totalDays, dark }) {
  const months = []
  let cur = new Date(start)
  cur.setHours(0,0,0,0)

  while (daysBetween(start, cur) < totalDays) {
    const monthStart = Math.max(0, daysBetween(start, cur))
    const endOfMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    const monthEnd   = Math.min(totalDays, daysBetween(start, endOfMonth))
    const span       = monthEnd - monthStart

    months.push({
      label: `${cur.getFullYear()}/${String(cur.getMonth() + 1).padStart(2, '0')}`,
      span, start: monthStart,
    })
    cur = endOfMonth
  }

  return (
    <div style={{ display: 'flex', height: '22px', background: dark ? '#111' : '#f0f0f0' }}>
      {months.map((m, i) => (
        <div
          key={i}
          style={{
            width: m.span * DAY_W,
            borderRight: `1px solid ${dark ? '#333' : '#d0d0d0'}`,
            fontFamily: '"DM Mono", monospace',
            fontSize: '10px', fontWeight: 900,
            color: dark ? '#888' : '#666',
            display: 'flex', alignItems: 'center',
            paddingLeft: '6px', overflow: 'hidden', whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >{m.label}</div>
      ))}
    </div>
  )
}

function DayHeader({ start, totalDays, dark }) {
  return (
    <div style={{ display: 'flex', height: '26px' }}>
      {Array.from({ length: totalDays }, (_, i) => {
        const d = addDays(start, i)
        const isToday = daysBetween(TODAY, d) === 0
        const isSun   = d.getDay() === 0
        const isSat   = d.getDay() === 6
        return (
          <div
            key={i}
            style={{
              width: DAY_W, flexShrink: 0,
              borderRight: `1px solid ${dark ? '#222' : '#eee'}`,
              background: isToday ? '#FFFF00' : (isSat || isSun) ? (dark ? '#1a1a1a' : '#f8f8f8') : 'transparent',
              fontFamily: '"DM Mono", monospace', fontSize: '9px',
              color: isToday ? '#000' : (isSat || isSun) ? (dark ? '#444' : '#bbb') : (dark ? '#555' : '#999'),
              fontWeight: isToday ? 900 : 400,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {d.getDate()}
          </div>
        )
      })}
    </div>
  )
}

function GanttBar({ todo, startOffset, barDays, totalDays, color, dark, isOverdue }) {
  const [hovered, setHovered] = useState(false)

  const pct     = todo.done ? 100 : 0
  const barBg   = todo.done ? '#00AA44' : isOverdue ? '#FF3333' : color
  const shadow  = dark ? '#686868' : '#000'

  return (
    <div style={{ position: 'relative' }}>
      {/* Bar */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'absolute',
          left:  startOffset * DAY_W,
          width: Math.max(1, barDays) * DAY_W - 2,
          height: ROW_H - 10,
          top: 5,
          background: barBg,
          border: `2px solid ${dark ? '#000' : '#000'}`,
          boxShadow: hovered ? `3px 3px 0 0 ${shadow}` : `1px 1px 0 0 ${shadow}`,
          transition: 'box-shadow 0.12s',
          cursor: 'default',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center',
          paddingLeft: '6px',
        }}
      >
        {/* Done overlay */}
        {todo.done && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(0,0,0,0.1) 4px,rgba(0,0,0,0.1) 8px)',
          }} />
        )}
        <span style={{
          fontFamily: '"DM Mono", monospace', fontSize: '10px', fontWeight: 900,
          color: '#fff', whiteSpace: 'nowrap', zIndex: 1, position: 'relative',
          textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
          maxWidth: Math.max(1, barDays) * DAY_W - 16,
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {todo.done ? '✓ ' : ''}{todo.text}
        </span>
      </div>

      {/* Tooltip */}
      {hovered && (
        <div style={{
          position: 'fixed',
          transform: 'translateX(-50%)',
          marginTop: '-60px',
          zIndex: 9999,
          background: dark ? '#1a1a1a' : '#fff',
          border: `2px solid ${barBg}`,
          boxShadow: `4px 4px 0 0 ${dark ? '#444' : '#000'}`,
          padding: '6px 10px',
          fontFamily: '"DM Mono", monospace',
          fontSize: '11px',
          color: dark ? '#e0e0e0' : '#000',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          minWidth: '180px',
        }}>
          <div style={{ fontWeight: 900, marginBottom: '2px', color: barBg }}>{todo.text}</div>
          <div>截止：{todo.deadline}</div>
          {todo.assignees?.length > 0 && <div>負責人：{todo.assignees.join(', ')}</div>}
          <div>{todo.done ? '✓ 已完成' : isOverdue ? '⚠ 已逾期' : '進行中'}</div>
        </div>
      )}
    </div>
  )
}

// ─── 主組件 ────────────────────────────────────────────────────────────────────

export default function GanttPanel({ project, todos = [], dark = false, onClose }) {
  const scrollRef  = useRef(null)
  const [groupBy, setGroupBy] = useState('goal') // 'goal' | 'assignee' | 'status'
  const [filter, setFilter]   = useState('all')  // 'all' | 'active' | 'done' | 'overdue'

  // Escape 關閉
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // 只取有截止日的任務
  const validTodos = useMemo(() =>
    todos.filter(t => t.deadline && parseDate(t.deadline)),
    [todos]
  )

  // 篩選
  const filteredTodos = useMemo(() => {
    const todayStr = TODAY.toISOString().slice(0, 10)
    return validTodos.filter(t => {
      if (filter === 'done')    return t.done
      if (filter === 'active')  return !t.done && t.deadline >= todayStr
      if (filter === 'overdue') return !t.done && t.deadline < todayStr
      return true
    })
  }, [validTodos, filter])

  // 計算時間軸範圍
  const { rangeStart, totalDays } = useMemo(() => {
    if (filteredTodos.length === 0) {
      const s = new Date(TODAY); s.setDate(s.getDate() - 3)
      return { rangeStart: s, totalDays: 30 }
    }
    let minD = new Date(TODAY)
    let maxD = new Date(TODAY)
    filteredTodos.forEach(t => {
      const start = parseDate(t.createdAt) ?? TODAY
      const end   = parseDate(t.deadline)
      if (start < minD) minD = start
      if (end   > maxD) maxD = end
    })
    // 各加 3 天 buffer
    const s = addDays(minD, -3)
    const e = addDays(maxD, 3)
    return { rangeStart: s, totalDays: Math.max(14, daysBetween(s, e) + 1) }
  }, [filteredTodos])

  // 今天的 offset
  const todayOffset = daysBetween(rangeStart, TODAY)

  // 分組
  const groups = useMemo(() => {
    const map = {}
    filteredTodos.forEach(t => {
      let key = '未分組'
      if (groupBy === 'goal')     key = t.goalLabel || '未分組'
      if (groupBy === 'assignee') key = (t.assignees ?? []).join(', ') || '未指派'
      if (groupBy === 'status')   key = t.done ? '已完成' : (t.deadline < TODAY.toISOString().slice(0,10) ? '已逾期' : '進行中')
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    return Object.entries(map)
  }, [filteredTodos, groupBy])

  const bg     = dark ? '#131313' : '#fff'
  const border = dark ? '#2a2a2a' : '#e0e0e0'
  const text   = dark ? '#e0e0e0' : '#000'
  const sub    = dark ? '#555' : '#aaa'

  // 捲動到今天
  useEffect(() => {
    if (scrollRef.current && todayOffset > 0) {
      scrollRef.current.scrollLeft = Math.max(0, todayOffset * DAY_W - LABEL_W - 100)
    }
  }, [todayOffset, totalDays])

  const totalW = LABEL_W + totalDays * DAY_W

  return createPortal(
    <>
      <style>{`
        @keyframes ganttFadeIn { from{opacity:0;transform:translate(-50%,-50%) translateY(10px)} to{opacity:1;transform:translate(-50%,-50%) translateY(0)} }
        .gantt-scroll::-webkit-scrollbar { width:6px; height:6px }
        .gantt-scroll::-webkit-scrollbar-track { background:${dark ? '#111' : '#f0f0f0'} }
        .gantt-scroll::-webkit-scrollbar-thumb { background:${dark ? '#333' : '#ccc'} }
      `}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:99990,background:dark?'rgba(0,0,0,0.7)':'rgba(0,0,0,0.4)' }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top:'50%', left:'50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 99991,
        width: 'min(1100px,96vw)',
        height: 'min(680px,92vh)',
        background: bg,
        border: `3px solid ${dark ? '#fff' : '#000'}`,
        boxShadow: `10px 10px 0 0 #FF6600`,
        display: 'flex', flexDirection: 'column',
        animation: 'ganttFadeIn 0.2s ease',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '12px 20px', borderBottom: `2px solid ${dark ? '#222' : '#000'}`,
          background: dark ? '#0d0d0d' : '#f0f0f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily:'"DM Mono",monospace', fontSize:'10px', color:'#FF6600', fontWeight:900, letterSpacing:'0.1em' }}>
              [ GANTT CHART ]
            </div>
            <div style={{ fontFamily:'"Space Grotesk",sans-serif', fontWeight:900, fontSize:'18px', color:text }}>
              {project?.name || '行動項目'} — 時程總覽
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            {/* Filter */}
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{
                fontFamily:'"DM Mono",monospace', fontSize:'11px', fontWeight:700,
                padding:'4px 8px', background:dark?'#1a1a1a':'#fff', color:text,
                border:`2px solid ${dark?'#333':'#ccc'}`, outline:'none', cursor:'pointer',
              }}
            >
              <option value="all">全部任務</option>
              <option value="active">進行中</option>
              <option value="done">已完成</option>
              <option value="overdue">已逾期</option>
            </select>

            {/* Group By */}
            <select
              value={groupBy}
              onChange={e => setGroupBy(e.target.value)}
              style={{
                fontFamily:'"DM Mono",monospace', fontSize:'11px', fontWeight:700,
                padding:'4px 8px', background:dark?'#1a1a1a':'#fff', color:text,
                border:`2px solid ${dark?'#333':'#ccc'}`, outline:'none', cursor:'pointer',
              }}
            >
              <option value="goal">按目標分組</option>
              <option value="assignee">按負責人分組</option>
              <option value="status">按狀態分組</option>
            </select>

            <button
              onClick={onClose}
              style={{ background:'none',border:'none',fontSize:'22px',cursor:'pointer',color:text,fontWeight:900,lineHeight:1 }}
              onMouseEnter={e=>e.currentTarget.style.color='#FF3333'}
              onMouseLeave={e=>e.currentTarget.style.color=text}
            >×</button>
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div style={{
          padding: '6px 20px', borderBottom: `1px solid ${border}`,
          display: 'flex', gap: '20px', flexShrink: 0,
          background: dark ? '#0a0a0a' : '#fafafa',
        }}>
          {[
            { label:'總任務', val: validTodos.length, color:'#2222f0' },
            { label:'進行中', val: validTodos.filter(t=>!t.done && t.deadline >= TODAY.toISOString().slice(0,10)).length, color:'#FF6600' },
            { label:'已完成', val: validTodos.filter(t=>t.done).length, color:'#00AA44' },
            { label:'已逾期', val: validTodos.filter(t=>!t.done && t.deadline < TODAY.toISOString().slice(0,10)).length, color:'#FF3333' },
          ].map(s => (
            <div key={s.label} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
              <span style={{ fontFamily:'"DM Mono",monospace', fontSize:'18px', fontWeight:900, color:s.color }}>{s.val}</span>
              <span style={{ fontFamily:'"DM Mono",monospace', fontSize:'10px', color:sub }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── Chart area ── */}
        {filteredTodos.length === 0 ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'"DM Mono",monospace', fontSize:'13px', color:sub }}>
            {filter === 'all' ? '沒有設定截止日期的任務' : '此篩選條件下沒有任務'}
          </div>
        ) : (
          <div className="gantt-scroll" style={{ flex:1, overflow:'auto' }}>
            <div style={{ minWidth: totalW, position:'relative' }}>

              {/* Sticky header */}
              <div style={{ position:'sticky', top:0, zIndex:10, background:bg, borderBottom:`2px solid ${dark?'#222':'#ccc'}` }}>
                <div style={{ display:'flex' }}>
                  {/* Empty corner */}
                  <div style={{ width:LABEL_W, flexShrink:0, borderRight:`2px solid ${dark?'#222':'#ccc'}`, background:dark?'#111':'#f5f5f5' }} />
                  {/* Month + Day headers */}
                  <div style={{ flex:1 }}>
                    <MonthHeader start={rangeStart} totalDays={totalDays} dark={dark} />
                    <DayHeader   start={rangeStart} totalDays={totalDays} dark={dark} />
                  </div>
                </div>
              </div>

              {/* Today vertical line */}
              {todayOffset >= 0 && todayOffset <= totalDays && (
                <div style={{
                  position: 'absolute',
                  left: LABEL_W + todayOffset * DAY_W + DAY_W / 2,
                  top: HEADER_H,
                  width: '2px',
                  height: groups.reduce((sum, [, ts]) => sum + ts.length * ROW_H + 30, 0),
                  background: '#FFFF00',
                  zIndex: 5, pointerEvents:'none',
                  boxShadow: '0 0 4px rgba(255,255,0,0.5)',
                }} />
              )}

              {/* Groups + rows */}
              {groups.map(([groupName, groupTodos], gi) => (
                <div key={groupName}>
                  {/* Group header */}
                  <div style={{
                    height: 28, display:'flex', alignItems:'center',
                    background: dark ? '#161616' : '#f5f5f5',
                    borderBottom: `1px solid ${border}`,
                  }}>
                    <div style={{
                      width: LABEL_W, flexShrink:0,
                      padding:'0 12px',
                      fontFamily:'"DM Mono",monospace', fontSize:'10px', fontWeight:900,
                      letterSpacing:'0.1em', textTransform:'uppercase',
                      color: COLORS[gi % COLORS.length],
                      borderRight: `2px solid ${dark?'#222':'#ccc'}`,
                      display:'flex', alignItems:'center', height:'100%',
                    }}>
                      {groupName}
                      <span style={{ marginLeft:'5px', color:sub, fontWeight:400 }}>({groupTodos.length})</span>
                    </div>
                    <div style={{ flex:1, height:'100%', borderBottom:`1px dashed ${border}` }} />
                  </div>

                  {/* Task rows */}
                  {groupTodos.map((t, ti) => {
                    const start    = parseDate(t.createdAt) ?? TODAY
                    const end      = parseDate(t.deadline)
                    const startOff = Math.max(0, daysBetween(rangeStart, start))
                    const endOff   = Math.max(startOff + 1, daysBetween(rangeStart, end) + 1)
                    const barDays  = endOff - startOff
                    const isOverdue = !t.done && t.deadline < TODAY.toISOString().slice(0,10)
                    const color     = COLORS[(gi + ti) % COLORS.length]

                    return (
                      <div
                        key={t.id}
                        style={{
                          height: ROW_H, display:'flex',
                          borderBottom: `1px solid ${dark?'#1a1a1a':'#f0f0f0'}`,
                          background: ti % 2 === 0
                            ? (dark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)')
                            : 'transparent',
                        }}
                      >
                        {/* Label */}
                        <div style={{
                          width: LABEL_W, flexShrink:0,
                          padding: '0 12px',
                          display:'flex', alignItems:'center', gap:'6px',
                          borderRight: `1px solid ${dark?'#1e1e1e':'#eeeeee'}`,
                          overflow:'hidden',
                        }}>
                          <span style={{
                            width:8, height:8, borderRadius:'50%', flexShrink:0,
                            background: t.done ? '#00AA44' : isOverdue ? '#FF3333' : color,
                            border: `1.5px solid ${dark?'#000':'#fff'}`,
                          }} />
                          <span style={{
                            fontFamily:'"Noto Sans TC",sans-serif', fontSize:'11px',
                            color: t.done ? (dark?'#555':'#aaa') : text,
                            textDecoration: t.done ? 'line-through' : 'none',
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                          }}>{t.text}</span>
                        </div>

                        {/* Chart area */}
                        <div style={{ flex:1, position:'relative', overflow:'visible' }}>
                          {/* Weekend shading */}
                          {Array.from({length: totalDays}, (_,i) => {
                            const d = addDays(rangeStart, i)
                            if (d.getDay() !== 0 && d.getDay() !== 6) return null
                            return <div key={i} style={{ position:'absolute', left:i*DAY_W, top:0, width:DAY_W, height:'100%', background:dark?'rgba(255,255,255,0.015)':'rgba(0,0,0,0.025)', pointerEvents:'none' }} />
                          })}
                          <GanttBar
                            todo={t}
                            startOffset={startOff}
                            barDays={barDays}
                            totalDays={totalDays}
                            color={color}
                            dark={dark}
                            isOverdue={isOverdue}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Legend ── */}
        <div style={{
          padding:'6px 20px', borderTop:`1px solid ${border}`,
          display:'flex', gap:'16px', flexShrink:0, alignItems:'center',
          background: dark?'#0a0a0a':'#f5f5f5',
        }}>
          {[
            { color:'#00AA44', label:'已完成' },
            { color:'#2222f0', label:'進行中' },
            { color:'#FF3333', label:'已逾期' },
            { color:'#FFFF00', label:'今天', border:true },
          ].map(l => (
            <div key={l.label} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
              <div style={{ width:l.border?2:10, height:l.border?16:10, background:l.color, border:l.border?'none':`1.5px solid ${dark?'#000':'#fff'}` }} />
              <span style={{ fontFamily:'"DM Mono",monospace', fontSize:'10px', color:sub }}>{l.label}</span>
            </div>
          ))}
          <span style={{ marginLeft:'auto', fontFamily:'"DM Mono",monospace', fontSize:'10px', color:sub }}>
            {formatDateFull(rangeStart)} — {formatDateFull(addDays(rangeStart, totalDays-1))}
          </span>
        </div>
      </div>
    </>,
    document.body
  )
}