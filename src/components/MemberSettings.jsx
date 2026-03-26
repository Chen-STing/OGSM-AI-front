import { useState } from 'react'

/**
 * MemberSettings — 負責人管理面板
 *
 * props:
 *   members    - string[]           目前的負責人列表
 *   onChange   - (members) => void  更新列表
 *   onClose    - () => void
 *   darkMode   - boolean
 */
export default function MemberSettings({ members = [], onChange, onClose, darkMode = true }) {
  const [inputVal, setInputVal] = useState('')
  const [editingIdx, setEditingIdx] = useState(null)
  const [editVal, setEditVal] = useState('')

  const T = darkMode ? DARK : LIGHT

  const addMember = () => {
    const name = inputVal.trim()
    if (!name || members.includes(name)) return
    onChange([...members, name])
    setInputVal('')
  }

  const removeMember = (idx) => {
    onChange(members.filter((_, i) => i !== idx))
    if (editingIdx === idx) setEditingIdx(null)
  }

  const startEdit = (idx) => {
    setEditingIdx(idx)
    setEditVal(members[idx])
  }

  const confirmEdit = (idx) => {
    const name = editVal.trim()
    if (!name) return
    const next = [...members]
    next[idx] = name
    onChange(next)
    setEditingIdx(null)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') addMember()
    if (e.key === 'Escape') onClose()
  }

  const handleEditKey = (e, idx) => {
    if (e.key === 'Enter') confirmEdit(idx)
    if (e.key === 'Escape') setEditingIdx(null)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', zIndex: 600 }}
        onClick={onClose}
      />

      {/* Dialog */}
      <div style={{ ...D.dialog, background: T.bg, border: `1px solid ${T.border}` }}>

        {/* Header */}
        <div style={D.header}>
          <div>
            <div style={{ fontSize: '10px', fontFamily: '"DM Mono", monospace', color: '#d4a855', letterSpacing: '0.8px', marginBottom: '4px' }}>
              SETTINGS
            </div>
            <div style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, fontSize: '17px', color: T.text }}>
              👥 負責人管理
            </div>
          </div>
          <button
            style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: '16px', padding: '4px' }}
            onClick={onClose}
          >✕</button>
        </div>

        <p style={{ fontSize: '13px', color: T.textSub, lineHeight: 1.6, marginBottom: '20px' }}>
          新增專案成員後，可在各 MD 定量指標與 MP 檢核步驟的負責人欄位中選取。
        </p>

        {/* Add input */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            style={{ ...D.input, background: T.inputBg, border: `1px solid ${T.border}`, color: T.text, flex: 1 }}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={handleKey}
            placeholder="輸入成員姓名後按 Enter 新增…"
            autoFocus
          />
          <button
            style={{ ...D.addBtn, ...(inputVal.trim() ? D.addBtnActive : { opacity: 0.4, cursor: 'not-allowed' }) }}
            onClick={addMember}
            disabled={!inputVal.trim()}
          >
            + 新增
          </button>
        </div>

        {/* Member list */}
        <div style={{ ...D.list, borderColor: T.border }}>
          {members.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: T.textMuted, fontSize: '12px', fontFamily: '"DM Mono", monospace' }}>
              尚無成員，請先新增
            </div>
          ) : (
            members.map((m, idx) => (
              <div key={idx} style={{ ...D.memberRow, borderBottomColor: T.border, background: idx % 2 === 1 ? T.altBg : 'transparent' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>👤</span>

                {editingIdx === idx ? (
                  <input
                    style={{ ...D.editInput, background: T.inputBg, border: `1px solid #f0a500`, color: T.text, flex: 1 }}
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onKeyDown={e => handleEditKey(e, idx)}
                    autoFocus
                  />
                ) : (
                  <span style={{ flex: 1, fontSize: '13px', color: T.text, fontFamily: '"Noto Sans TC", sans-serif' }}>
                    {m}
                  </span>
                )}

                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {editingIdx === idx ? (
                    <>
                      <button style={{ ...D.iconBtn, background: 'rgba(76,175,125,0.15)', border: '1px solid rgba(76,175,125,0.35)', color: '#4caf7d' }} onClick={() => confirmEdit(idx)}>✓</button>
                      <button style={{ ...D.iconBtn, background: T.btnBg, border: `1px solid ${T.border}`, color: T.textMuted }} onClick={() => setEditingIdx(null)}>✕</button>
                    </>
                  ) : (
                    <>
                      <button style={{ ...D.iconBtn, background: T.btnBg, border: `1px solid ${T.border}`, color: T.textMuted }} onClick={() => startEdit(idx)} title="編輯">✏</button>
                      <button className="ogsm-remove-btn" style={{ ...D.iconBtn, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }} onClick={() => removeMember(idx)} title="移除">✕</button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            style={{ ...D.closeBtn, background: '#f0a500', color: '#000', border: 'none', fontWeight: 700 }}
            onClick={onClose}
          >
            完成
          </button>
        </div>
      </div>
    </>
  )
}

const DARK = {
  bg: '#161b27', border: '#334060', text: '#e8ecf4', textSub: '#b0bac9',
  textMuted: '#8a95ae', inputBg: '#1e2535', altBg: 'rgba(255,255,255,0.02)',
  btnBg: 'rgba(138,149,174,0.08)',
}
const LIGHT = {
  bg: '#ffffff', border: '#d1d9e8', text: '#1a2133', textSub: '#445069',
  textMuted: '#8a9ab8', inputBg: '#f3f7fd', altBg: 'rgba(0,0,0,0.02)',
  btnBg: 'rgba(0,0,0,0.04)',
}

const D = {
  dialog: {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '480px', maxWidth: '92vw',
    borderRadius: '12px', padding: '28px',
    zIndex: 601,
    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
    animation: 'scaleIn 0.18s ease',
    maxHeight: '80vh', display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '12px', flexShrink: 0,
  },
  input: {
    borderRadius: '6px', padding: '9px 12px',
    fontFamily: '"Noto Sans TC", sans-serif', fontSize: '13px',
    outline: 'none',
  },
  editInput: {
    borderRadius: '4px', padding: '4px 8px',
    fontFamily: '"Noto Sans TC", sans-serif', fontSize: '13px',
    outline: 'none',
  },
  addBtn: {
    padding: '9px 16px', borderRadius: '6px', border: 'none',
    fontFamily: '"Noto Sans TC", sans-serif', fontSize: '13px',
    cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
    background: 'rgba(240,165,0,0.15)', color: '#f0a500',
    border: '1px solid rgba(240,165,0,0.35)',
  },
  addBtnActive: {
    background: '#f0a500', color: '#000', border: 'none', fontWeight: 700,
  },
  list: {
    flex: 1, overflowY: 'auto',
    border: '1px solid',
    borderRadius: '8px', overflow: 'hidden',
  },
  memberRow: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 14px',
    borderBottom: '1px solid',
    transition: 'background 0.12s',
  },
  iconBtn: {
    padding: '4px 8px', borderRadius: '4px',
    cursor: 'pointer', fontSize: '11px',
    fontWeight: 600, transition: 'all 0.15s',
  },
  closeBtn: {
    padding: '9px 24px', borderRadius: '6px',
    fontFamily: '"Noto Sans TC", sans-serif', fontSize: '13px',
    cursor: 'pointer',
  },
}