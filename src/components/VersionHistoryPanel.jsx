/**
 * VersionHistoryPanel.jsx
 *
 * 版本歷史 / 變更追蹤面板
 *
 * 使用方式：
 *   1. 在你的 api.js 新增：
 *      - api.getVersionHistory(projectId)          → [{ id, timestamp, author, changes, snapshot }]
 *      - api.saveVersion(projectId, snapshot, msg) → saved version
 *      - api.restoreVersion(projectId, versionId)  → restored project
 *
 *   2. 在專案資料儲存時呼叫 api.saveVersion() 建立快照
 *
 *   3. 引入並渲染：
 *      <VersionHistoryPanel
 *        project={project}
 *        currentData={ogsmData}
 *        dark={darkMode}
 *        onRestore={(restoredProject) => { ... }}
 *        onClose={() => setShowHistory(false)}
 *      />
 *
 * 後端 API 規格（建議）：
 *   GET    /api/projects/:id/versions
 *   POST   /api/projects/:id/versions   body: { snapshot, message }
 *   POST   /api/projects/:id/versions/:vid/restore
 */

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// ─── 工具函式 ─────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return '剛剛'
  if (m < 60) return `${m} 分鐘前`
  if (h < 24) return `${h} 小時前`
  if (d < 7) return `${d} 天前`
  return new Date(isoString).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTimestamp(isoString) {
  return new Date(isoString).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

// 將兩個快照 diff，回傳變更描述陣列
function diffSnapshots(prev, next) {
  if (!prev || !next) return []
  const changes = []
  const fields = [
    { key: 'objective', label: 'Objective' },
    { key: 'goals',     label: 'Goals' },
    { key: 'strategies', label: 'Strategies' },
    { key: 'measures',  label: 'Measures' },
  ]
  for (const { key, label } of fields) {
    const a = JSON.stringify(prev[key] ?? '')
    const b = JSON.stringify(next[key] ?? '')
    if (a !== b) changes.push({ field: label, type: 'modified' })
  }
  return changes
}

// ─── 子組件 ───────────────────────────────────────────────────────────────────

function DiffBadge({ type }) {
  const map = {
    modified: { bg: '#FFFF00', color: '#000', label: 'MODIFIED' },
    added:    { bg: '#00FF00', color: '#000', label: 'ADDED' },
    removed:  { bg: '#FF3333', color: '#fff', label: 'REMOVED' },
  }
  const s = map[type] || map.modified
  return (
    <span style={{
      fontFamily: '"DM Mono", monospace',
      fontSize: '9px', fontWeight: 900, letterSpacing: '0.08em',
      background: s.bg, color: s.color,
      padding: '1px 5px', border: '1.5px solid #000',
      userSelect: 'none',
    }}>{s.label}</span>
  )
}

function VersionCard({ version, isSelected, isCurrent, onSelect, onRestore, dark, loading }) {
  const changes = version.changes ?? []
  const accent = isCurrent ? '#00FF00' : isSelected ? '#FFFF00' : (dark ? '#444' : '#e0e0e0')

  return (
    <div
      onClick={() => onSelect(version)}
      style={{
        border: `2px solid ${accent}`,
        boxShadow: isSelected ? `4px 4px 0 0 ${dark ? '#686868' : '#000'}` : 'none',
        background: dark ? (isSelected ? '#1e1e1e' : '#161616') : (isSelected ? '#fffef0' : '#fafafa'),
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'all 0.12s',
        position: 'relative',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          {isCurrent && (
            <span style={{
              fontFamily: '"DM Mono", monospace', fontSize: '9px', fontWeight: 900,
              background: '#00FF00', color: '#000', padding: '1px 6px', border: '1.5px solid #000',
            }}>CURRENT</span>
          )}
          <span style={{
            fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
            fontSize: '12px', color: dark ? '#fff' : '#000',
          }}>
            {version.message || `v${version.version ?? '?'}`}
          </span>
        </div>
        <span style={{
          fontFamily: '"DM Mono", monospace', fontSize: '10px',
          color: dark ? '#777' : '#999',
        }}>{formatRelativeTime(version.timestamp)}</span>
      </div>

      {/* Timestamp + author */}
      <div style={{
        fontFamily: '"DM Mono", monospace', fontSize: '10px',
        color: dark ? '#555' : '#aaa', marginBottom: '6px',
      }}>
        {formatTimestamp(version.timestamp)}
        {version.author ? ` · ${version.author}` : ''}
      </div>

      {/* Changes */}
      {changes.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {changes.map((c, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{
                fontFamily: '"DM Mono", monospace', fontSize: '10px',
                color: dark ? '#aaa' : '#555',
              }}>{c.field}</span>
              <DiffBadge type={c.type} />
            </span>
          ))}
        </div>
      ) : (
        <span style={{
          fontFamily: '"DM Mono", monospace', fontSize: '10px',
          color: dark ? '#444' : '#bbb', fontStyle: 'italic',
        }}>初始快照</span>
      )}

      {/* Restore button (only on selected non-current) */}
      {isSelected && !isCurrent && (
        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onRestore(version) }}
            disabled={loading}
            style={{
              fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
              fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '4px 14px', cursor: loading ? 'not-allowed' : 'pointer',
              background: '#FF6600', color: '#fff',
              border: '2px solid #000', boxShadow: '3px 3px 0 0 #000',
              opacity: loading ? 0.6 : 1, transition: 'all 0.12s',
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '5px 5px 0 0 #000' }}}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '3px 3px 0 0 #000' }}
            onMouseDown={e => { e.currentTarget.style.transform = 'translate(1px,1px)'; e.currentTarget.style.boxShadow = '2px 2px 0 0 #000' }}
          >
            {loading ? '還原中…' : '↩ 還原此版本'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── 快照預覽 ─────────────────────────────────────────────────────────────────

function SnapshotPreview({ snapshot, dark }) {
  if (!snapshot) return (
    <div style={{ padding: '20px', fontFamily: '"DM Mono", monospace', fontSize: '12px', color: dark ? '#444' : '#ccc', textAlign: 'center' }}>
      選擇左側版本以預覽內容
    </div>
  )

  const sections = [
    { key: 'objective', label: 'O · OBJECTIVE', color: '#2222f0' },
    { key: 'goals',     label: 'G · GOALS',     color: '#FF00FF' },
    { key: 'strategies', label: 'S · STRATEGIES', color: '#FF6600' },
    { key: 'measures',  label: 'M · MEASURES',  color: '#00AA44' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '2px' }}>
      {sections.map(({ key, label, color }) => {
        const val = snapshot[key]
        if (!val) return null
        const text = typeof val === 'string' ? val : JSON.stringify(val, null, 2)
        return (
          <div key={key}>
            <div style={{
              fontFamily: '"DM Mono", monospace', fontSize: '10px', fontWeight: 900,
              letterSpacing: '0.1em', color, marginBottom: '4px',
            }}>{label}</div>
            <div style={{
              fontFamily: '"Noto Sans TC", sans-serif', fontSize: '12px',
              lineHeight: 1.6, color: dark ? '#ccc' : '#333',
              background: dark ? '#111' : '#f5f5f5',
              border: `1px solid ${dark ? '#2a2a2a' : '#e0e0e0'}`,
              padding: '8px 10px',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              maxHeight: '120px', overflowY: 'auto',
            }}>{text}</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── 主組件 ───────────────────────────────────────────────────────────────────

export default function VersionHistoryPanel({
  project,
  currentData,
  dark = false,
  onRestore,
  onClose,
  // 直接傳入 api 物件，或使用預設的 fetch
  apiGetVersions,     // async (projectId) => versions[]
  apiSaveVersion,     // async (projectId, snapshot, message) => version
  apiRestoreVersion,  // async (projectId, versionId) => restoredProject
}) {
  const [versions, setVersions]         = useState([])
  const [selectedVersion, setSelected]  = useState(null)
  const [loading, setLoading]           = useState(true)
  const [restoring, setRestoring]       = useState(false)
  const [saveMsg, setSaveMsg]           = useState('')
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState(null)
  const [confirmRestore, setConfirm]    = useState(null)
  const panelRef = useRef(null)

  // Escape 關閉
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && !confirmRestore) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose, confirmRestore])

  // 載入版本列表
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        let data
        if (apiGetVersions) {
          data = await apiGetVersions(project.id)
        } else {
          const res = await fetch(`/api/projects/${project.id}/versions`)
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          data = await res.json()
        }
        // 注入 diff changes（若後端沒提供）
        const enriched = data.map((v, i, arr) => ({
          ...v,
          changes: v.changes ?? diffSnapshots(arr[i + 1]?.snapshot, v.snapshot),
        }))
        setVersions(enriched)
        if (enriched.length > 0) setSelected(enriched[0])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [project.id])

  const handleSaveVersion = async () => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      let saved
      if (apiSaveVersion) {
        saved = await apiSaveVersion(project.id, currentData, saveMsg || '手動儲存')
      } else {
        const res = await fetch(`/api/projects/${project.id}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ snapshot: currentData, message: saveMsg || '手動儲存' }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        saved = await res.json()
      }
      const newVersion = {
        ...saved,
        changes: diffSnapshots(versions[0]?.snapshot, saved.snapshot),
      }
      setVersions(prev => [newVersion, ...prev])
      setSelected(newVersion)
      setSaveMsg('')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async (version) => {
    setConfirm(null)
    setRestoring(true)
    setError(null)
    try {
      let restored
      if (apiRestoreVersion) {
        restored = await apiRestoreVersion(project.id, version.id)
      } else {
        const res = await fetch(`/api/projects/${project.id}/versions/${version.id}/restore`, {
          method: 'POST',
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        restored = await res.json()
      }
      onRestore?.(restored)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setRestoring(false)
    }
  }

  const bg     = dark ? '#1a1a1a' : '#fff'
  const border = dark ? '#333' : '#000'
  const text   = dark ? '#e0e0e0' : '#000'
  const sub    = dark ? '#666' : '#999'

  return createPortal(
    <>
      <style>{`
        @keyframes vhFadeIn { from { opacity:0; transform:translate(-50%,-50%) translateY(8px) } to { opacity:1; transform:translate(-50%,-50%) translateY(0) } }
        .vh-list::-webkit-scrollbar { width:4px }
        .vh-list::-webkit-scrollbar-track { background: ${dark ? '#111' : '#f0f0f0'} }
        .vh-list::-webkit-scrollbar-thumb { background: ${dark ? '#333' : '#ccc'} }
        .vh-preview::-webkit-scrollbar { width:4px }
        .vh-preview::-webkit-scrollbar-track { background: ${dark ? '#111' : '#f0f0f0'} }
        .vh-preview::-webkit-scrollbar-thumb { background: ${dark ? '#333' : '#ccc'} }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 99990,
          background: dark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.35)',
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 99991,
          width: 'min(880px, 96vw)',
          height: 'min(640px, 92vh)',
          background: bg,
          border: `3px solid ${border}`,
          boxShadow: `10px 10px 0 0 ${dark ? '#2222f0' : '#2222f0'}`,
          display: 'flex', flexDirection: 'column',
          animation: 'vhFadeIn 0.2s ease',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '14px 20px', borderBottom: `2px solid ${border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: dark ? '#111' : '#f0f0f0', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', color: '#2222f0', letterSpacing: '0.12em', fontWeight: 900 }}>
              [ VERSION HISTORY ]
            </div>
            <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '18px', color: text }}>
              {project.name || '專案'} 的變更記錄
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: text, fontWeight: 900, lineHeight: 1 }}
            onMouseEnter={e => e.currentTarget.style.color = '#FF3333'}
            onMouseLeave={e => e.currentTarget.style.color = text}
          >×</button>
        </div>

        {/* ── Save new version bar ── */}
        <div style={{
          padding: '10px 20px', borderBottom: `1px solid ${dark ? '#2a2a2a' : '#e0e0e0'}`,
          display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0,
          background: dark ? '#0d0d0d' : '#fafafa',
        }}>
          <input
            value={saveMsg}
            onChange={e => setSaveMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveVersion() }}
            placeholder="版本備註（選填）…"
            style={{
              flex: 1, padding: '6px 10px', fontSize: '12px',
              background: dark ? '#1a1a1a' : '#fff',
              border: `2px solid ${dark ? '#333' : '#ccc'}`,
              color: text, fontFamily: '"Noto Sans TC", sans-serif', outline: 'none',
            }}
          />
          <button
            onClick={handleSaveVersion}
            disabled={saving}
            style={{
              fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
              fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '6px 16px', cursor: saving ? 'not-allowed' : 'pointer',
              background: '#2222f0', color: '#fff',
              border: '2px solid #000', boxShadow: '3px 3px 0 0 #000',
              opacity: saving ? 0.6 : 1, transition: 'all 0.12s', flexShrink: 0,
            }}
            onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '5px 5px 0 0 #000' }}}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '3px 3px 0 0 #000' }}
          >
            {saving ? '儲存中…' : '+ 儲存快照'}
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left: version list */}
          <div
            className="vh-list"
            style={{
              width: '300px', flexShrink: 0,
              borderRight: `2px solid ${dark ? '#222' : '#e0e0e0'}`,
              overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px',
              padding: '12px',
            }}
          >
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', fontFamily: '"DM Mono", monospace', fontSize: '11px', color: sub }}>
                載入中…
              </div>
            ) : error ? (
              <div style={{ padding: '16px', fontFamily: '"DM Mono", monospace', fontSize: '11px', color: '#FF3333', background: 'rgba(255,51,51,0.08)', border: '1px solid rgba(255,51,51,0.3)', padding: '10px' }}>
                ⚠ {error}
              </div>
            ) : versions.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', fontFamily: '"DM Mono", monospace', fontSize: '11px', color: sub }}>
                尚無版本記錄<br />按右上角「+ 儲存快照」建立第一個版本
              </div>
            ) : (
              versions.map((v, i) => (
                <VersionCard
                  key={v.id ?? i}
                  version={v}
                  isSelected={selectedVersion?.id === v.id}
                  isCurrent={i === 0}
                  onSelect={setSelected}
                  onRestore={(ver) => setConfirm(ver)}
                  dark={dark}
                  loading={restoring}
                />
              ))
            )}
          </div>

          {/* Right: snapshot preview */}
          <div
            className="vh-preview"
            style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}
          >
            <div style={{
              fontFamily: '"DM Mono", monospace', fontSize: '10px', color: sub,
              letterSpacing: '0.1em', marginBottom: '12px', fontWeight: 900,
            }}>
              SNAPSHOT PREVIEW {selectedVersion ? `· ${formatTimestamp(selectedVersion.timestamp)}` : ''}
            </div>
            <SnapshotPreview snapshot={selectedVersion?.snapshot} dark={dark} />
          </div>
        </div>

        {/* ── Status bar ── */}
        <div style={{
          padding: '6px 20px', borderTop: `1px solid ${dark ? '#222' : '#e0e0e0'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: dark ? '#0d0d0d' : '#f5f5f5', flexShrink: 0,
        }}>
          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', color: sub }}>
            {versions.length} 個版本
          </span>
          {error && (
            <span style={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', color: '#FF3333' }}>
              ⚠ {error}
            </span>
          )}
        </div>
      </div>

      {/* ── Confirm Restore Modal ── */}
      {confirmRestore && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setConfirm(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: dark ? '#1a1a1a' : '#fff',
              border: '3px solid #FF6600',
              boxShadow: '8px 8px 0 0 #813401',
              padding: '24px 28px', width: '360px',
            }}
          >
            <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '16px', color: '#FF6600', marginBottom: '10px' }}>
              ⚠ 確認還原
            </div>
            <div style={{ fontFamily: '"Noto Sans TC", sans-serif', fontSize: '13px', color: text, lineHeight: 1.6, marginBottom: '16px' }}>
              將把專案還原至 <strong>{confirmRestore.message || formatTimestamp(confirmRestore.timestamp)}</strong>
              <br />目前未儲存的變更將遺失。確定繼續？
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirm(null)}
                style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', padding: '6px 16px', background: 'transparent', color: dark ? '#aaa' : '#555', border: `2px solid ${dark ? '#444' : '#ccc'}`, cursor: 'pointer' }}
              >取消</button>
              <button
                onClick={() => handleRestore(confirmRestore)}
                style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', padding: '6px 16px', background: '#FF6600', color: '#fff', border: '2px solid #000', boxShadow: '3px 3px 0 0 #000', cursor: 'pointer' }}
              >確認還原</button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  )
}