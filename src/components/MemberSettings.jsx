import { useState } from 'react'

// ─── DESIGN TOKENS (與 BrutalistBackground 同步) ─────────────────────────
const ACCENT_BLUE   = "#4e4ee3";
const ACCENT_PINK   = "#FF00FF";
const ACCENT_YELLOW = "#FFFF00";
const ACCENT_GREEN  = "#00FF00";

/**
 * MemberSettings — 負責人管理面板 (Brutalist Edition)
 *
 * props:
 * members    - string[]           目前的負責人列表
 * onChange   - (members) => void  更新列表
 * onClose    - () => void
 * darkMode   - boolean
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
      {/* ─── Brutalist Backdrop ─── */}
      <div
        style={{ 
          position: 'fixed', inset: 0, 
          background: darkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)', 
          backdropFilter: 'grayscale(100%) blur(4px)', 
          zIndex: 600,
          transition: "background 0.3s ease"
        }}
        onClick={onClose}
      />

      {/* ─── Brutalist Dialog ─── */}
      <div style={{ 
        ...D.dialog, 
        backgroundColor: T.bg, 
        border: `3px solid ${T.border}`,
        boxShadow: `8px 8px 0px ${(darkMode ? "#223fce" : "#7389dd")}`, // 粗獷主義標誌性的硬陰影
        backgroundImage: darkMode 
          ? "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)"
          : "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)",
        backgroundSize: "20px 20px", // 針對面板縮小的網格
        transition: "background-color 0.3s ease, background-image 0.3s ease, border 0.3s ease"
      }}>
        
        {/* ─── 面板專屬背景浮水印 ─── */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
          display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden"
        }}>
          <h2 style={{
            transform: "rotate(-10deg)",
            opacity: 0.04,
            fontSize: "120px",
            fontWeight: 900,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            margin: 0,
            fontFamily: '"Space Grotesk", sans-serif',
            color: T.text,
            transition: "color 0.3s ease"
          }}>
            MEMBERS
          </h2>
        </div>

        {/* Header */}
        <div style={{ ...D.header, position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: '12px', fontFamily: '"DM Mono", monospace', color: ACCENT_BLUE, fontWeight: 900, letterSpacing: '1px', marginBottom: '4px' }}>
              [ SETTINGS ]
            </div>
            <div style={{ fontFamily: '"Space Grotesk", "Syne", sans-serif', fontWeight: 900, fontSize: '20px', color: T.text }}>
              負責人管理
            </div>
          </div>
          <button
            style={{ background: 'none', border: 'none', color: T.text, cursor: 'pointer', fontSize: '20px', padding: '4px', fontWeight: 900 }}
            onClick={onClose}
            onMouseEnter={e => { e.currentTarget.style.color = '#c96e6e';}}
            onMouseLeave={e => { e.currentTarget.style.color = T.text;}}
          >✕</button>
        </div>

        <p style={{ position: 'relative', zIndex: 1, fontSize: '13px', color: T.textSub, lineHeight: 1.6, marginBottom: '20px', fontWeight: 500 }}>
          新增專案成員後，可在各 MD 定量指標與 MP 檢核步驟的負責人欄位中選取。
        </p>

        {/* Add input */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            style={{ ...D.input, background: T.inputBg, border: `2px solid ${T.border}`, color: T.text, flex: 1 }}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={handleKey}
            placeholder="輸入成員姓名後按 Enter 新增…"
            autoFocus
          />
          <button
            style={{ 
              ...D.addBtn, 
              ...(inputVal.trim() 
                ? { background: ACCENT_GREEN, color: '#000', border: `2px solid ${T.border}` } 
                : { background: T.altBg, color: T.textMuted, border: `2px dashed ${T.border}`, opacity: 0.5, cursor: 'not-allowed' }) 
            }}
            onClick={addMember}
            disabled={!inputVal.trim()}
          >
            + ADD
          </button>
        </div>

        {/* Member list */}
        <div style={{ ...D.list, position: 'relative', zIndex: 1, borderColor: T.border, backgroundColor: T.bg }}>
          {members.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: T.textMuted, fontSize: '13px', fontFamily: '"DM Mono", monospace', fontWeight: 600 }}>
              NO MEMBERS FOUND.
            </div>
          ) : (
            members.map((m, idx) => (
              <div key={idx} style={{ ...D.memberRow, borderBottomColor: T.border, background: idx % 2 === 1 ? T.altBg : 'transparent' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>👤</span>

                {editingIdx === idx ? (
                  <input
                    style={{ ...D.editInput, background: T.inputBg, border: `2px solid ${ACCENT_BLUE}`, color: T.text, flex: 1 }}
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onKeyDown={e => handleEditKey(e, idx)}
                    autoFocus
                  />
                ) : (
                  <span style={{ flex: 1, fontSize: '14px', color: T.text, fontWeight: 700, fontFamily: '"Noto Sans TC", "Space Grotesk", sans-serif' }}>
                    {m}
                  </span>
                )}

                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {editingIdx === idx ? (
                    <>
                      <button style={{ ...D.iconBtn, background: ACCENT_GREEN, border: '2px solid #000', color: '#000' }} onClick={() => confirmEdit(idx)}>✓</button>
                      <button style={{ ...D.iconBtn, background: T.bg, border: `2px solid ${T.textMuted}`, color: T.textMuted }} onClick={() => setEditingIdx(null)}>✕</button>
                    </>
                  ) : (
                    <>
                      <button
                        style={{ ...D.iconBtn, background: 'transparent', border: `2px solid ${T.textMuted}`, color: T.textMuted, transition: 'all 0.15s' }}
                        onClick={() => startEdit(idx)}
                        title="編輯"
                        onMouseEnter={e => { e.currentTarget.style.background = '#FFFF00'; e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.color = '#000'; e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '3px 3px 0 0 #000'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = T.textMuted; e.currentTarget.style.color = T.textMuted; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                        onMouseDown={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = '1px 1px 0 0 #000'; }}
                        onMouseUp={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '3px 3px 0 0 #000'; }}
                      >✏</button>
                      <button
                        style={{ ...D.iconBtn, background: 'transparent', border: `2px solid ${ACCENT_PINK}`, color: ACCENT_PINK, transition: 'all 0.15s' }}
                        onClick={() => removeMember(idx)}
                        title="移除"
                        onMouseEnter={e => { e.currentTarget.style.background = ACCENT_PINK; e.currentTarget.style.color = '#000'; e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `3px 3px 0 0 #000`; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = ACCENT_PINK; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                        onMouseDown={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = '1px 1px 0 0 #000'; }}
                        onMouseUp={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `3px 3px 0 0 #000`; }}
                      >✕</button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            style={{ ...D.closeBtn, background: ACCENT_YELLOW, color: '#000', border: `3px solid ${(darkMode ? "#a9a9a9" : "#000")}`, fontWeight: 900, boxShadow: `4px 4px 0 0 ${(darkMode ? "#686868" : "#000")}`, transition: 'all 0.15s' }}
            onClick={onClose}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${(darkMode ? "#686868" : "#000")}`; e.currentTarget.style.background = darkMode ? "#223fce" : "#7389dd"; e.currentTarget.style.color = ACCENT_YELLOW; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `4px 4px 0 0 ${(darkMode ? "#686868" : "#000")}`; e.currentTarget.style.background = ACCENT_YELLOW; e.currentTarget.style.color = '#000'; }}
            onMouseDown={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = '2px 2px 0 0 #000'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '6px 6px 0 0 #000'; }}
          >
            DONE
          </button>
        </div>
      </div>
    </>
  )
}

// ─── BRUTALIST THEME COLORS ─────────────────────────────────────────────────
const DARK = {
  bg: '#393939', border: '#FFFFFF', text: '#FFFFFF', textSub: '#CCCCCC',
  textMuted: '#888888', inputBg: '#000000', altBg: 'rgba(255,255,255,0.06)'
}
const LIGHT = {
  bg: '#f8f9fa', border: '#000000', text: '#000000', textSub: '#444444',
  textMuted: '#666666', inputBg: '#FFFFFF', altBg: 'rgba(0,0,0,0.04)'
}

// ─── STYLES (去圓角、粗邊框) ──────────────────────────────────────────────────
const D = {
  dialog: {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '480px', maxWidth: '92vw',
    borderRadius: '0', // 移除圓角
    padding: '28px',
    zIndex: 601,
    animation: 'scaleIn 0.18s ease',
    maxHeight: '80vh', display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '12px', flexShrink: 0,
  },
  input: {
    borderRadius: '0', padding: '9px 12px', // 移除圓角
    fontFamily: '"Space Grotesk", "Noto Sans TC", sans-serif', fontSize: '14px', fontWeight: 600,
    outline: 'none',
  },
  editInput: {
    borderRadius: '0', padding: '4px 8px', // 移除圓角
    fontFamily: '"Space Grotesk", "Noto Sans TC", sans-serif', fontSize: '13px', fontWeight: 600,
    outline: 'none',
  },
  addBtn: {
    padding: '9px 16px', borderRadius: '0', // 移除圓角
    fontFamily: '"Space Grotesk", "Noto Sans TC", sans-serif', fontSize: '14px', fontWeight: 900,
    cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
  },
  list: {
    flex: 1, overflowY: 'auto',
    border: '2px solid', // 加粗邊框
    borderRadius: '0', // 移除圓角
  },
  memberRow: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 14px',
    borderBottom: '2px solid', // 加粗邊框
    transition: 'background 0.12s',
  },
  iconBtn: {
    padding: '4px 8px', borderRadius: '0', // 移除圓角
    cursor: 'pointer', fontSize: '11px',
    fontWeight: 900, transition: 'all 0.15s',
  },
  closeBtn: {
    padding: '9px 32px', borderRadius: '0', // 移除圓角
    fontFamily: '"Space Grotesk", "Noto Sans TC", sans-serif', fontSize: '14px',
    cursor: 'pointer', letterSpacing: '1px',
    boxShadow: '4px 4px 0px rgba(0,0,0,0.2)' // 按鈕也加上小硬陰影
  },
}