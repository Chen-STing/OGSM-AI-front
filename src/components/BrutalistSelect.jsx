import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * BrutalistSelect — 完全自製的下拉選單，取代原生 <select>
 * 游標全程使用自定義粉紅手指，選項列表用 portal 渲染避免 overflow 截切
 *
 * props:
 *   value       - 目前值（single: string；multiple: string[]）
 *   onChange    - single: (value: string) => void；multiple: (values: string[]) => void
 *   options     - [{ value, label }]  或  ['string', ...]
 *   placeholder - 未選時顯示的文字
 *   style       - 外層容器 style（寬度、字體等）
 *   darkMode    - boolean
 *   disabled    - boolean
 *   multiple    - boolean（啟用多選，預設 false 維持單選行為）
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
  multiple = false,
  showSelectedCount = false,
  selectedCountUnit = '位',
}) {
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 260 })
  const [search, setSearch] = useState('')
  const triggerRef = useRef(null)
  const dropRef = useRef(null)
  const searchRef = useRef(null)

  // 把 string[] 統一轉成 { value, label }[]
  const normalised = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  )

  // 多選模式：統一成 string[] 處理
  const selectedValues = multiple ? (Array.isArray(value) ? value : []) : null
  const selectedCountLabel = multiple
    ? `已選擇 ${selectedValues.length}${selectedCountUnit}`
    : ''

  const displayLabel = multiple
    ? null  // 多選模式用 tag 列表取代
    : (normalised.find(o => o.value === value)?.label ?? placeholder)

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
    if (open) setSearch('')
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
    // 自動聚焦搜尋框
    const t = setTimeout(() => searchRef.current?.focus(), 30)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('scroll', handleScroll, true)
      clearTimeout(t)
    }
  }, [open])

  const T = darkMode
    ? { bg: '#1e1e1e', border: '#fff', text: '#fff', hoverBg: '#0000FF', hoverText: '#fff', activeBg: '#FFFF00', activeText: '#000' }
    : { bg: '#fff',    border: '#000', text: '#000', hoverBg: '#0000FF', hoverText: '#fff', activeBg: '#b8a800', activeText: '#000' }

  const borderColor = overdue ? '#f12222' : T.border
  const textColor   = overdue ? '#f12222' : T.text

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
          cursor: 'pointer',
          position: 'relative',
          ...style,
        }}
      >
        {/* 多選 tag 列 or 單選文字 */}
        {multiple ? (
          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '3px', padding: '3px 0', minWidth: 0 }}>
            {showSelectedCount ? (
              <span style={{ opacity: 0.85, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedCountLabel}
              </span>
            ) : selectedValues.length === 0 ? (
              <span style={{ opacity: 0.4 }}>{placeholder}</span>
            ) : (
              selectedValues.map(v => {
                const label = normalised.find(o => o.value === v)?.label ?? v
                return (
                  <span
                    key={v}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => {
                      e.stopPropagation()
                      onChange(selectedValues.filter(x => x !== v))
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = overdue ? 'rgba(241,34,34,0.25)' : (darkMode ? 'rgba(255,0,0,0.35)' : 'rgba(255,0,0,0.12)')
                      e.currentTarget.style.borderColor = overdue ? '#f12222' : '#ff0000'
                      e.currentTarget.querySelector('span').style.opacity = '1'
                      e.currentTarget.querySelector('span').style.color = '#ff0000'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = overdue ? 'rgba(204,0,0,0.15)' : (darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)')
                      e.currentTarget.style.borderColor = overdue ? '#f12222' : (darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)')
                      e.currentTarget.querySelector('span').style.opacity = '0.6'
                      e.currentTarget.querySelector('span').style.color = ''
                    }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '3px',
                      background: overdue ? 'rgba(241,34,34,0.15)' : (darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'),
                      border: `1px solid ${overdue ? '#f12222' : (darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)')}`,
                      padding: '1px 5px 1px 6px',
                      fontSize: '0.9em',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      lineHeight: 1.5,
                      transition: 'background 0.1s, border-color 0.1s',
                    }}
                  >
                    {label}
                    <span style={{ fontSize: '9px', opacity: 0.6, lineHeight: 1, transition: 'opacity 0.1s, color 0.1s' }}>✕</span>
                  </span>
                )
              })
            )}
          </div>
        ) : (
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayLabel}
          </span>
        )}
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
            width: Math.max(dropPos.width, 160),
            background: T.bg,
            border: `2px solid ${T.border}`,
            boxShadow: `4px 4px 0 0 ${darkMode ? 'rgba(255,255,255,0.2)' : '#000'}`,
            zIndex: 99999,
            maxHeight: `${dropPos.maxHeight}px`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* ─ 搜尋輸入框（僅多選模式顯示）─ */}
          {multiple && (
          <div style={{
            padding: '5px 8px',
            borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, opacity: 0.4, color: T.text }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onMouseDown={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setSearch('') } }}
              placeholder="搜尋…"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: T.text,
                fontSize: 'inherit',
                fontFamily: 'inherit',
                fontWeight: 700,
                minWidth: 0,
              }}
            />
            {search && (
              <span
                onMouseDown={e => { e.preventDefault(); e.stopPropagation() }}
                onClick={e => { e.stopPropagation(); setSearch(''); searchRef.current?.focus() }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ff0000' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.color = T.text }}
                style={{ cursor: 'pointer', opacity: 0.4, color: T.text, fontSize: '11px', lineHeight: 1, flexShrink: 0, transition: 'opacity 0.1s, color 0.1s' }}
              >✕</span>
            )}
          </div>
          )}

          {/* ─ 選項列表 ─ */}
          <div style={{ overflowY: 'auto', flex: 1 }}>

          <style>{`
            .brutal-opt-${darkMode ? 'dark' : 'light'}:not([data-active="true"]):hover {
              background: ${T.hoverBg} !important;
              color: ${T.hoverText} !important;
            }
          `}</style>

          {(() => {
            const q = search.trim().toLowerCase()
            const filtered = q ? normalised.filter(o => o.label.toLowerCase().includes(q)) : normalised
            if (filtered.length === 0) {
              return (
                <div style={{ padding: '10px 14px', fontSize: 'inherit', fontFamily: 'inherit', fontWeight: 700, color: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', userSelect: 'none' }}>
                  無匹配選項
                </div>
              )
            }
            return filtered.map((opt) => {
              const isActive = multiple ? selectedValues.includes(opt.value) : opt.value === value
              return (
                <div
                  key={opt.value}
                  className={`brutal-opt-${darkMode ? 'dark' : 'light'}`}
                  data-active={isActive}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    if (multiple) {
                      const newVals = isActive
                        ? selectedValues.filter(v => v !== opt.value)
                        : [...selectedValues, opt.value]
                      onChange(newVals)
                      // 多選保持開啟，但清除搜尋
                      setSearch('')
                      setTimeout(() => searchRef.current?.focus(), 10)
                    } else {
                      onChange(opt.value)
                      setOpen(false)
                      setSearch('')
                    }
                  }}
                  style={{
                    padding: '9px 14px',
                    fontSize: 'inherit',
                    fontFamily: 'inherit',
                    fontWeight: isActive ? 900 : 700,
                    color: isActive ? T.activeText : T.text,
                    background: isActive ? T.activeBg : 'transparent',
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                    transition: 'background 0.1s, color 0.1s',
                  }}
                >
                  {isActive && (
                    <span style={{ marginRight: '6px', fontSize: multiple ? '11px' : '9px' }}>
                      {multiple ? '✓' : '▶'}
                    </span>
                  )}
                  {opt.label}
                </div>
              )
            })
          })()}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
