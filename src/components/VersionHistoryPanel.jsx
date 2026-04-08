import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { genModalShapes, loadSavedModalConfig, MODAL_DEFAULT_CONFIGS } from '../bgConfig.js'

function renderShapes(shapes) {
  return (
    <>
      {shapes.stars.map((s,i)=>(
        <div key={`vh-s${i}`} style={{ position:'absolute',...s.pos, color:s.color, opacity:0.18, pointerEvents:'none', zIndex:0, animation:s.anim }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"><path d="M12 2.5L14.7 8.8L21.5 9.5L16.3 14L17.8 20.7L12 17.2L6.2 20.7L7.7 14L2.5 9.5L9.3 8.8L12 2.5Z"/></svg>
        </div>
      ))}
      {shapes.crosses.map((s,i)=>(
        <div key={`vh-x${i}`} style={{ position:'absolute',...s.pos, color:s.color, opacity:0.18, pointerEvents:'none', zIndex:0, animation:s.anim }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="square"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </div>
      ))}
      {shapes.circles.map((s,i)=>(
        <div key={`vh-c${i}`} style={{ position:'absolute',...s.pos, color:s.color, opacity:0.18, pointerEvents:'none', zIndex:0, animation:s.anim }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/></svg>
        </div>
      ))}
      {shapes.tris.map((s,i)=>(
        <div key={`vh-t${i}`} style={{ position:'absolute',...s.pos, color:s.color, opacity:0.2, pointerEvents:'none', zIndex:0, animation:s.anim }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter"><polygon points="12,2 22,20 2,20"/></svg>
        </div>
      ))}
    </>
  )
}

// ─── 工具函式 ─────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString) {
  // 處理可能沒有帶時區的字串，確保轉換正確
  const dateObj = new Date(isoString)
  const diff = Date.now() - dateObj.getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  
  if (m < 1) return '剛剛'
  if (m < 60) return `${m} 分鐘前`
  if (h < 24) return `${h} 小時前`
  if (d < 7) return `${d} 天前`
  
  // 超過 7 天顯示詳細日期，強制台灣時區
  return dateObj.toLocaleDateString('zh-TW', { 
    timeZone: 'Asia/Taipei',
    month: 'short', day: 'numeric', year: 'numeric' 
  })
}

function formatTimestamp(isoString) {
  // 強制轉換為台灣時間 (Asia/Taipei) 並使用 24 小時制
  return new Date(isoString).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false 
  })
}

// 將兩個快照 diff，回傳精準的變更描述陣列 (包含 MD 與 MP)
function diffSnapshots(prev, next) {
  if (!prev || !next) return []
  const changes = []

  // 輔助函式：展開階層，方便計算與比對
  const extract = (snap) => {
    const goals = snap.goals || []
    const strats = goals.flatMap(g => g.strategies || [])
    const measures = strats.flatMap(s => s.measures || [])
    const todos = measures.flatMap(m => m.todos || [])
    return { goals, strats, measures, todos }
  }

  const p = extract(prev)
  const n = extract(next)

  // 1. O - Objective 比對
  if (prev.objective !== next.objective) changes.push({ field: 'Objective', type: 'modified' })

  // 2. G - Goals 比對
  if (p.goals.length < n.goals.length) changes.push({ field: 'Goals', type: 'added' })
  else if (p.goals.length > n.goals.length) changes.push({ field: 'Goals', type: 'removed' })
  else if (JSON.stringify(p.goals.map(g=>g.text)) !== JSON.stringify(n.goals.map(g=>g.text))) changes.push({ field: 'Goals', type: 'modified' })

  // 3. S - Strategies 比對
  if (p.strats.length < n.strats.length) changes.push({ field: 'Strategies', type: 'added' })
  else if (p.strats.length > n.strats.length) changes.push({ field: 'Strategies', type: 'removed' })
  else if (JSON.stringify(p.strats.map(s=>s.text)) !== JSON.stringify(n.strats.map(s=>s.text))) changes.push({ field: 'Strategies', type: 'modified' })

  // 4. MD - Measures 定量指標比對
  if (p.measures.length < n.measures.length) changes.push({ field: 'MD 定量指標', type: 'added' })
  else if (p.measures.length > n.measures.length) changes.push({ field: 'MD 定量指標', type: 'removed' })
  else {
    // 排除 todos 的影響，專心比對 MD 欄位
    const cleanM = (ms) => ms.map(({todos, ...rest}) => rest)
    if (JSON.stringify(cleanM(p.measures)) !== JSON.stringify(cleanM(n.measures))) {
      changes.push({ field: 'MD 定量指標', type: 'modified' })
    }
  }

  // 5. MP - Todos 檢核步驟比對
  if (p.todos.length < n.todos.length) changes.push({ field: 'MP 檢核步驟', type: 'added' })
  else if (p.todos.length > n.todos.length) changes.push({ field: 'MP 檢核步驟', type: 'removed' })
  else if (JSON.stringify(p.todos) !== JSON.stringify(n.todos)) changes.push({ field: 'MP 檢核步驟', type: 'modified' })

  return changes
}

function isSameSnapshot(a, b) {
  if (!a || !b) return false
  return diffSnapshots(a, b).length === 0 && diffSnapshots(b, a).length === 0
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

function VersionCard({ 
  version, isSelected, isCurrent, onSelect, onRestore, dark, loading,
  canRestore = false,
  // ▼ 這些是確保編輯與刪除能運作的關鍵屬性
  editingId, editMsg, setEditMsg, onStartEdit, onSaveEdit, onCancelEdit, onStartDelete 
}) {
  const changes = version.changes ?? []
  const accent = isCurrent ? '#00FF00' : isSelected ? '#FFFF00' : (dark ? '#444' : '#e0e0e0')
  const isEditing = editingId === version.id

  return (
    <div
      onClick={() => { if (!isEditing) onSelect(version) }}
      style={{
        border: `2px solid ${accent}`,
        boxShadow: isSelected ? `4px 4px 0 0 ${dark ? '#686868' : '#000'}` : 'none',
        background: dark ? (isSelected ? '#1e1e1e' : '#161616') : (isSelected ? '#fffef0' : '#fafafa'),
        padding: '10px 12px',
        cursor: isEditing ? 'default' : 'pointer',
        transition: 'all 0.12s',
        position: 'relative',
      }}
    >
      {/* ── 頂部區域：標籤、文字 與 操作按鈕 ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', flex: 1 }}>
          {isCurrent && (
            <span style={{
              fontFamily: '"DM Mono", monospace', fontSize: '9px', fontWeight: 900,
              background: '#00FF00', color: '#000', padding: '1px 6px', border: '1.5px solid #000',
            }}>CURRENT</span>
          )}
          
          {/* 編輯輸入框 vs 一般文字 */}
          {isEditing ? (
            <div style={{ display: 'flex', gap: '4px', width: '100%', marginTop: '4px' }}>
              <input 
                autoFocus
                value={editMsg}
                onChange={e => setEditMsg(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') onSaveEdit(version.id)
                  if (e.key === 'Escape') onCancelEdit()
                }}
                style={{
                  flex: 1, padding: '2px 6px', fontSize: '12px',
                  fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
                  background: dark ? '#000' : '#fff', color: dark ? '#fff' : '#000',
                  border: `1.5px solid ${dark ? '#555' : '#ccc'}`, outline: 'none'
                }}
              />
              <button onClick={(e) => { e.stopPropagation(); onSaveEdit(version.id) }} style={{ background: '#00FF00', border: '1.5px solid #000', color: '#000', cursor: 'pointer', fontWeight: 900, padding: '2px 6px', fontSize: '10px' }}>✓</button>
              <button onClick={(e) => { e.stopPropagation(); onCancelEdit() }} style={{ background: '#FF3333', border: '1.5px solid #000', color: '#fff', cursor: 'pointer', fontWeight: 900, padding: '2px 6px', fontSize: '10px' }}>✕</button>
            </div>
          ) : (
            <span style={{
              fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
              fontSize: '12px', color: dark ? '#fff' : '#000', wordBreak: 'break-word'
            }}>
              {version.message || `v${version.version ?? '?'}`}
            </span>
          )}
        </div>

        {/* ▼▼▼ 編輯與刪除按鈕 (取消選取限制，讓它永遠顯示以便測試) ▼▼▼ */}
        {isSelected && !isEditing && onStartEdit && onStartDelete && (
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onStartEdit(version) }}
              title="編輯備註"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '4px', borderRadius: '4px', transition: 'all 0.15s', opacity: 0.6 }}
              onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'; e.currentTarget.style.opacity = 1; e.currentTarget.style.transform = 'scale(1.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.opacity = 0.6; e.currentTarget.style.transform = 'scale(1)'; }}
            >✏️</button>
            <button
              onClick={(e) => { e.stopPropagation(); onStartDelete(version) }}
              title="刪除版本"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '4px', borderRadius: '4px', transition: 'all 0.15s', opacity: 0.6 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,51,51,0.2)'; e.currentTarget.style.opacity = 1; e.currentTarget.style.transform = 'scale(1.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.opacity = 0.6; e.currentTarget.style.transform = 'scale(1)'; }}
            >🗑️</button>
          </div>
        )}
      </div>

      {/* ── 時間與作者 ── */}
      <div style={{
        fontFamily: '"DM Mono", monospace', fontSize: '10px',
        color: dark ? '#555' : '#aaa', marginBottom: '6px',
        display: 'flex', justifyContent: 'space-between'
      }}>
        <span>{formatTimestamp(version.timestamp)}{version.author ? ` · ${version.author}` : ''}</span>
        <span>{formatRelativeTime(version.timestamp)}</span>
      </div>

      {/* ── 變更標籤 ── */}
      {changes.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {changes.map((c, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', color: dark ? '#aaa' : '#555' }}>{c.field}</span>
              <DiffBadge type={c.type} />
            </span>
          ))}
        </div>
      ) : (
        <span style={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', color: dark ? '#444' : '#bbb', fontStyle: 'italic' }}>初始快照或無變更</span>
      )}

      {/* ── 還原按鈕 ── */}
      {isSelected && canRestore && !isEditing && (
        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onRestore(version) }}
            disabled={loading}
            style={{
              fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
              fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '4px 14px', cursor: loading ? 'not-allowed' : 'pointer',
              background: '#FF6600', color: '#fff', border: '2px solid #000', boxShadow: '3px 3px 0 0 #000',
              opacity: loading ? 0.6 : 1, transition: 'all 0.12s',
            }}
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

  let elementsG = [], elementsS = [], elementsMD = [], elementsMP = []
  
  ;(snapshot.goals || []).forEach((g, gi) => {
    elementsG.push(
      <div key={`g-${gi}`}><strong>{`G${gi + 1}.`}</strong> {g.text || '未命名'}</div>
    )
    
    ;(g.strategies || []).forEach((s, si) => {
      elementsS.push(
        <div key={`s-${gi}-${si}`}><strong>{`S${gi + 1}.${si + 1}.`}</strong> {s.text || '未命名'}</div>
      )
      
      ;(s.measures || []).forEach((m, mi) => {
        elementsMD.push(
          <div key={`md-${gi}-${si}-${mi}`}><strong>{`D${gi + 1}.${si + 1}.${mi + 1}.`}</strong> {m.kpi || '未命名'} (目標: {m.target || '無'})</div>
        )
        
        ;(m.todos || []).forEach((t, ti) => {
          elementsMP.push(
            <div key={`mp-${gi}-${si}-${mi}-${ti}`}><strong>{`P${gi + 1}.${si + 1}.${mi + 1}.${ti + 1}.`}</strong> [{t.done ? '✓' : ' '}] {t.text || '未命名'}</div>
          )
        })
      })
    })
  })

  const sections = [
    { key: 'o', label: 'O · OBJECTIVE', color: '#2222f0', content: snapshot.objective || '無' },
    { key: 'g', label: `G · GOALS (${elementsG.length})`, color: '#FF00FF', content: elementsG.length > 0 ? elementsG : null },
    { key: 's', label: `S · STRATEGIES (${elementsS.length})`, color: '#FF6600', content: elementsS.length > 0 ? elementsS : null },
    { key: 'md', label: `MD · MEASURES (${elementsMD.length})`, color: '#00AA44', content: elementsMD.length > 0 ? elementsMD : null },
    { key: 'mp', label: `MP · TODOS (${elementsMP.length})`, color: '#9900FF', content: elementsMP.length > 0 ? elementsMP : null },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '2px' }}>
      {sections.map(({ key, label, color, content }) => {
        if (!content) return null
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
            }}>
              {content}
            </div>
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
  apiUpdateVersion,   // [新增] async (projectId, versionId, message) => updatedVersion
  apiDeleteVersion,   // [新增] async (projectId, versionId) => boolean
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
  const [editingId, setEditingId]       = useState(null)
  const [editMsg, setEditMsg]           = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false) // 用於編輯/刪除時的鎖定

 // 主動讀取設定，並監聽背景變更事件 (解決「沒有動態跟著改變」)
  const [shapeConfig, setShapeConfig] = useState(() => loadSavedModalConfig('member'))

  useEffect(() => {
    const handleBgChange = () => setShapeConfig(loadSavedModalConfig('member'))
    window.addEventListener('brutalistBgChanged', handleBgChange)
    return () => window.removeEventListener('brutalistBgChanged', handleBgChange)
  }, [])

  // 根據最新的設定產生圖形
  const shapes = genModalShapes('member', shapeConfig, shapeConfig.seed)

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

  // 重新計算 diff (當刪除版本時，前後版本的依賴關係會改變，需要重算)
  const recalcEnrichedVersions = (list) => {
    return list.map((v, i, arr) => ({
      ...v,
      changes: diffSnapshots(arr[i + 1]?.snapshot, v.snapshot),
    }))
  }

  // 儲存編輯備註
  const handleSaveEdit = async (versionId) => {
    if (!editMsg.trim()) return
    setIsProcessing(true)
    setError(null)
    try {
      if (apiUpdateVersion) {
        await apiUpdateVersion(project.id, versionId, editMsg)
      } else {
        const res = await fetch(`/api/projects/${project.id}/versions/${versionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: editMsg }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      }
      setVersions(prev => prev.map(v => v.id === versionId ? { ...v, message: editMsg } : v))
      setEditingId(null)
    } catch (e) {
      setError('修改備註失敗：' + e.message)
    } finally {
      setIsProcessing(false)
    }
  }

  // 執行刪除版本
  const handleDeleteVersion = async () => {
    if (!confirmDelete) return
    setIsProcessing(true)
    setError(null)
    try {
      if (apiDeleteVersion) {
        await apiDeleteVersion(project.id, confirmDelete.id)
      } else {
        const res = await fetch(`/api/projects/${project.id}/versions/${confirmDelete.id}`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      }
      
      setVersions(prev => {
        const filtered = prev.filter(v => v.id !== confirmDelete.id)
        return recalcEnrichedVersions(filtered) // 重新計算標籤 Diff
      })
      
      // 如果刪除的是目前選中的，切換到第一個
      if (selectedVersion?.id === confirmDelete.id) {
        setSelected(versions.find(v => v.id !== confirmDelete.id) || null)
      }
      setConfirmDelete(null)
    } catch (e) {
      setError('刪除失敗：' + e.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const T = dark 
    ? { bg:'#222222', border:'#DDDDDD', text:'#F0F0F0', textSub:'#B8B8B8' } 
    : { bg:'#FFFFFF', border:'#111111', text:'#111111', textSub:'#484848' };

  const bg     = T.bg;
  const border = T.border;
  const text   = T.text;
  const sub    = T.textSub;

  return createPortal(
    <>
      <style>{`
        @keyframes vhFadeIn { from { opacity:0; transform:translate(-50%,-50%) translateY(8px) } to { opacity:1; transform:translate(-50%,-50%) translateY(0) } }
        
        /* 漂浮幾何圖形的 Keyframes */
        @keyframes ms-starFloat   { 0%{transform:translate(0,0) rotate(0deg) scale(1)} 25%{transform:translate(20px,-30px) rotate(90deg) scale(1.25)} 50%{transform:translate(-10px,20px) rotate(180deg) scale(0.85)} 75%{transform:translate(30px,10px) rotate(270deg) scale(1.15)} 100%{transform:translate(0,0) rotate(360deg) scale(1)} }
        @keyframes ms-crossFloat  { 0%{transform:translate(0,0) rotate(0deg) scale(1)} 33%{transform:translate(-25px,20px) rotate(120deg) scale(1.2)} 66%{transform:translate(15px,-15px) rotate(240deg) scale(0.8)} 100%{transform:translate(0,0) rotate(360deg) scale(1)} }
        @keyframes ms-circleFloat { 0%{transform:translate(0,0) scale(0.88)} 33%{transform:translate(20px,-25px) scale(2)} 66%{transform:translate(-15px,15px) scale(1.5)} 100%{transform:translate(0,0) scale(0.88)} }
        @keyframes ms-triFloat    { 0%{transform:translate(0,0) rotate(0deg) scale(1)} 50%{transform:translate(-20px,-30px) rotate(180deg) scale(1.2)} 100%{transform:translate(0,0) rotate(360deg) scale(1)} }

        /* 捲軸樣式 */
        .vh-list::-webkit-scrollbar { width:4px }
        .vh-list::-webkit-scrollbar-track { background: transparent }
        .vh-list::-webkit-scrollbar-thumb { background: ${dark ? '#555' : '#ccc'} }
        .vh-preview::-webkit-scrollbar { width:4px }
        .vh-preview::-webkit-scrollbar-track { background: transparent }
        .vh-preview::-webkit-scrollbar-thumb { background: ${dark ? '#555' : '#ccc'} }
      `}</style>

      {/* Backdrop (毛玻璃背景) */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 99990,
          background: dark ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
          backdropFilter: 'grayscale(100%) blur(4px)',
          transition: 'background 0.3s ease'
        }}
      />

      {/* Panel主容器 */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 99991,
          width: 'min(880px, 96vw)',
          height: 'min(640px, 92vh)',
          display: 'flex', flexDirection: 'column',
          animation: 'vhFadeIn 0.2s ease',
          overflow: 'hidden',
          backgroundColor: T.bg,
          border: `3px solid ${T.border}`,
          boxShadow: `8px 8px 0px ${dark ? '#3B5BDB' : '#4A6CF7'}`,
          
          /* 網格背景直接寫在這裡，完全比照 MemberSettings */
          backgroundImage: dark
            ? 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)'
            : 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          transition: 'background-color 0.3s ease, background-image 0.3s ease, border 0.3s ease'
        }}
      >
        {/* 渲染漂浮圖形*/}
        {renderShapes(shapes)}

        {/* ── Header ── */}
        <div style={{
          padding: '14px 20px', borderBottom: `3px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'transparent', flexShrink: 0, position: 'relative', zIndex: 1
        }}>
          <div>
            <div style={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', color: '#5e5eea', letterSpacing: '0.12em', fontWeight: 900, marginBottom: '4px' }}>
              [ VERSION HISTORY ]
            </div>
            <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '18px', color: T.text }}>
              {project.name || '專案'} 的變更記錄
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: T.text, fontWeight: 900, lineHeight: 1 }}
            onMouseEnter={e => e.currentTarget.style.color = '#FF3333'}
            onMouseLeave={e => e.currentTarget.style.color = T.text}
          >×</button>
        </div>

        {/* ── Save new version bar ── */}
        <div style={{
          padding: '10px 20px', borderBottom: `2px solid ${T.border}`,
          display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0,
          background: 'transparent', position: 'relative', zIndex: 1
        }}>
          <input
            value={saveMsg}
            onChange={e => setSaveMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveVersion() }}
            placeholder="版本備註（選填）…"
            style={{
              flex: 1, padding: '6px 10px', fontSize: '12px',
              background: dark ? '#1A1A1A' : '#F8F8F8',
              border: `2px solid ${T.border}`,
              color: T.text, fontFamily: '"Noto Sans TC", sans-serif', outline: 'none',
              fontWeight: 600
            }}
          />
          <button
            onClick={handleSaveVersion}
            disabled={saving}
            style={{
              fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
              fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '6px 16px', cursor: saving ? 'not-allowed' : 'pointer',
              background: '#00FF00', color: '#000',
              border: `2px solid ${T.border}`, boxShadow: `4px 4px 0 0 ${dark ? '#686868' : '#000'}`,
              opacity: saving ? 0.6 : 1, transition: 'all 0.15s', flexShrink: 0,
            }}
            onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? '#686868' : '#000'}` }}}
            onMouseLeave={e => { if (!saving) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `4px 4px 0 0 ${dark ? '#686868' : '#000'}` }}}
            onMouseDown={e => { if (!saving) { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = `2px 2px 0 0 ${dark ? '#686868' : '#000'}` }}}
            onMouseUp={e => { if (!saving) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `4px 4px 0 0 ${dark ? '#686868' : '#000'}` }}}
            onKeyDown={e => { if (!saving && (e.key === ' ' || e.key === 'Enter')) { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = `2px 2px 0 0 ${dark ? '#686868' : '#000'}` }}}
            onKeyUp={e => { if (!saving && (e.key === ' ' || e.key === 'Enter')) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `4px 4px 0 0 ${dark ? '#686868' : '#000'}` }}}
          >
            {saving ? '儲存中…' : '+ 儲存快照'}
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
          {/* Left: version list */}
          <div
            className="vh-list"
            style={{
              width: '300px', flexShrink: 0,
              borderRight: `2px solid ${T.border}`,
              overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px',
              padding: '12px', background: 'transparent'
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
              (() => {
                const isCurrentByData = isSameSnapshot(v.snapshot, currentData)
                const canRestore = !isCurrentByData
                return (
              <VersionCard
                key={v.id ?? i}
                version={v}
                isSelected={selectedVersion?.id === v.id}
                isCurrent={isCurrentByData}
                canRestore={canRestore}
                onSelect={setSelected}
                onRestore={(ver) => setConfirm(ver)}
                dark={dark}
                loading={restoring || isProcessing}
                
                // ▼▼▼ 這六行非常重要，沒有傳進去的話按鈕就不會顯示！ ▼▼▼
                editingId={editingId}
                editMsg={editMsg}
                setEditMsg={setEditMsg}
                onStartEdit={(ver) => { setEditingId(ver.id); setEditMsg(ver.message || '') }}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={() => setEditingId(null)}
                onStartDelete={(ver) => setConfirmDelete(ver)}
              />
                )
              })()
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

      {/* ── Confirm Delete Modal ── */}
      {confirmDelete && (
        <div
          onClick={() => !isProcessing && setConfirmDelete(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: dark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.25)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative', width: '360px', maxWidth: '92vw', padding: '28px',
              background: dark ? '#393939' : '#f8f9fa',
              border: `3px solid ${dark ? '#fff' : '#000'}`,
              boxShadow: `8px 8px 0 0 ${dark ? '#223fce' : '#7389dd'}`,
              backgroundImage: dark
                ? 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)'
                : 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              display: 'flex', flexDirection: 'column', gap: '20px',
            }}
          >
            {/* Header */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '12px', fontFamily: '"DM Mono", monospace', color: '#5e5eea', fontWeight: 900, letterSpacing: '1px', marginBottom: '4px' }}>[ CONFIRM ]</div>
                <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '20px', color: dark ? '#fff' : '#000' }}>刪除版本</div>
              </div>
            </div>

            {/* 訊息 */}
            <p style={{ position: 'relative', zIndex: 1, fontSize: '13px', color: dark ? '#ccc' : '#444', lineHeight: 1.6, fontWeight: 500, borderLeft: '3px solid #ff0000', paddingLeft: '12px', margin: 0 }}>
              此操作無法復原。<br />確定要刪除版本 <strong>{confirmDelete.message || formatTimestamp(confirmDelete.timestamp)}</strong> 嗎？
            </p>

            {/* 按鈕列 */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                disabled={isProcessing}
                onClick={() => setConfirmDelete(null)}
                style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 20px', background: 'transparent', color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', border: `2px solid ${dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}`, cursor: isProcessing ? 'not-allowed' : 'pointer', transition: 'all 0.1s' }}
                onMouseEnter={e => { if (!isProcessing) { e.currentTarget.style.borderColor = dark ? '#fff' : '#000'; e.currentTarget.style.color = dark ? '#fff' : '#000'; } }}
                onMouseLeave={e => { if (!isProcessing) { e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'; e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'; } }}
              >取消</button>
              <button
                disabled={isProcessing}
                onClick={handleDeleteVersion}
                style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 20px', background: '#ff0000', color: '#fff', border: '3px solid #ff0000', boxShadow: `4px 4px 0 0 ${dark ? '#686868' : '#000'}`, cursor: isProcessing ? 'not-allowed' : 'pointer', transition: 'all 0.15s', opacity: isProcessing ? 0.6 : 1 }}
                onMouseEnter={e => { if (!isProcessing) { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? '#686868' : '#000'}`; e.currentTarget.style.background = '#cc0000'; } }}
                onMouseLeave={e => { if (!isProcessing) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `4px 4px 0 0 ${dark ? '#686868' : '#000'}`; e.currentTarget.style.background = '#ff0000'; } }}
                onMouseDown={e => { if (!isProcessing) { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = '2px 2px 0 0 #000'; } }}
                onMouseUp={e => { if (!isProcessing) { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? '#686868' : '#000'}`; } }}
              >{isProcessing ? '刪除中...' : '確認刪除'}</button>
            </div>
          </div>
        </div>
      )}

    </>,
    document.body
  )
}