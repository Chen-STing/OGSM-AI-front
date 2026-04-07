/**
 * GanttPanel.jsx  ── v2  (改善版)
 *
 * 主要改善：
 *  1. startDate 驅動 — 使用 todo.startDate（若無則回退 createdAt/today），
 *     讓條目真正反映計畫開始時間，而非全部從同一天堆疊。
 *  2. 進度條 — 完成度以斜線填充比例呈現，逾期任務顯示應完成比例。
 *  3. 里程碑（Milestones）— goal / measure 層級的截止日期渲染為菱形符號。
 *  4. 相依性提示 — 同一 strategyLabel 內的任務按時序排列，並以虛線連接。
 *  5. 視圖縮放 — 月 / 週 / 日 三種縮放模式；日模式即原始 DAY_W。
 *  6. 鳥瞰滾動條 — 顯示全時程小縮圖，點擊快速跳轉。
 *  7. 負責人欄位 — 左側 Label 下方顯示 assignees chip。
 *  8. 「已完成」條目長度修正 — 完成時間軸截至 today，不延伸超過今天。
 *  9. 逾期狀態精確呈現 — 在時間軸上用紅色虛線標出應截止位置。
 * 10. 圖例說明完整化，含里程碑符號。
 *
 * Props（與 v1 相容，新增選用 prop）：
 *   project    { name, deadline? }  // 頂層專案
 *   todos      TodoItem[]           // 見下方型別
 *   milestones Milestone[]          // 選用，里程碑陣列
 *   dark       boolean
 *   onClose    () => void
 *
 * TodoItem 型別（新增 startDate、progress、strategyLabel）：
 *   {
 *     id, text, done, deadline, createdAt, assignees,
 *     goalLabel?,
 *     strategyLabel?,       // 新增：用於相依性連線
 *     startDate?,           // 新增：AI 生成的計畫開始日期
 *     progress?,            // 新增：0-100，若有則顯示進度填充
 *   }
 *
 * Milestone 型別：
 *   { id, label, date, color? }
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

// ─── 常數 ──────────────────────────────────────────────────────────────────────

const HEADER_H  = 52    // px
const ROW_H     = 40    // px
const LABEL_W   = 240   // px
const MINI_H    = 32    // px 鳥瞰列高
const TODAY     = new Date(); TODAY.setHours(0, 0, 0, 0)

const ZOOM_DAY_W = { day: 28, week: 14, month: 6 }

const COLORS = [
  '#2222f0', '#FF00FF', '#FF6600', '#00AA44',
  '#FF3333', '#9933FF', '#0099CC', '#CC6600',
  '#E0A020', '#44AACC',
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

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// 計算今天相對於 [start, end] 的完成比例（0~1）
function calcTimeProgress(start, end) {
  const total = daysBetween(start, end)
  if (total <= 0) return 1
  const elapsed = daysBetween(start, TODAY)
  return clamp(elapsed / total, 0, 1)
}

// ─── 月標頭 ───────────────────────────────────────────────────────────────────

function MonthHeader({ start, totalDays, dayW, dark }) {
  const monthBg = dark ? '#2a303a' : '#edf3fb'
  const monthBorder = dark ? '#465366' : '#c8d4e4'
  const monthText = dark ? '#aab8cd' : '#5f728d'
  const months = []
  let cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  while (daysBetween(start, cur) < totalDays) {
    const ms = Math.max(0, daysBetween(start, cur))
    const eom = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    const me = Math.min(totalDays, daysBetween(start, eom))
    months.push({ label: `${cur.getFullYear()}/${String(cur.getMonth() + 1).padStart(2, '0')}`, span: me - ms, start: ms })
    cur = eom
  }
  return (
    <div style={{ display: 'flex', height: '22px', background: monthBg }}>
      {months.map((m, i) => (
        <div key={i} style={{
          width: m.span * dayW, flexShrink: 0,
          borderRight: `1px solid ${monthBorder}`,
          fontFamily: '"DM Mono", monospace', fontSize: '10px', fontWeight: 900,
          color: monthText,
          display: 'flex', alignItems: 'center',
          paddingLeft: '6px', overflow: 'hidden', whiteSpace: 'nowrap',
        }}>{m.label}</div>
      ))}
    </div>
  )
}

// ─── 日標頭 ───────────────────────────────────────────────────────────────────

function DayHeader({ start, totalDays, dayW, zoom, dark }) {
  const weekEndBg = dark ? '#343d4c' : '#e9f0fa'
  const dayBorder = dark ? '#425063' : '#d3dde9'
  const dayText = dark ? '#8090aa' : '#7a8ca5'
  const weekEndText = dark ? '#9fb0c8' : '#8ba0ba'
  // week / month zoom 只顯示特定日期
  const shouldShow = (d) => {
    if (zoom === 'day') return true
    if (zoom === 'week') return d.getDay() === 1 // 每週一
    return d.getDate() === 1 // 每月 1 日
  }
  return (
    <div style={{ display: 'flex', height: '30px' }}>
      {Array.from({ length: totalDays }, (_, i) => {
        const d = addDays(start, i)
        const isToday = daysBetween(TODAY, d) === 0
        const isSun = d.getDay() === 0
        const isSat = d.getDay() === 6
        const show = shouldShow(d)
        return (
          <div key={i} style={{
            width: dayW, flexShrink: 0,
            borderRight: (zoom === 'day' || show) ? `1px solid ${dayBorder}` : 'none',
            background: isToday ? '#FFFF00' : (isSat || isSun) ? weekEndBg : 'transparent',
            fontFamily: '"DM Mono", monospace', fontSize: '9px',
            color: isToday ? '#000' : (isSat || isSun) ? weekEndText : dayText,
            fontWeight: isToday ? 900 : 400,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {show ? (zoom === 'month' ? `${d.getMonth() + 1}月` : d.getDate()) : ''}
          </div>
        )
      })}
    </div>
  )
}

// ─── 甘特條 ───────────────────────────────────────────────────────────────────

function GanttBar({ todo, startOffset, barDays, totalDays, color, dayW, dark, isOverdue, todayOffset }) {
  const [hovered, setHovered] = useState(false)

  // 顯示進度 %：有 progress prop 優先用，否則 done=100 / 0
  const progressPct = todo.done ? 100 : (todo.progress ?? 0)

  // 時間推進比例（用於逾期情境）
  const startD = parseDate(todo.startDate) ?? parseDate(todo.createdAt) ?? TODAY
  const endD = parseDate(todo.deadline)
  const timePct = endD ? calcTimeProgress(startD, endD) : 0

  const barBg = todo.done ? '#00AA44' : isOverdue ? '#FF3333' : color
  const shadow = dark ? '#686868' : '#000'

  // 已完成任務：右端截至 today（不超過 deadline）
  const effectiveEndOff = todo.done
    ? Math.min(startOffset + barDays, todayOffset + 1)
    : startOffset + barDays
  const effectiveBarDays = Math.max(1, effectiveEndOff - startOffset)
  const rawBarW = effectiveBarDays * dayW - 2
  const maxBarW = Math.max(1, (Math.max(0, totalDays - startOffset) * dayW) - 2)
  const effectiveBarW = Math.min(rawBarW, maxBarW)
  const textMaxW = Math.max(0, effectiveBarW - 12)

  return (
    <div style={{ position: 'relative' }}>
      {/* 主條 */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'absolute',
          left: startOffset * dayW,
          width: effectiveBarW,
          height: ROW_H - 12,
          top: 6,
          background: barBg,
          border: `2px solid ${dark ? '#000' : '#000'}`,
          boxShadow: hovered ? `3px 3px 0 0 ${shadow}` : `1px 1px 0 0 ${shadow}`,
          transition: 'box-shadow 0.12s',
          cursor: 'default',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center',
          padding: '0 6px',
          boxSizing: 'border-box',
        }}
      >
        {/* 進度填充（斜線 overlay） */}
        {progressPct > 0 && progressPct < 100 && (
          <div style={{
            position: 'absolute', left: 0, top: 0,
            width: `${progressPct}%`, height: '100%',
            background: 'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(255,255,255,0.25) 3px,rgba(255,255,255,0.25) 6px)',
            borderRight: '2px dashed rgba(255,255,255,0.6)',
          }} />
        )}
        {/* 完成打叉覆蓋 */}
        {todo.done && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(0,0,0,0.12) 4px,rgba(0,0,0,0.12) 8px)',
          }} />
        )}
        <span style={{
          fontFamily: '"DM Mono", monospace', fontSize: '10px', fontWeight: 900,
          color: '#fff', whiteSpace: 'nowrap', zIndex: 1, position: 'relative',
          textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
          maxWidth: textMaxW,
          width: textMaxW,
          display: 'block',
          minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {todo.done ? '✓ ' : progressPct > 0 ? `${progressPct}% ` : ''}{todo.text}
        </span>
      </div>

      {/* 逾期：deadline 位置畫紅色虛線 */}
      {isOverdue && (
        <div style={{
          position: 'absolute',
          left: (startOffset + barDays - 1) * dayW + dayW / 2,
          top: 2, height: ROW_H - 4,
          width: '2px',
          borderLeft: '2px dashed rgba(255,80,80,0.7)',
          zIndex: 4, pointerEvents: 'none',
        }} />
      )}

      {/* Tooltip */}
      {hovered && (
        <div style={{
          position: 'fixed',
          transform: 'translateX(-50%)',
          marginTop: '-68px',
          zIndex: 9999,
          background: dark ? '#2b3240' : '#f7fbff',
          border: `2px solid ${barBg}`,
          boxShadow: `4px 4px 0 0 ${dark ? '#5c6a80' : '#6f7f96'}`,
          padding: '7px 12px',
          fontFamily: '"DM Mono", monospace',
          fontSize: '11px',
          color: dark ? '#e6edf7' : '#1f2a3a',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          minWidth: '190px',
        }}>
          <div style={{ fontWeight: 900, marginBottom: '3px', color: barBg }}>{todo.text}</div>
          <div>開始：{(parseDate(todo.startDate) ?? parseDate(todo.createdAt))?.toISOString().slice(0, 10) ?? '—'}</div>
          <div>截止：{todo.deadline}</div>
          {todo.assignees?.length > 0 && <div>負責人：{todo.assignees.join(', ')}</div>}
          {/* <div>進度：{progressPct}%</div> */}
          <div>{todo.done ? '✓ 已完成' : isOverdue ? '⚠ 已逾期' : '進行中'}</div>
        </div>
      )}
    </div>
  )
}

// ─── 里程碑菱形 ───────────────────────────────────────────────────────────────

function MilestoneDiamond({ label, offset, dayW, dark }) {
  const [hovered, setHovered] = useState(false)
  const left = offset * dayW + dayW / 2
  return (
    <div style={{ position: 'absolute', left: left - 8, top: ROW_H / 2 - 8, zIndex: 6 }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 16, height: 16,
          background: '#FFFF00',
          border: `2px solid #000`,
          transform: 'rotate(45deg)',
          cursor: 'default',
          boxShadow: hovered ? `2px 2px 0 #000` : `1px 1px 0 #000`,
        }}
      />
      {hovered && (
        <div style={{
          position: 'fixed', transform: 'translateX(-50%)',
          marginTop: '-50px', zIndex: 9999,
          background: dark ? '#2b3240' : '#f7fbff',
          border: `2px solid #FFFF00`,
          boxShadow: `3px 3px 0 ${dark ? '#5c6a80' : '#6f7f96'}`,
          padding: '5px 10px',
          fontFamily: '"DM Mono", monospace', fontSize: '11px',
          color: dark ? '#e6edf7' : '#1f2a3a',
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          ◆ {label}
        </div>
      )}
    </div>
  )
}

// ─── 鳥瞰迷你圖 ──────────────────────────────────────────────────────────────

function MiniMap({ rangeStart, totalDays, groups, todayOffset, scrollRef, containerW, dark }) {
  const mini_dw = Math.max(1, Math.floor(containerW / totalDays))
  const miniW = totalDays * mini_dw

  const handleClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = ratio * (totalDays * ZOOM_DAY_W['day']) - LABEL_W
    }
  }, [totalDays, scrollRef])

  return (
    <div onClick={handleClick} style={{
      position: 'relative', height: MINI_H, overflow: 'hidden',
      background: dark ? '#2a313d' : '#eef3fa',
      borderTop: `1px solid ${dark ? '#4b596f' : '#c7d2e2'}`,
      cursor: 'crosshair', flexShrink: 0,
    }}>
      {/* Today line */}
      {todayOffset >= 0 && todayOffset <= totalDays && (
        <div style={{
          position: 'absolute', left: todayOffset * mini_dw + LABEL_W * mini_dw / ZOOM_DAY_W['day'],
          top: 0, width: 2, height: '100%', background: '#FFFF00', zIndex: 2,
        }} />
      )}
      {/* Mini bars */}
      {groups.flatMap(([, ts], gi) => ts.map((t, ti) => {
        const start = parseDate(t.startDate) ?? parseDate(t.createdAt) ?? TODAY
        const end = parseDate(t.deadline)
        if (!end) return null
        const so = Math.max(0, daysBetween(rangeStart, start))
        const eo = Math.max(so + 1, daysBetween(rangeStart, end) + 1)
        const color = t.done ? '#00AA44' : (!t.done && t.deadline < TODAY.toISOString().slice(0, 10)) ? '#FF3333' : COLORS[(gi + ti) % COLORS.length]
        return (
          <div key={t.id} style={{
            position: 'absolute',
            left: so * mini_dw,
            width: Math.max(2, (eo - so) * mini_dw),
            top: 6, height: 4,
            background: color, opacity: 0.8,
          }} />
        )
      }))}
    </div>
  )
}

// ─── 主組件 ────────────────────────────────────────────────────────────────────

export default function GanttPanel({
  project,
  todos = [],
  milestones = [],
  dark = false,
  onClose,
}) {
  const scrollRef = useRef(null)
  const [groupBy, setGroupBy] = useState('goal')   // 'goal' | 'assignee' | 'status'
  const [filter, setFilter] = useState('all')       // 'all' | 'active' | 'done' | 'overdue'
  const [zoom, setZoom] = useState('day')           // 'day' | 'week' | 'month'
  const [showMini, setShowMini] = useState(true)
  const [containerW, setContainerW] = useState(800)
  const panelRef = useRef(null)

  const dayW = ZOOM_DAY_W[zoom]

  // Escape 關閉
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // 追蹤容器寬度（給 MiniMap 用）
  useEffect(() => {
    if (!panelRef.current) return
    const obs = new ResizeObserver(entries => {
      setContainerW(entries[0].contentRect.width - LABEL_W)
    })
    obs.observe(panelRef.current)
    return () => obs.disconnect()
  }, [])

  // 只取有截止日的任務
  const validTodos = useMemo(() =>
    todos.filter(t => t.deadline && parseDate(t.deadline)),
    [todos]
  )

  // 篩選
  const filteredTodos = useMemo(() => {
    const todayStr = TODAY.toISOString().slice(0, 10)
    return validTodos.filter(t => {
      if (filter === 'done') return t.done
      if (filter === 'active') return !t.done && t.deadline >= todayStr
      if (filter === 'overdue') return !t.done && t.deadline < todayStr
      return true
    })
  }, [validTodos, filter])

  // 計算時間軸範圍（考慮 startDate）
  const { rangeStart, totalDays } = useMemo(() => {
    if (filteredTodos.length === 0) {
      const s = new Date(TODAY); s.setDate(s.getDate() - 3)
      return { rangeStart: s, totalDays: 30 }
    }
    let minD = new Date(TODAY)
    let maxD = new Date(TODAY)
    filteredTodos.forEach(t => {
      const start = parseDate(t.startDate) ?? parseDate(t.createdAt) ?? TODAY
      const end = parseDate(t.deadline)
      if (start < minD) minD = start
      if (end && end > maxD) maxD = end
    })
    // 里程碑也計入
    milestones.forEach(m => {
      const d = parseDate(m.date)
      if (d && d > maxD) maxD = d
    })
    const s = addDays(minD, -3)
    const e = addDays(maxD, 5)
    return { rangeStart: s, totalDays: Math.max(14, daysBetween(s, e) + 1) }
  }, [filteredTodos, milestones])

  const todayOffset = daysBetween(rangeStart, TODAY)

  // 分組
  const groups = useMemo(() => {
    const map = {}
    filteredTodos.forEach(t => {
      let key = '未分組'
      if (groupBy === 'goal') key = t.goalLabel || '未分組'
      if (groupBy === 'assignee') key = (t.assignees ?? []).join(', ') || '未指派'
      if (groupBy === 'status') key = t.done ? '已完成' : (t.deadline < TODAY.toISOString().slice(0, 10) ? '已逾期' : '進行中')
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    // 每組內部按開始日期排序（相依性視覺暗示）
    return Object.entries(map).map(([k, ts]) => [
      k,
      [...ts].sort((a, b) => {
        const da = parseDate(a.startDate) ?? parseDate(a.createdAt) ?? TODAY
        const db = parseDate(b.startDate) ?? parseDate(b.createdAt) ?? TODAY
        return da - db
      }),
    ])
  }, [filteredTodos, groupBy])

  const theme = dark
    ? {
        bg: '#28313c',
        border: '#56657b',
        text: '#e7edf6',
        sub: '#b3bfd0',
        headerBg: '#313b49',
        statsBg: '#2d3744',
        softBg: '#374253',
        controlBg: '#3a4658',
        controlBorder: '#6a7b94',
        scrollTrack: '#313b4a',
        scrollThumb: '#71849d',
        rowDivider: '#4a596f',
        leftBorder: '#52627a',
        accentPrimary: '#3e6fb2',
        accentPrimaryText: '#eef4ff',
        accentOrange: '#e08a42',
        accentWarn: '#e35b5b',
        accentSuccess: '#3ea367',
        accentToday: '#e2c65a',
        accentMilestone: '#d9b84f',
      }
    : {
        bg: '#f3f6fa',
        border: '#c6d1df',
        text: '#1f2a37',
        sub: '#5f6e83',
        headerBg: '#eaf0f7',
        statsBg: '#edf2f8',
        softBg: '#e6edf6',
        controlBg: '#ffffff',
        controlBorder: '#b6c4d7',
        scrollTrack: '#ecf2f9',
        scrollThumb: '#b5c3d5',
        rowDivider: '#d6dfec',
        leftBorder: '#c6d2e4',
        accentPrimary: '#315f9b',
        accentPrimaryText: '#ffffff',
        accentOrange: '#cc7a38',
        accentWarn: '#cf4f4f',
        accentSuccess: '#2f8a56',
        accentToday: '#cfb14a',
        accentMilestone: '#c5a641',
      }
  const bg = theme.bg
  const border = theme.border
  const text = theme.text
  const sub = theme.sub

  const totalW = LABEL_W + totalDays * dayW
  const totalRowH = groups.reduce((s, [, ts]) => s + ts.length * ROW_H + 30, 0)

  // 捲動到今天
  useEffect(() => {
    if (scrollRef.current && todayOffset > 0) {
      scrollRef.current.scrollLeft = Math.max(0, todayOffset * dayW - LABEL_W - 100)
    }
  }, [todayOffset, totalDays, dayW])

  // ── render ──────────────────────────────────────────────────────────────────

  return createPortal(
    <>
      <style>{`
        @keyframes ganttFadeIn {
          from { opacity:0; transform:translate(-50%,-50%) translateY(10px) }
          to   { opacity:1; transform:translate(-50%,-50%) translateY(0) }
        }
        .gantt-scroll::-webkit-scrollbar { width:6px; height:6px }
        .gantt-scroll::-webkit-scrollbar-track { background:${theme.scrollTrack} }
        .gantt-scroll::-webkit-scrollbar-thumb { background:${theme.scrollThumb} }
        .gantt-ctrl-btn {
          font-family:"DM Mono",monospace; font-size:11px; font-weight:700;
          padding:4px 10px; cursor:pointer; border:2px solid;
          transition:all 0.12s;
        }
        .gantt-ctrl-btn:hover { opacity:0.85 }
      `}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99990, background: dark ? 'rgba(17,24,39,0.58)' : 'rgba(31,42,58,0.26)' }} />

      {/* Panel */}
      <div ref={panelRef} style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 99991,
        width: 'min(1200px,97vw)',
        height: 'min(720px,94vh)',
        background: bg,
        border: `3px solid ${theme.border}`,
        boxShadow: `10px 10px 0 0 #FF6600`,
        display: 'flex', flexDirection: 'column',
        animation: 'ganttFadeIn 0.2s ease',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '10px 20px',
          borderBottom: `2px solid ${theme.border}`,
          background: theme.headerBg,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: '"DM Mono",monospace', fontSize: '10px', color: '#FF6600', fontWeight: 900, letterSpacing: '0.1em' }}>
              [ GANTT CHART v2 ]
            </div>
            <div style={{ fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, fontSize: '17px', color: text }}>
              {project?.name || '行動項目'} — 時程總覽
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

            {/* Zoom */}
            {['day', 'week', 'month'].map(z => (
              <button key={z} className="gantt-ctrl-btn"
                onClick={() => setZoom(z)}
                style={{
                  background: zoom === z ? theme.accentOrange : theme.controlBg,
                  color: zoom === z ? '#fff' : text,
                  borderColor: zoom === z ? theme.accentOrange : theme.controlBorder,
                }}>
                {z === 'day' ? '日' : z === 'week' ? '週' : '月'}
              </button>
            ))}

            <div style={{ width: 1, height: 22, background: theme.controlBorder }} />

            {/* Filter */}
            <select value={filter} onChange={e => setFilter(e.target.value)}
              style={{
                fontFamily: '"DM Mono",monospace', fontSize: '11px', fontWeight: 700,
                padding: '4px 8px', background: theme.controlBg, color: text,
                border: `2px solid ${theme.controlBorder}`, outline: 'none', cursor: 'pointer',
              }}>
              <option value="all">全部任務</option>
              <option value="active">進行中</option>
              <option value="done">已完成</option>
              <option value="overdue">已逾期</option>
            </select>

            {/* Group By */}
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)}
              style={{
                fontFamily: '"DM Mono",monospace', fontSize: '11px', fontWeight: 700,
                padding: '4px 8px', background: theme.controlBg, color: text,
                border: `2px solid ${theme.controlBorder}`, outline: 'none', cursor: 'pointer',
              }}>
              <option value="goal">按目標分組</option>
              <option value="assignee">按負責人分組</option>
              <option value="status">按狀態分組</option>
            </select>

            {/* Mini map toggle */}
            <button className="gantt-ctrl-btn"
              onClick={() => setShowMini(v => !v)}
              style={{
                background: showMini ? theme.accentPrimary : theme.controlBg,
                color: showMini ? theme.accentPrimaryText : text,
                borderColor: showMini ? theme.accentPrimary : theme.controlBorder,
              }}>
              鳥瞰
            </button>

            <button onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: text, fontWeight: 900, lineHeight: 1 }}
              onMouseEnter={e => e.currentTarget.style.color = '#FF3333'}
              onMouseLeave={e => e.currentTarget.style.color = text}
            >×</button>
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div style={{
          padding: '6px 20px', borderBottom: `1px solid ${border}`,
          display: 'flex', gap: '20px', flexShrink: 0,
          background: theme.statsBg,
        }}>
          {[
            { label: '總任務', val: validTodos.length, color: theme.accentPrimary },
            { label: '進行中', val: validTodos.filter(t => !t.done && t.deadline >= TODAY.toISOString().slice(0, 10)).length, color: theme.accentOrange },
            { label: '已完成', val: validTodos.filter(t => t.done).length, color: theme.accentSuccess },
            { label: '已逾期', val: validTodos.filter(t => !t.done && t.deadline < TODAY.toISOString().slice(0, 10)).length, color: theme.accentWarn },
            { label: '里程碑', val: milestones.length, color: theme.accentToday },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontFamily: '"DM Mono",monospace', fontSize: '18px', fontWeight: 900, color: s.color }}>{s.val}</span>
              <span style={{ fontFamily: '"DM Mono",monospace', fontSize: '10px', color: sub }}>{s.label}</span>
            </div>
          ))}
          <span style={{ marginLeft: 'auto', fontFamily: '"DM Mono",monospace', fontSize: '10px', color: sub }}>
            {formatDateFull(rangeStart)} — {formatDateFull(addDays(rangeStart, totalDays - 1))}
          </span>
        </div>

        {/* ── Chart area ── */}
        {filteredTodos.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Mono",monospace', fontSize: '13px', color: sub }}>
            {filter === 'all' ? '沒有設定截止日期的任務' : '此篩選條件下沒有任務'}
          </div>
        ) : (
          <div ref={scrollRef} className="gantt-scroll" style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ minWidth: totalW, position: 'relative' }}>

              {/* Sticky header */}
              <div style={{ position: 'sticky', top: 0, zIndex: 10, background: bg, borderBottom: `2px solid ${theme.border}` }}>
                <div style={{ display: 'flex' }}>
                  <div style={{ width: LABEL_W, flexShrink: 0, borderRight: `2px solid ${theme.leftBorder}`, background: theme.softBg }} />
                  <div style={{ flex: 1 }}>
                    <MonthHeader start={rangeStart} totalDays={totalDays} dayW={dayW} dark={dark} />
                    <DayHeader start={rangeStart} totalDays={totalDays} dayW={dayW} zoom={zoom} dark={dark} />
                  </div>
                </div>
              </div>

              {/* Today vertical line */}
              {todayOffset >= 0 && todayOffset <= totalDays && (
                <div style={{
                  position: 'absolute',
                  left: LABEL_W + todayOffset * dayW + dayW / 2,
                  top: HEADER_H,
                  width: '2px',
                  height: totalRowH,
                  background: theme.accentToday,
                  zIndex: 5, pointerEvents: 'none',
                  boxShadow: dark ? '0 0 4px rgba(226,198,90,0.35)' : '0 0 4px rgba(207,177,74,0.35)',
                }} />
              )}

              {/* Project milestone (頂層截止日) */}
              {project?.deadline && (() => {
                const pd = parseDate(project.deadline)
                if (!pd) return null
                const off = daysBetween(rangeStart, pd)
                if (off < 0 || off > totalDays) return null
                return (
                  <div key="proj-ms" style={{
                    position: 'absolute',
                    left: LABEL_W + off * dayW + dayW / 2,
                    top: HEADER_H,
                    width: '2px', height: totalRowH,
                    borderLeft: `2px dashed ${theme.accentOrange}`,
                    zIndex: 4, pointerEvents: 'none',
                  }} />
                )
              })()}

              {/* Groups + rows */}
              {groups.map(([groupName, groupTodos], gi) => (
                <div key={groupName}>
                  {/* Group header */}
                  <div style={{ height: 30, display: 'flex', alignItems: 'center', background: theme.softBg, borderBottom: `1px solid ${border}` }}>
                    <div style={{
                      width: LABEL_W, flexShrink: 0,
                      padding: '0 12px',
                      fontFamily: '"DM Mono",monospace', fontSize: '10px', fontWeight: 900,
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: COLORS[gi % COLORS.length],
                      borderRight: `2px solid ${theme.leftBorder}`,
                      display: 'flex', alignItems: 'center', height: '100%',
                      minWidth: 0,
                      overflow: 'hidden',
                    }}>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={groupName}>{groupName}</span>
                      <span style={{ marginLeft: '5px', color: sub, fontWeight: 400 }}>({groupTodos.length})</span>
                    </div>
                    <div style={{ flex: 1, height: '100%', borderBottom: `1px dashed ${border}` }} />
                  </div>

                  {/* Task rows */}
                  {groupTodos.map((t, ti) => {
                    const startD = parseDate(t.startDate) ?? parseDate(t.createdAt) ?? TODAY
                    const endD = parseDate(t.deadline)
                    const startOff = Math.max(0, daysBetween(rangeStart, startD))
                    const endOff = Math.max(startOff + 1, daysBetween(rangeStart, endD) + 1)
                    const barDays = endOff - startOff
                    const todayStr = TODAY.toISOString().slice(0, 10)
                    const isOverdue = !t.done && t.deadline < todayStr
                    const color = COLORS[(gi * 3 + ti) % COLORS.length]

                    // 相依性虛線：若上一個任務存在，且本任務 startDate 接近上一個 deadline
                    const prevTodo = ti > 0 ? groupTodos[ti - 1] : null
                    let depLineX = null
                    if (prevTodo) {
                      const prevEnd = parseDate(prevTodo.deadline)
                      if (prevEnd) {
                        const prevEndOff = daysBetween(rangeStart, prevEnd) + 1
                        depLineX = prevEndOff * dayW
                      }
                    }

                    return (
                      <div key={t.id} style={{
                        height: ROW_H, display: 'flex',
                        borderBottom: `1px solid ${theme.rowDivider}`,
                        background: ti % 2 === 0
                          ? (dark ? 'rgba(255,255,255,0.03)' : 'rgba(31,42,58,0.025)')
                          : 'transparent',
                      }}>
                        {/* Label */}
                        <div style={{
                          width: LABEL_W, flexShrink: 0,
                          padding: '0 12px',
                          display: 'flex', alignItems: 'center', gap: '6px',
                          borderRight: `1px solid ${theme.rowDivider}`,
                          overflow: 'hidden',
                        }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                            background: t.done ? '#00AA44' : isOverdue ? '#FF3333' : color,
                            border: `1.5px solid ${dark ? '#000' : '#fff'}`,
                          }} />
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, minWidth: 0 }}>
                            <span style={{
                              fontFamily: '"Noto Sans TC",sans-serif', fontSize: '11px',
                              color: t.done ? (dark ? '#90a0b8' : '#96a4b8') : text,
                              textDecoration: t.done ? 'line-through' : 'none',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{t.text}</span>
                            {/* Assignees chips */}
                            {t.assignees?.length > 0 && (
                              <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '1px' }}>
                                {t.assignees.slice(0, 2).map(a => (
                                  <span key={a} style={{
                                    fontSize: '9px', fontFamily: '"DM Mono",monospace',
                                    background: dark ? 'rgba(100,140,210,0.2)' : 'rgba(34,34,240,0.08)',
                                    color: dark ? '#8ab0f0' : '#2222f0',
                                    border: `1px solid ${dark ? '#3d5080' : '#c0cce8'}`,
                                    borderRadius: '2px', padding: '0 3px', whiteSpace: 'nowrap',
                                  }}>{a}</span>
                                ))}
                                {t.assignees.length > 2 && (
                                  <span style={{ fontSize: '9px', color: sub }}>+{t.assignees.length - 2}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Chart area */}
                        <div style={{ flex: 1, position: 'relative', overflowX: 'hidden', overflowY: 'visible' }}>
                          {/* Weekend shading */}
                          {zoom === 'day' && Array.from({ length: totalDays }, (_, i) => {
                            const d = addDays(rangeStart, i)
                            if (d.getDay() !== 0 && d.getDay() !== 6) return null
                            return <div key={i} style={{ position: 'absolute', left: i * dayW, top: 0, width: dayW, height: '100%', background: dark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.025)', pointerEvents: 'none' }} />
                          })}

                          {/* 相依性虛線 */}
                          {depLineX !== null && (
                            <div style={{
                              position: 'absolute',
                              left: depLineX,
                              top: '50%', transform: 'translateY(-50%)',
                              width: Math.max(0, startOff * dayW - depLineX),
                              height: '1px',
                              borderTop: `2px dashed ${theme.controlBorder}`,
                              pointerEvents: 'none', zIndex: 3,
                            }} />
                          )}

                          <GanttBar
                            todo={t}
                            startOffset={startOff}
                            barDays={barDays}
                            totalDays={totalDays}
                            color={color}
                            dayW={dayW}
                            dark={dark}
                            isOverdue={isOverdue}
                            todayOffset={todayOffset}
                          />

                          {/* Milestone markers 疊在任務列上 */}
                          {milestones
                            .filter(m => {
                              const md = parseDate(m.date)
                              return md && m.relatedGoal === t.goalLabel
                            })
                            .map(m => {
                              const md = parseDate(m.date)
                              const off = daysBetween(rangeStart, md)
                              if (off < 0 || off > totalDays) return null
                              return <MilestoneDiamond key={m.id} label={m.label} offset={off} dayW={dayW} dark={dark} />
                            })}
                        </div>
                      </div>
                    )
                  })}

                  {/* Goal-level milestone row */}
                  {milestones
                    .filter(m => m.relatedGoal === groupName || (!m.relatedGoal && groupBy !== 'goal'))
                    .map(m => {
                      const md = parseDate(m.date)
                      if (!md) return null
                      const off = daysBetween(rangeStart, md)
                      if (off < 0 || off > totalDays) return null
                      return (
                        <div key={m.id} style={{ height: ROW_H, display: 'flex', background: dark ? 'rgba(255,255,0,0.09)' : 'rgba(255,200,0,0.12)', borderBottom: `1px solid ${border}` }}>
                          <div style={{
                            width: LABEL_W, flexShrink: 0, padding: '0 12px',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            borderRight: `1px solid ${theme.rowDivider}`,
                            minWidth: 0,
                          }}>
                            <span style={{ fontSize: '12px', flexShrink: 0 }}>◆</span>
                            <span
                              title={m.label}
                              style={{
                                fontFamily: '"DM Mono",monospace',
                                fontSize: '10px',
                                color: theme.accentMilestone,
                                fontWeight: 700,
                                flex: 1,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {m.label}
                            </span>
                          </div>
                          <div style={{ flex: 1, position: 'relative' }}>
                            <MilestoneDiamond label={m.label} offset={off} dayW={dayW} dark={dark} />
                            {/* Vertical milestone line through this row */}
                            <div style={{
                              position: 'absolute',
                              left: off * dayW + dayW / 2,
                              top: 0, width: '2px', height: '100%',
                              background: theme.accentMilestone, opacity: 0.5, pointerEvents: 'none',
                            }} />
                          </div>
                        </div>
                      )
                    })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 鳥瞰圖 ── */}
        {showMini && filteredTodos.length > 0 && (
          <MiniMap
            rangeStart={rangeStart}
            totalDays={totalDays}
            groups={groups}
            todayOffset={todayOffset}
            scrollRef={scrollRef}
            containerW={containerW}
            dark={dark}
          />
        )}

        {/* ── Legend ── */}
        <div style={{
          padding: '6px 20px', borderTop: `1px solid ${border}`,
          display: 'flex', gap: '16px', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap',
          background: theme.statsBg,
        }}>
          {[
            { color: theme.accentSuccess, label: '已完成' },
            { color: theme.accentPrimary, label: '進行中' },
            { color: theme.accentWarn, label: '已逾期' },
            { color: theme.accentToday, label: '今天', isLine: true },
            { color: theme.accentOrange, label: '專案截止', isLine: true, dashed: true },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {l.isLine ? (
                <div style={{ width: 2, height: 14, background: l.color, borderLeft: l.dashed ? `2px dashed ${l.color}` : undefined, opacity: l.dashed ? 0.8 : 1 }} />
              ) : (
                <div style={{ width: 10, height: 10, background: l.color, border: `1.5px solid ${theme.leftBorder}` }} />
              )}
              <span style={{ fontFamily: '"DM Mono",monospace', fontSize: '10px', color: sub }}>{l.label}</span>
            </div>
          ))}
          {/* Milestone */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 10, height: 10, background: theme.accentMilestone, border: `1.5px solid ${theme.leftBorder}`, transform: 'rotate(45deg)' }} />
            <span style={{ fontFamily: '"DM Mono",monospace', fontSize: '10px', color: sub }}>里程碑</span>
          </div>
          {/* Dependency */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 18, height: 0, borderTop: `2px dashed ${theme.controlBorder}` }} />
            <span style={{ fontFamily: '"DM Mono",monospace', fontSize: '10px', color: sub }}>相依關係</span>
          </div>
          <span style={{ marginLeft: 'auto', fontFamily: '"DM Mono",monospace', fontSize: '10px', color: sub }}>
            縮放：{zoom === 'day' ? '日' : zoom === 'week' ? '週' : '月'} ｜ 點擊鳥瞰圖快速跳轉
          </span>
        </div>
      </div>
    </>,
    document.body
  )
}