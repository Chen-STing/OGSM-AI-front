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
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 260 })
  const triggerRef = useRef(null)
  const dropRef = useRef(null)

  // 把 string[] 統一轉成 { value, label }[]
  const normalised = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  )

  const selected = normalised.find(o => o.value === value)
  const displayLabel = selected ? selected.label : placeholder

  // 計算 dropdown 位置（用 viewport 座標，配合 position:fixed）
  const updatePos = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()

    // 找最近的 scroll container，限制 dropdown 不超出其底部
    const scrollContainer =
      triggerRef.current.closest('[data-scroll-container]') ||
      triggerRef.current.closest('.custom-scrollbar') ||
      triggerRef.current.closest('.b-scroll')

    // sticky header 高度：從 scroll container 頂端算起
    const containerRect = scrollContainer
      ? scrollContainer.getBoundingClientRect()
      : { top: 0, bottom: window.innerHeight }

    // 找 sticky header 底部作為 dropdown 最小起始位置
    const stickyHeader = scrollContainer
      ? scrollContainer.querySelector('[style*="sticky"]') ||
        scrollContainer.querySelector('[data-sticky-header]')
      : null
    const stickyBottom = stickyHeader
      ? stickyHeader.getBoundingClientRect().bottom
      : containerRect.top

    // dropdown 起始點：trigger 底部，但不能高於 sticky header 底端
    const rawTop = rect.bottom + 2
    const clampedTop = Math.max(rawTop, stickyBottom + 2)

    // trigger 已捲出 container 底部，不應顯示
    if (clampedTop >= containerRect.bottom) {
      setOpen(false)
      return
    }

    const availableHeight = Math.max(0, containerRect.bottom - clampedTop - 4)

    setDropPos({
      top: clampedTop,
      left: rect.left,
      width: rect.width,
      maxHeight: availableHeight,
    })
  }

  const openDrop = () => {
    if (disabled) return
    updatePos()
    setOpen(o => !o)
  }

  // 點擊外部關閉 + 滾動時同步位置或自動關閉
  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropRef.current    && !dropRef.current.contains(e.target)
      ) setOpen(false)
    }
    const handleScroll = () => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      const scrollContainer =
        triggerRef.current.closest('[data-scroll-container]') ||
        triggerRef.current.closest('.custom-scrollbar') ||
        triggerRef.current.closest('.b-scroll')
      const containerRect = scrollContainer
        ? scrollContainer.getBoundingClientRect()
        : { top: 0, bottom: window.innerHeight }
      // 找 sticky header 高度，讓 trigger 被它蓋住時才關閉
      const stickyHeader = scrollContainer
        ? scrollContainer.querySelector('[style*="sticky"]') ||
          scrollContainer.querySelector('[data-sticky-header]')
        : null
      const stickyBottom = stickyHeader
        ? stickyHeader.getBoundingClientRect().bottom
        : containerRect.top
      // trigger 被 sticky header 蓋住，或捲出 container 底部，都關閉
      if (rect.bottom <= stickyBottom || rect.top >= containerRect.bottom) {
        setOpen(false)
        return
      }
      updatePos()
    }
    document.addEventListener('mousedown', handleClick)
    // capture:true 可捕捉所有可滾動容器的 scroll 事件
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('scroll', handleScroll, true)
    }
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
            position: 'fixed',
            top: dropPos.top,
            left: dropPos.left,
            width: Math.max(dropPos.width, 140),
            background: T.bg,
            border: `2px solid ${T.border}`,
            boxShadow: `4px 4px 0 0 ${darkMode ? 'rgba(255,255,255,0.2)' : '#000'}`,
            zIndex: 99999,
            maxHeight: `${dropPos.maxHeight}px`,
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