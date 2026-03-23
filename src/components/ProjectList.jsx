import { useState, useEffect, useRef } from 'react'

export default function ProjectList({ projects, loading, activeId, onSelect, onDelete, darkMode = true }) {
  const [hoveredId, setHoveredId] = useState(null)
  const [query, setQuery] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 })
  const [progMin, setProgMin] = useState(0)
  const [progMax, setProgMax] = useState(100)
  const [filterDate, setFilterDate] = useState('all')  // kept for compat
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showSort, setShowSort] = useState(false)
  const [sortBy, setSortBy] = useState('time')       // 'time' | 'progress'
  const [sortDir, setSortDir] = useState('desc')     // 'asc' | 'desc'
  const filterRef = useRef(null)
  const sortRef = useRef(null)

  useEffect(() => {
    if (!showFilter) return
    function handleClick(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilter(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showFilter])

  useEffect(() => {
    if (!showSort) return
    function handleClick(e) {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSort(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showSort])

  const styles = buildStyles(darkMode)

  if (loading) {
    return (
      <div style={styles.listWrap}>
        {[1,2,3].map(i => (
          <div key={i} style={{ ...styles.skeleton, opacity: 1 - i * 0.25 }} />
        ))}
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div style={styles.empty}>
        <span style={styles.emptyIcon}>◫</span>
        <span>尚無 OGSM 專案</span>
      </div>
    )
  }

  const now = Date.now()
  const filtered = projects.filter(p => {
    // text search
    if (query.trim()) {
      const q = query.toLowerCase()
      if (!p.title.toLowerCase().includes(q) && !(p.objective || '').toLowerCase().includes(q)) return false
    }
    // progress filter
    if (progMin > 0 || progMax < 100) {
      const pct = calcProgress(p)
      if (pct < progMin || pct > progMax) return false
    }
    // date filter
    if (dateFrom || dateTo) {
      const created = new Date(p.createdAt).setHours(0,0,0,0)
      if (dateFrom && created < new Date(dateFrom + 'T00:00:00').getTime()) return false
      if (dateTo   && created > new Date(dateTo   + 'T00:00:00').getTime()) return false
    }
    return true
  })
  const isFiltering = progMin > 0 || progMax < 100 || dateFrom !== '' || dateTo !== ''

  const sorted = [...filtered].sort((a, b) => {
    let diff = 0
    if (sortBy === 'time') {
      diff = new Date(a.createdAt) - new Date(b.createdAt)
    } else {
      diff = calcProgress(a) - calcProgress(b)
    }
    return sortDir === 'asc' ? diff : -diff
  })

  return (
    <div style={styles.listWrap}>
      {/* Search + Filter row */}
      <style>{`
        @keyframes border-glow {
          0%   { box-shadow: inset 0 0 0 2px rgba(139,92,246,0.5), 0 0  8px rgba(139,92,246,0.3), 0 0 0px rgba(192,132,252,0); outline-color: ${darkMode ? 'rgba(192,132,252,0.6)' : 'rgba(167,139,250,0.5)'}; }
          25%  { box-shadow: inset 0 0 0 3px rgba(192,132,252,1),   0 0 18px rgba(192,132,252,0.7), 0 0 6px rgba(192,132,252,0.4); outline-color: ${darkMode ? 'rgba(230,180,255,1)' : 'rgba(192,132,252,0.95)'}; }
          50%  { box-shadow: inset 0 0 0 2px rgba(139,92,246,0.5), 0 0  8px rgba(139,92,246,0.3), 0 0 0px rgba(192,132,252,0); outline-color: ${darkMode ? 'rgba(192,132,252,0.6)' : 'rgba(167,139,250,0.5)'}; }
          75%  { box-shadow: inset 0 0 0 3px rgba(192,132,252,1),   0 0 18px rgba(192,132,252,0.7), 0 0 6px rgba(192,132,252,0.4); outline-color: ${darkMode ? 'rgba(230,180,255,1)' : 'rgba(192,132,252,0.95)'}; }
          100% { box-shadow: inset 0 0 0 2px rgba(139,92,246,0.5), 0 0  8px rgba(139,92,246,0.3), 0 0 0px rgba(192,132,252,0); outline-color: ${darkMode ? 'rgba(192,132,252,0.6)' : 'rgba(167,139,250,0.5)'}; }
        }
        @keyframes dash-pulse {
          0%, 100% { outline-width: 2.5px; outline-offset: -2px; }
          25%, 75%  { outline-width: 3.5px; outline-offset: -3px; }
        }
        .project-item-active {
          outline: 2.5px dashed ${darkMode ? 'rgba(192,132,252,1)' : 'rgba(167,139,250,0.7)'} !important;
          outline-offset: -2px;
          animation: border-glow 3s ease-in-out infinite, dash-pulse 3s ease-in-out infinite;
        }
        .project-delete-btn:hover {
          background: rgba(239,68,68,0.35) !important;
          border-color: rgba(239,68,68,0.7) !important;
          color: #fff !important;
          transform: scale(1.15);
          box-shadow: 0 0 8px rgba(239,68,68,0.5);
        }
        .project-filter-btn:hover {
          background: ${darkMode ? 'rgba(240,165,0,0.10)' : 'rgba(240,165,0,0.10)'} !important;
          border-color: rgba(240,165,0,0.5) !important;
          color: #f0a500 !important;
          box-shadow: 0 0 6px rgba(240,165,0,0.2);
        }
        .project-sort-btn:hover {
          border-color: rgba(240,165,0,0.5) !important;
          color: #f0a500 !important;
          background: rgba(240,165,0,0.07) !important;
        }
        .project-search-wrap:focus-within {
          border-color: ${darkMode ? 'rgba(139,92,246,0.75)' : 'rgba(139,92,246,0.55)'} !important;
          box-shadow: 0 0 0 3px ${darkMode ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.12)'}, 0 0 10px ${darkMode ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.10)'} !important;
        }
      `}</style>
      <div style={styles.toolRow}>
        <div className="project-search-wrap" style={styles.searchWrap}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            style={{ ...styles.searchInput, paddingRight: query ? '28px' : '0' }}
            type="text"
            placeholder="搜尋專案..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button style={styles.searchClear} onClick={() => setQuery('')}>✕</button>
          )}
        </div>
        <div style={styles.filterBtnWrap} ref={filterRef}>
          <button
            className="project-filter-btn"
            style={{ ...styles.filterBtn, ...(isFiltering ? styles.filterBtnActive : {}) }}
            onClick={() => {
              if (!showFilter && filterRef.current) {
                const rect = filterRef.current.getBoundingClientRect()
                setPopupPos({ top: rect.bottom + 6, left: rect.left })
              }
              setShowFilter(v => !v)
            }}
            title="篩選"
          >
            ⚙
          </button>

          {/* Filter popup */}
          {showFilter && (
            <div style={{ ...styles.filterPanel, top: popupPos.top, left: popupPos.left }}>
              <style>{`
              .prog-range::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 14px; height: 14px;
                border-radius: 50%;
                background: #2563eb;
                border: 2px solid ${darkMode ? '#e8ecf4' : '#ffffff'};
                cursor: pointer;
                pointer-events: all;
                position: relative;
                z-index: 2;
                box-shadow: 0 0 0 2px #2563eb;
              }
              .prog-range::-moz-range-thumb {
                width: 14px; height: 14px;
                border-radius: 50%;
                background: #2563eb;
                border: 2px solid ${darkMode ? '#e8ecf4' : '#ffffff'};
                cursor: pointer;
                pointer-events: all;
              }
              .prog-range-track {
                position: absolute;
                width: 100%; height: 4px;
                background: ${darkMode ? '#2a3347' : '#c8d4e8'};
                border-radius: 2px;
                top: 50%; transform: translateY(-50%);
              }
            `}</style>
              <div style={styles.filterGroup}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={styles.filterLabel}>完成進度</div>
                  <span style={styles.rangeDisplay}>{progMin}% – {progMax}%</span>
                </div>
                <div style={styles.rangeWrap}>
                  <div className="prog-range-track" />
                  <div
                    style={{
                      ...styles.rangeTrackFill,
                      left: `${progMin}%`,
                      width: `${progMax - progMin}%`,
                    }}
                  />
                  <input
                    type="range" min={0} max={100} step={1}
                    value={progMin}
                    onChange={e => { const v = Math.min(Number(e.target.value), progMax); setProgMin(v) }}
                    style={styles.rangeInput}
                    className="prog-range"
                  />
                  <input
                    type="range" min={0} max={100} step={1}
                    value={progMax}
                    onChange={e => { const v = Math.max(Number(e.target.value), progMin); setProgMax(v) }}
                    style={styles.rangeInput}
                    className="prog-range"
                  />
                </div>
              </div>
              <div style={styles.filterGroup}>
                <div style={styles.filterLabel}>建立日期</div>
                <div style={styles.dateRangeRow}>
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={e => {
                      const v = e.target.value
                      if (dateTo && v > dateTo) return
                      setDateFrom(v)
                    }}
                    style={{ ...styles.dateInput, ...(dateFrom && dateTo && dateFrom > dateTo ? styles.dateInputError : {}) }}
                  />
                  <span style={styles.dateSep}>–</span>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={e => {
                      const v = e.target.value
                      if (dateFrom && v < dateFrom) return
                      setDateTo(v)
                    }}
                    style={{ ...styles.dateInput, ...(dateFrom && dateTo && dateFrom > dateTo ? styles.dateInputError : {}) }}
                  />
                </div>
              </div>
              {isFiltering && (
                <button style={styles.filterReset} onClick={() => { setProgMin(0); setProgMax(100); setDateFrom(''); setDateTo('') }}>清除篩選</button>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={styles.listLabelRow}>
        <span style={styles.listLabel}>
          {(query || isFiltering) ? `共 ${filtered.length} 筆` : `專案清單 · ${projects.length}`}
        </span>
        <div style={styles.filterBtnWrap} ref={sortRef}>
          <button
            className="project-sort-btn"
            style={{ ...styles.sortMiniBtn, ...(sortBy !== 'time' || sortDir !== 'desc' ? styles.sortMiniBtnActive : {}) }}
            onClick={() => {
              if (!showSort && sortRef.current) {
                const rect = sortRef.current.getBoundingClientRect()
                setPopupPos({ top: rect.bottom + 4, left: rect.right - 160 })
              }
              setShowSort(v => !v)
            }}
            title="排序"
          >
            {sortDir === 'asc' ? '↑' : '↓'} {sortBy === 'time' ? '時間' : '進度'}
          </button>
          {showSort && (
            <div style={{ ...styles.filterPanel, top: popupPos.top, left: popupPos.left, width: '160px' }}>
              <div style={styles.filterLabel}>排序依據</div>
              <div style={styles.sortOptions}>
                {[['time', '建立時間'], ['progress', '完成進度']].map(([val, label]) => (
                  <button
                    key={val}
                    style={{ ...styles.sortChip, ...(sortBy === val ? styles.sortChipActive : {}) }}
                    onClick={() => setSortBy(val)}
                  >{label}</button>
                ))}
              </div>
              <div style={styles.filterLabel}>排序方向</div>
              <div style={styles.sortOptions}>
                {[['desc', sortBy === 'time' ? '最新優先' : '高→低'], ['asc', sortBy === 'time' ? '最舊優先' : '低→高']].map(([val, label]) => (
                  <button
                    key={val}
                    style={{ ...styles.sortChip, ...(sortDir === val ? styles.sortChipActive : {}) }}
                    onClick={() => setSortDir(val)}
                  >{label}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>🔍</span>
          <span>找不到符合的專案</span>
        </div>
      )}

      {sorted.map(p => {
        const isActive  = p.id === activeId
        const isHovered = p.id === hoveredId
        const pct = calcProgress(p)
        const pc  = getProgressColor(pct)

        return (
          <div
            key={p.id}
            className={isActive ? 'project-item-active' : ''}
            style={{
              ...styles.item,
              background: pc.bg,
              borderLeftColor: pc.accent,
              ...(isActive  ? styles.itemActive  : {}),
              ...(isHovered && !isActive ? styles.itemHover : {}),
            }}
            onClick={() => onSelect(p.id)}
            onMouseEnter={() => setHoveredId(p.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div style={styles.itemInner}>
              <div style={styles.itemTitle}>
                {p.deadline && p.deadline < new Date().toISOString().slice(0, 10) && (
                  <span style={{ display: 'inline-block', fontSize: '9px', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '3px', padding: '1px 5px', marginRight: '6px', verticalAlign: 'middle', letterSpacing: '0.3px', flexShrink: 0 }}>已逾期</span>
                )}
                {p.title}
              </div>
              <div style={styles.itemObjective}>
                {p.objective}
              </div>
              <div style={styles.itemMeta}>
                {formatDate(p.createdAt)}
              </div>
            </div>

            {/* Progress badge */}
            <div style={{ ...styles.progressBadge, color: pc.text }}>
              <span style={styles.progressNum}>{pct}</span>
              <span style={styles.progressPctLabel}>%</span>
            </div>

            {/* Delete button — only show on hover */}
            {isHovered && (
              <button
                className="project-delete-btn"
                style={styles.deleteBtn}
                onClick={e => { e.stopPropagation(); onDelete(p.id) }}
                title="刪除"
              >
                ✕
              </button>
            )}

            {/* Active indicator */}
            {isActive && <div style={styles.activeBar} />}
          </div>
        )
      })}
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  // Ensure UTC interpretation if no timezone suffix
  const normalized = /[Z+\-]\d*$/.test(iso) ? iso : iso + 'Z'
  const d = new Date(normalized)
  return d.toLocaleString('zh-TW', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Taipei' })
}

function calcProgress(project) {
  const measures = (project.goals || []).flatMap(g =>
    (g.strategies || []).flatMap(s => s.measures || [])
  )
  if (!measures.length) return 0
  return Math.round(measures.reduce((sum, m) => sum + (m.progress || 0), 0) / measures.length)
}

function getProgressColor(pct) {
  if (pct === 0)  return { bg: 'transparent',                    accent: '#3a4256', text: '#94a3b8' }
  if (pct < 30)   return { bg: 'rgba(239,68,68,0.15)',           accent: '#ef4444', text: '#ef4444' }
  if (pct < 60)   return { bg: 'rgba(245,158,11,0.15)',          accent: '#f59e0b', text: '#f59e0b' }
  if (pct < 100)  return { bg: 'rgba(59,130,246,0.15)',          accent: '#3b82f6', text: '#3b82f6' }
  return                 { bg: 'rgba(34,197,94,0.15)',           accent: '#22c55e', text: '#22c55e' }
}

function buildStyles(dark) {
  const T = dark ? {
    searchBg:       '#1a2236',
    searchBorder:   '1.5px solid #3d4f6e',
    btnBg:          '#1a2236',
    btnBorder:      '1.5px solid #3d4f6e',
    btnColor:       '#8a95ae',
    panelBg:        '#141c2e',
    panelBorder:    '1px solid #3d4f6e',
    panelShadow:    '0 8px 24px rgba(0,0,0,0.6)',
    chipBg:         '#1e2535',
    chipBorder:     '1px solid #2a3347',
    chipColor:      '#a8b4c9',
    dateInputBg:    '#1a2236',
    dateInputBorder:'1px solid #3d4f6e',
    dateInputColor: '#e8ecf4',
    dateScheme:     'dark',
    sortMiniBorder: '1px solid #2a3347',
    sortMiniColor:  '#8a95ae',
    searchClearBg:  'rgba(255,255,255,0.1)',
    searchClearColor:'#c0c9dc',
    itemHoverBg:    'rgba(148,163,184,0.12)',
    itemTitleColor: '#e8ecf4',
    itemObjColor:   '#a8b4c9',
    itemMetaColor:  '#8a95ae',
    skeletonBg:     'linear-gradient(90deg, #1e2535 25%, #252d3d 50%, #1e2535 75%)',
    scrollbar:      '#2a3347 transparent',
    emptyColor:     '#8a95ae',
    emptyIconColor: '#2a3347',
    listLabelColor: '#d4a855',
    rangeDisplay:   '#00a4f0',
  } : {
    searchBg:       '#edf2fa',
    searchBorder:   '1.5px solid #c8d4e8',
    btnBg:          '#edf2fa',
    btnBorder:      '1.5px solid #c8d4e8',
    btnColor:       '#6a7e98',
    panelBg:        '#ffffff',
    panelBorder:    '1px solid #c8d4e8',
    panelShadow:    '0 8px 24px rgba(60,80,120,0.12)',
    chipBg:         '#eaf0f8',
    chipBorder:     '1px solid #c8d4e8',
    chipColor:      '#445069',
    dateInputBg:    '#f3f7fd',
    dateInputBorder:'1px solid #c8d4e8',
    dateInputColor: '#1a2133',
    dateScheme:     'light',
    sortMiniBorder: '1px solid #c8d4e8',
    sortMiniColor:  '#6a7e98',
    searchClearBg:  'rgba(0,0,0,0.08)',
    searchClearColor:'#445069',
    itemHoverBg:    'rgba(100,116,139,0.12)',
    itemTitleColor: '#1a2133',
    itemObjColor:   '#445069',
    itemMetaColor:  '#7a8ca8',
    skeletonBg:     'linear-gradient(90deg, #dde8f5 25%, #eaf0f8 50%, #dde8f5 75%)',
    scrollbar:      '#c8d4e8 transparent',
    emptyColor:     '#7a8ca8',
    emptyIconColor: '#c8d4e8',
    listLabelColor: '#d4a855',
    rangeDisplay:   '#0077cc',
  }
  return {
    listWrap: {
      flex: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      scrollbarWidth: 'thin',
      scrollbarColor: T.scrollbar,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
    },
    toolRow: {
      display: 'flex',
      alignItems: 'center',
      padding: '10px 12px 0',
      gap: '6px',
      flexShrink: 0,
      boxSizing: 'border-box',
      width: '100%',
    },
    searchWrap: {
      display: 'flex',
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
      position: 'relative',
      background: T.searchBg,
      border: T.searchBorder,
      borderRadius: '8px',
      padding: '0 10px',
      gap: '8px',
      boxSizing: 'border-box',
      transition: 'border-color 0.15s',
    },
    filterBtnWrap: {
      position: 'relative',
      flexShrink: 0,
    },
    filterBtn: {
      flexShrink: 0,
      width: '36px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: T.btnBg,
      border: T.btnBorder,
      borderRadius: '8px',
      color: T.btnColor,
      cursor: 'pointer',
      fontSize: '15px',
      transition: 'all 0.15s',
      boxSizing: 'border-box',
    },
    filterBtnActive: {
      borderColor: '#f0a500',
      color: '#f0a500',
      background: 'rgba(240,165,0,0.12)',
    },
    filterPanel: {
      position: 'fixed',
      zIndex: 9999,
      width: '220px',
      background: T.panelBg,
      border: T.panelBorder,
      borderRadius: '10px',
      padding: '12px 14px',
      boxShadow: T.panelShadow,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    },
    filterGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
    },
    filterLabel: {
      fontSize: '10px',
      fontFamily: '"DM Mono", monospace',
      color: '#d4a855',
      letterSpacing: '0.8px',
      textTransform: 'uppercase',
      fontWeight: 600,
    },
    filterOptions: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '5px',
    },
    rangeDisplay: {
      fontSize: '11px',
      fontFamily: '"DM Mono", monospace',
      color: T.rangeDisplay,
      fontWeight: 600,
    },
    rangeWrap: {
      position: 'relative',
      height: '20px',
      marginTop: '6px',
    },
    rangeTrackFill: {
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      height: '4px',
      background: '#00b8f0e7',
      borderRadius: '2px',
      pointerEvents: 'none',
      zIndex: 1,
    },
    rangeInput: {
      position: 'absolute',
      width: '100%',
      height: '4px',
      background: 'transparent',
      appearance: 'none',
      WebkitAppearance: 'none',
      outline: 'none',
      pointerEvents: 'none',
      top: '50%',
      transform: 'translateY(-50%)',
      margin: 0,
      padding: 0,
      zIndex: 2,
    },
    filterChip: {
      background: T.chipBg,
      border: T.chipBorder,
      color: T.chipColor,
      fontSize: '11px',
      padding: '3px 9px',
      borderRadius: '20px',
      cursor: 'pointer',
      transition: 'all 0.12s',
      fontFamily: '"Noto Sans TC", sans-serif',
    },
    filterChipActive: {
      background: 'rgba(240,165,0,0.18)',
      borderColor: '#f0a500',
      color: '#f0c04a',
      fontWeight: 600,
    },
    dateRangeRow: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: '4px',
      marginTop: '4px',
    },
    dateInput: {
      background: T.dateInputBg,
      border: T.dateInputBorder,
      borderRadius: '6px',
      color: T.dateInputColor,
      fontSize: '11px',
      padding: '5px 7px',
      outline: 'none',
      fontFamily: '"DM Mono", monospace',
      colorScheme: T.dateScheme,
      width: '100%',
      boxSizing: 'border-box',
    },
    dateInputError: {
      borderColor: '#ef4444',
    },
    dateSep: {
      color: dark ? '#8a95ae' : '#7a8ca8',
      fontSize: '12px',
      textAlign: 'center',
    },
    sortOptions: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      marginBottom: '8px',
    },
    sortChip: {
      background: T.chipBg,
      border: T.chipBorder,
      color: T.chipColor,
      fontSize: '11px',
      padding: '5px 10px',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.12s',
      fontFamily: '"Noto Sans TC", sans-serif',
      textAlign: 'left',
    },
    sortChipActive: {
      background: 'rgba(240,165,0,0.18)',
      borderColor: '#f0a500',
      color: '#f0c04a',
      fontWeight: 600,
    },
    filterReset: {
      alignSelf: 'flex-start',
      background: 'rgba(239,68,68,0.1)',
      border: '1px solid rgba(239,68,68,0.3)',
      color: '#ef4444',
      fontSize: '11px',
      padding: '3px 10px',
      borderRadius: '20px',
      cursor: 'pointer',
      fontFamily: '"Noto Sans TC", sans-serif',
    },
    searchIcon: {
      fontSize: '14px',
      opacity: 0.75,
      flexShrink: 0,
    },
    searchInput: {
      flex: 1,
      background: 'transparent',
      border: 'none',
      outline: 'none',
      color: dark ? '#e8ecf4' : '#1a2133',
      fontSize: '13px',
      padding: '9px 0',
      fontFamily: '"Noto Sans TC", sans-serif',
      letterSpacing: '0.3px',
    },
    searchClear: {
      position: 'absolute',
      right: '8px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: T.searchClearBg,
      border: 'none',
      color: T.searchClearColor,
      cursor: 'pointer',
      fontSize: '11px',
      width: '18px',
      height: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      lineHeight: 1,
      flexShrink: 0,
      padding: 0,
    },
    listLabelRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 12px 4px 20px',
    },
    listLabel: {
      fontSize: '10px',
      fontFamily: '"DM Mono", monospace',
      color: T.listLabelColor,
      letterSpacing: '0.8px',
      textTransform: 'uppercase',
      fontWeight: 600,
    },
    sortMiniBtn: {
      background: 'transparent',
      border: T.sortMiniBorder,
      color: T.sortMiniColor,
      fontSize: '10px',
      fontFamily: '"DM Mono", monospace',
      padding: '2px 7px',
      borderRadius: '4px',
      cursor: 'pointer',
      letterSpacing: '0.4px',
      transition: 'all 0.15s',
    },
    sortMiniBtnActive: {
      borderColor: '#f0a500',
      color: '#f0a500',
    },
    item: {
      position: 'relative',
      padding: '11px 20px',
      cursor: 'pointer',
      borderLeft: '3px solid transparent',
      transition: 'background 0.12s',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 0,
    },
    itemActive: {
      background: dark ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.10)',
      borderLeftColor: '#8b5cf6',
    },
    itemHover: {
      background: T.itemHoverBg,
    },
    itemInner: {
      flex: 1,
      minWidth: 0,
    },
    itemTitle: {
      fontSize: '13px',
      fontWeight: 600,
      color: T.itemTitleColor,
      marginBottom: '3px',
      whiteSpace: 'normal',
      wordBreak: 'break-word',
      fontFamily: '"Syne", sans-serif',
    },
    itemObjective: {
      fontSize: '11px',
      color: T.itemObjColor,
      lineHeight: 1.4,
      marginBottom: '5px',
    },
    itemMeta: {
      fontSize: '10px',
      fontFamily: '"DM Mono", monospace',
      color: T.itemMetaColor,
      fontWeight: 500,
    },
    progressBadge: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-end',
      minWidth: '52px',
      paddingLeft: '10px',
      paddingBottom: '2px',
      flexShrink: 0,
      lineHeight: 1,
      alignSelf: 'stretch',
    },
    progressNum: {
      fontSize: '32px',
      fontWeight: 800,
      fontFamily: '"DM Mono", monospace',
      lineHeight: 1,
      letterSpacing: '-1px',
    },
    progressPctLabel: {
      fontSize: '11px',
      fontFamily: '"DM Mono", monospace',
      fontWeight: 600,
      opacity: 0.75,
      marginTop: '2px',
    },
    deleteBtn: {
      position: 'absolute',
      top: '6px',
      right: '8px',
      background: 'rgba(239,68,68,0.15)',
      border: '1px solid rgba(239,68,68,0.3)',
      color: '#ef4444',
      cursor: 'pointer',
      padding: '2px 6px',
      fontSize: '11px',
      lineHeight: 1,
      transition: 'all 0.2s',
      borderRadius: '3px',
      fontWeight: 600,
    },
    activeBar: {
      position: 'absolute',
      left: 0, top: '8%', bottom: '8%',
      width: '4px',
      background: 'linear-gradient(180deg, #8b5cf6, #c084fc)',
      borderRadius: '0 3px 3px 0',
      boxShadow: '0 0 8px rgba(139,92,246,0.6)',
    },
    skeleton: {
      margin: '8px 20px',
      height: '62px',
      background: T.skeletonBg,
      backgroundSize: '200% 100%',
      borderRadius: '6px',
      animation: 'shimmer 1.4s infinite',
    },
    empty: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      padding: '40px 20px',
      color: T.emptyColor,
      fontSize: '12px',
    },
    emptyIcon: { fontSize: '28px', color: T.emptyIconColor },
  }
}
