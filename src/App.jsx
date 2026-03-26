import { useState, useEffect, useCallback } from 'react'
import { api } from './services/api.js'
import ProjectList from './components/ProjectList.jsx'
import OgsmEditor from './components/OgsmEditor.jsx'
import GenerateModal from './components/GenerateModal.jsx'
import AuditPanel from './components/AuditPanel.jsx'
import MemberSettings from './components/MemberSettings.jsx'

export default function App() {
  const [projects, setProjects]       = useState([])
  const [activeId, setActiveId]       = useState(null)
  const [activeProject, setActiveProject] = useState(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [auditProject, setAuditProject] = useState(null)
  const [toast, setToast]             = useState(null)
  const [darkMode, setDarkMode]         = useState(true)
  const [members, setMembers]           = useState([])
  const [showMemberSettings, setShowMemberSettings] = useState(false)

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleMembersChange = useCallback(async (newMembers) => {
    setMembers(newMembers)
    try {
      await api.saveMembers(newMembers)
    } catch (e) {
      showToast('負責人儲存失敗：' + e.message, 'error')
    }
  }, [showToast])

  // 載入清單
  const loadList = useCallback(async () => {
    try {
      setLoadingList(true)
      const data = await api.getAll()
      setProjects(data)
      // 背景補抓完整巢狀資料，用於前端計算進度
      Promise.allSettled(data.map(p => api.getById(p.id))).then(results => {
        setProjects(prev => prev.map((p, i) =>
          results[i].status === 'fulfilled' ? results[i].value : p
        ))
      })
    } catch (e) {
      showToast('無法載入專案清單：' + e.message, 'error')
    } finally {
      setLoadingList(false)
    }
  }, [showToast])

  // 載入負責人清單
  useEffect(() => {
    api.getMembers().then(setMembers).catch(() => {})
  }, [])

  useEffect(() => { loadList() }, [loadList])

  // 選取專案，載入完整內容
  const selectProject = useCallback(async (id) => {
    if (id === activeId) return
    setActiveId(id)
    setActiveProject(null)
    setLoadingDetail(true)
    try {
      const data = await api.getById(id)
      setActiveProject(data)
    } catch (e) {
      showToast('載入失敗：' + e.message, 'error')
    } finally {
      setLoadingDetail(false)
    }
  }, [activeId, showToast])

  // 儲存更新
  const handleSave = useCallback(async (updated) => {
    try {
      const saved = await api.update(updated.id, updated)
      setActiveProject(saved)
      setProjects(ps => ps.map(p => p.id === saved.id ? saved : p))
      showToast('已儲存')
    } catch (e) {
      showToast('儲存失敗：' + e.message, 'error')
    }
  }, [showToast])

  // 刪除
  const handleDelete = useCallback(async (id) => {
    if (!confirm('確定要刪除這個 OGSM 嗎？')) return
    try {
      await api.delete(id)
      setProjects(ps => ps.filter(p => p.id !== id))
      if (activeId === id) { setActiveId(null); setActiveProject(null) }
      showToast('已刪除')
    } catch (e) {
      showToast('刪除失敗：' + e.message, 'error')
    }
  }, [activeId, showToast])

  // AI 生成完成
  const handleGenerated = useCallback((project) => {
    setProjects(ps => [project, ...ps])
    setActiveId(project.id)
    setActiveProject(project)
    setShowGenerate(false)
    showToast('OGSM 已生成！')
  }, [showToast])

  return (
    <>
      <style>{globalStyles}</style>
<div className={`app-shell${darkMode ? '' : ' light-mode'}`}>

        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div
            className="sidebar-header"
            onClick={() => { setActiveId(null); setActiveProject(null) }}
            style={{ cursor: 'pointer' }}
            title="回到首頁"
          >
            <div className="logo-mark">OS</div>
            <div className="logo-text">
              <span className="logo-title">OGSM</span>
              <span className="logo-sub">策略規劃工具</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '16px 14px 8px' }}>
            <button className="btn-generate btn-generate--flex" onClick={() => setShowGenerate(true)}>
              <span className="btn-generate-icon">⚡</span>
              AI 生成 OGSM
            </button>
            <button className="btn-members" onClick={() => setShowMemberSettings(true)} title="管理負責人">
              👥
              {members.length > 0 && <span className="members-count">{members.length}</span>}
            </button>
          </div>

          <ProjectList
            projects={projects}
            loading={loadingList}
            activeId={activeId}
            onSelect={selectProject}
            onDelete={handleDelete}
            darkMode={darkMode}
          />

          <div className="sidebar-footer">
            <span className="powered-by">Powered by AI</span>
            <button
              className="theme-toggle"
              onClick={() => setDarkMode(d => !d)}
              title={darkMode ? '切換至明亮模式' : '切換至暗黑模式'}
            >
              {darkMode ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="main-content">
          {loadingDetail ? (
            <div className="empty-state">
              <div className="spinner" />
              <p>載入中…</p>
            </div>
          ) : activeProject ? (
            <OgsmEditor project={activeProject} onSave={handleSave} onAudit={setAuditProject} members={members} onMembersChange={handleMembersChange} darkMode={darkMode} />
          ) : (
            <div className="empty-state">
              <div className="empty-icon">◈</div>
              <h2>選擇或建立 OGSM</h2>
              <p>從左側選取專案，或點擊「AI 生成 OGSM」開始</p>
              <button className="btn-generate-hero" onClick={() => setShowGenerate(true)}>
                ⚡ 以 AI 生成新的 OGSM
              </button>
            </div>
          )}
        </main>

        {/* ── Member Settings ── */}
        {showMemberSettings && (
          <MemberSettings
            members={members}
            onChange={handleMembersChange}
            onClose={() => setShowMemberSettings(false)}
            darkMode={darkMode}
          />
        )}

        {/* ── Generate Modal ── */}
        {showGenerate && (
          <GenerateModal
            onClose={() => setShowGenerate(false)}
            onGenerated={handleGenerated}
            showToast={showToast}
          />
        )}

        {/* ── Audit Panel ── */}
        {auditProject && (
          <AuditPanel project={auditProject} onClose={() => setAuditProject(null)} darkMode={darkMode} />
        )}

        {/* ── Toast ── */}
        {toast && (
          <div className={`toast toast--${toast.type}`}>
            {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
          </div>
        )}
      </div>
    </>
  )
}

const globalStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg-base:     #0f1117;
    --bg-surface:  #161b27;
    --bg-elevated: #1e2535;
    --bg-hover:    #252d3d;
    --border:      #2a3347;
    --border-light:#334060;
    --accent:      #f0a500;
    --accent-dim:  #c07e00;
    --accent-glow: rgba(240,165,0,0.15);
    --text-primary:#e8ecf4;
    --text-secondary:#8a95ae;
    --text-muted:  #4a5568;
    --red:         #e05252;
    --green:       #4caf7d;
    --font-display:"Syne", sans-serif;
    --font-body:   "Noto Sans TC", sans-serif;
    --font-mono:   "DM Mono", monospace;
    --radius:      6px;
    --radius-lg:   12px;
  }

  html, body, #root { height: 100%; }

  body {
    font-family: var(--font-body);
    background: var(--bg-base);
    color: var(--text-primary);
    font-size: 14px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  /* 隱藏 number input 的上下箭頭 */
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
  }

  .app-shell {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  /* ── Sidebar ── */
  .sidebar {
    width: 260px;
    min-width: 260px;
    background: var(--bg-surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 24px 20px 20px;
    border-bottom: 1px solid var(--border);
  }

  .logo-mark {
    width: 36px; height: 36px;
    background: var(--accent);
    color: #000;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: 13px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 4px;
    letter-spacing: 0.5px;
    flex-shrink: 0;
  }

  .logo-text { display: flex; flex-direction: column; line-height: 1.2; }
  .logo-title {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 16px;
    color: var(--text-primary);
    letter-spacing: 1px;
  }
  .logo-sub { font-size: 10px; color: #d4a855; letter-spacing: 0.5px; font-weight: 500; }

  .btn-generate {
    padding: 10px 14px;
    background: var(--accent);
    color: #000;
    border: none;
    border-radius: var(--radius);
    font-family: var(--font-body);
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.15s, transform 0.1s;
    letter-spacing: 0.3px;
  }
  .btn-generate--flex { flex: 1; }
  .btn-generate:hover { background: #ffc233; transform: translateY(-1px); }
  .btn-generate:active { transform: translateY(0); }
  .btn-generate-icon { font-size: 15px; }

  .btn-members {
    padding: 0;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    position: relative;
  }
  .btn-members:hover { border-color: var(--border-light); color: var(--text-primary); background: var(--bg-hover); }
  .members-count {
    position: absolute;
    top: -5px;
    right: -5px;
    background: var(--accent);
    color: #000;
    font-size: 9px;
    font-family: var(--font-mono);
    font-weight: 700;
    padding: 1px 4px;
    border-radius: 99px;
    min-width: 16px;
    text-align: center;
    line-height: 1.4;
  }

  .sidebar-footer {
    padding: 14px 20px;
    border-top: 1px solid var(--border);
    font-size: 10px;
    color: var(--text-muted);
    font-family: var(--font-mono);
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .powered-by {
    font-size: 11px;
    font-family: var(--font-mono);
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    background: linear-gradient(90deg, #a78bfa, #c084fc, #e879f9);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 0 4px rgba(192,132,252,0.45));
  }

  .theme-toggle {
    background: rgba(139,92,246,0.18);
    border: 1.5px solid rgba(192,132,252,0.55);
    border-radius: 6px;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    color: #c084fc;
    transition: background 0.2s, border-color 0.2s, transform 0.1s, box-shadow 0.2s, color 0.2s;
    flex-shrink: 0;
    box-shadow: 0 0 8px rgba(139,92,246,0.35);
  }
  .theme-toggle:hover {
    background: rgba(139,92,246,0.32);
    border-color: rgba(192,132,252,0.9);
    color: #e0aaff;
    transform: scale(1.12);
    box-shadow: 0 0 14px rgba(192,132,252,0.6);
  }
  .theme-toggle:active { transform: scale(0.96); }

  /* ── Main content ── */
  .main-content {
    flex: 1;
    overflow-y: auto;
    background: var(--bg-base);
  }

  /* ── Empty / loading state ── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 16px;
    color: var(--text-secondary);
    text-align: center;
    padding: 40px;
  }
  .empty-icon {
    font-size: 56px;
    color: var(--border-light);
    line-height: 1;
    margin-bottom: 8px;
  }
  .empty-state h2 {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
  }
  .empty-state p { color: var(--text-secondary); max-width: 300px; }

  .btn-generate-hero {
    margin-top: 8px;
    padding: 12px 24px;
    background: transparent;
    border: 1.5px solid var(--accent);
    color: var(--accent);
    border-radius: var(--radius);
    font-family: var(--font-body);
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .btn-generate-hero:hover { background: var(--accent); color: #000; }

  /* ── Spinner ── */
  .spinner {
    width: 32px; height: 32px;
    border: 2.5px solid var(--border-light);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Toast ── */
  .toast {
    position: fixed;
    bottom: 28px; right: 28px;
    padding: 12px 20px;
    border-radius: var(--radius);
    font-size: 13px;
    font-weight: 500;
    z-index: 9999;
    animation: slideUp 0.25s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    backdrop-filter: blur(8px);
  }
  .toast--success {
    background: rgba(76,175,125,0.15);
    border: 1px solid var(--green);
    color: var(--green);
  }
  .toast--error {
    background: rgba(224,82,82,0.15);
    border: 1px solid var(--red);
    color: var(--red);
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Modal backdrop ── */
  .modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(4px);
    z-index: 500;
    display: flex; align-items: center; justify-content: center;
    animation: fadeIn 0.2s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .modal {
    background: var(--bg-surface);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
    padding: 32px;
    width: 520px;
    max-width: 90vw;
    animation: scaleIn 0.2s ease;
    box-shadow: 0 24px 80px rgba(0,0,0,0.5);
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.96); }
    to   { opacity: 1; transform: scale(1); }
  }

  /* ── Shared form styles ── */
  .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
  .field label {
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--text-muted);
    letter-spacing: 0.8px;
    text-transform: uppercase;
  }
  .field input,
  .field textarea {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 14px;
    padding: 10px 12px;
    outline: none;
    resize: vertical;
    transition: border-color 0.15s;
  }
  .field input:focus,
  .field textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }
  .field textarea { min-height: 88px; }

  /* ── Buttons ── */
  .btn { 
    padding: 9px 18px;
    border-radius: var(--radius);
    border: none;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .btn-primary { background: var(--accent); color: #000; }
  .btn-primary:hover { background: #ffc233; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-ghost {
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border);
  }
  .btn-ghost:hover { border-color: var(--border-light); color: var(--text-primary); }
  .btn-danger { background: transparent; color: var(--red); border: 1px solid transparent; }
  .btn-danger:hover { border-color: var(--red); background: rgba(224,82,82,0.1); }
  
  /* ── Audit Panel Goal Header Hover ── */
  div[data-role="goal-header"]:hover {
    background: rgba(42, 51, 71, 0.3);
  }

  /* ── Light Mode ── */
  .light-mode {
    --bg-base:       #eef2f8;
    --bg-surface:    #ffffff;
    --bg-elevated:   #f3f7fd;
    --bg-hover:      #e4ecf7;
    --border:        #c8d4e8;
    --border-light:  #aabace;
    --accent:        #cc7700;
    --accent-dim:    #995500;
    --accent-glow:   rgba(204,119,0,0.15);
    --text-primary:  #1a2133;
    --text-secondary:#445069;
    --text-muted:    #7a8ca8;
    --red:           #c73030;
    --green:         #1a7d4d;
  }
  .light-mode { color: var(--text-primary); }
  .light-mode .sidebar { background: var(--bg-surface); border-right-color: var(--border); }
  .light-mode .sidebar-header { border-bottom-color: var(--border); }
  .light-mode .main-content { background: var(--bg-base); }
  .light-mode .logo-title { color: var(--text-primary); }
  .light-mode .logo-sub { color: #9a6000; }
  .light-mode .logo-mark { box-shadow: 0 2px 8px rgba(204,119,0,0.25); }
  .light-mode .btn-generate { color: #000; box-shadow: 0 2px 8px rgba(204,119,0,0.2); }
  .light-mode .btn-generate:hover { background: #e08800; }
  .light-mode .theme-toggle { background: var(--bg-elevated); border-color: var(--border); color: var(--text-secondary); }
  .light-mode .theme-toggle:hover { background: var(--bg-hover); border-color: var(--border-light); }
  .light-mode .modal {
    background: var(--bg-surface);
    border-color: var(--border-light);
    box-shadow: 0 24px 80px rgba(60,80,120,0.15);
  }
  .light-mode .modal-backdrop { background: rgba(60,80,120,0.35); }
  .light-mode .field input,
  .light-mode .field textarea {
    background: var(--bg-elevated);
    border-color: var(--border);
    color: var(--text-primary);
  }
  .light-mode .field label { color: var(--text-muted); }
  .light-mode .btn-ghost { color: var(--text-secondary); border-color: var(--border); }
  .light-mode .btn-ghost:hover { color: var(--text-primary); border-color: var(--border-light); }
  .light-mode .btn-primary:hover { background: #e08800; }
  .light-mode .btn-primary:disabled { opacity: 0.45; }
  .light-mode .spinner { border-color: var(--border-light); border-top-color: var(--accent); }
  .light-mode .empty-icon { color: var(--border-light); }
  .light-mode .empty-state h2 { color: var(--text-primary); }
  .light-mode .empty-state p { color: var(--text-secondary); }
  .light-mode .btn-generate-hero { border-color: var(--accent); color: var(--accent); }
  .light-mode .btn-generate-hero:hover { background: var(--accent); color: #fff; }
  .light-mode .toast--success {
    background: rgba(26,125,77,0.10);
    border-color: var(--green);
    color: var(--green);
  }
  .light-mode .toast--error {
    background: rgba(199,48,48,0.10);
    border-color: var(--red);
    color: var(--red);
  }
  .light-mode select option { background: #ffffff; color: #1a2133; }
  .light-mode div[data-role="goal-header"]:hover { background: rgba(200,212,232,0.35); }
`