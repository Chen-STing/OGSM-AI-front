import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * BrutalistSelect — 完全自製的下拉選單，取代原生 <select>
 * 游標全程使用自定義粉紅手指，選項列表用 portal 渲染避免 overflow 截切
 *
 * props:
 *   value       - 目前值
 *   onChange    - (value) => void
 *   options     - [{ value, label }]  或  ['string', ...]
 *   placeholder - 未選時顯示的文字
 *   style       - 外層容器 style（寬度、字體等）
 *   darkMode    - boolean
 *   disabled    - boolean
 */
export default function BrutalistSelect({
  value,
  onChange,
  options = [],
  placeholder = '—',
  style = {},
  darkMode = true,
  disabled = false,
  overdue = false,
}) {
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef(null)
  const dropRef = useRef(null)

  // 把 string[] 統一轉成 { value, label }[]
  const normalised = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  )

  const selected = normalised.find(o => o.value === value)
  const displayLabel = selected ? selected.label : placeholder

  // 計算 dropdown 位置
  const openDrop = () => {
    if (disabled) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropPos({
      top:   rect.bottom + window.scrollY + 2,
      left:  rect.left   + window.scrollX,
      width: rect.width,
    })
    setOpen(o => !o)
  }

  // 點擊外部關閉
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropRef.current    && !dropRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const T = darkMode
    ? { bg: '#1e1e1e', border: '#fff', text: '#fff', hoverBg: '#0000FF', hoverText: '#fff', activeBg: '#FFFF00', activeText: '#000' }
    : { bg: '#fff',    border: '#000', text: '#000', hoverBg: '#0000FF', hoverText: '#fff', activeBg: '#FFFF00', activeText: '#000' }

  const borderColor = overdue ? '#cc0000' : T.border
  const textColor   = overdue ? '#cc0000' : T.text

  const CURSOR_HAND = "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"0 0 32 32\"><path d=\"M14 6 v10 h8 v12 h-16 v-16 h4 v-6 z\" fill=\"%23000000\" /><path d=\"M10 2 v10 h8 v12 h-16 v-16 h4 v-6 z\" fill=\"%23FF00FF\" stroke=\"%23FFFFFF\" stroke-width=\"2.5\" stroke-linejoin=\"miter\" /></svg>') 10 2, pointer"

  return (
    <>
      {/* ── Trigger button ── */}
      <div
        ref={triggerRef}
        data-todo-zone
        data-brutalist-select
        onClick={openDrop}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: T.bg,
          border: `1px solid ${borderColor}`,
          color: textColor,
          padding: '0 8px',
          minHeight: '28px',
          boxSizing: 'border-box',
          fontSize: 'inherit',
          fontFamily: 'inherit',
          fontWeight: 'inherit',
          userSelect: 'none',
          opacity: disabled ? 0.4 : 1,
          cursor: CURSOR_HAND,
          position: 'relative',
          ...style,
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        {/* 小三角箭頭 */}
        <svg
          width="8" height="8" viewBox="0 0 8 8" fill="currentColor"
          style={{ flexShrink: 0, marginLeft: '4px', opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <polygon points="0,0 8,0 4,7" />
        </svg>
      </div>

      {/* ── Dropdown portal ── */}
      {open && createPortal(
        <div
          ref={dropRef}
          data-todo-zone
          data-brutalist-select-drop
          style={{
            position: 'absolute',
            top: dropPos.top,
            left: dropPos.left,
            width: Math.max(dropPos.width, 140),
            background: T.bg,
            border: `2px solid ${T.border}`,
            boxShadow: `4px 4px 0 0 ${darkMode ? 'rgba(255,255,255,0.2)' : '#000'}`,
            zIndex: 99999,
            maxHeight: '260px',
            overflowY: 'auto',
          }}
        >
          {normalised.map((opt) => {
            const isActive = opt.value === value
            return (
              <div
                key={opt.value}
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(opt.value)
                  setOpen(false)
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = T.hoverBg
                    e.currentTarget.style.color = T.hoverText
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = T.text
                  }
                }}
                style={{
                  padding: '9px 14px',
                  fontSize: 'inherit',
                  fontFamily: 'inherit',
                  fontWeight: isActive ? 900 : 700,
                  color: isActive ? T.activeText : T.text,
                  background: isActive ? T.activeBg : 'transparent',
                  cursor: CURSOR_HAND,
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  transition: 'background 0.1s, color 0.1s',
                }}
              >
                {isActive && (
                  <span style={{ marginRight: '6px', fontSize: '9px' }}>▶</span>
                )}
                {opt.label}
              </div>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}