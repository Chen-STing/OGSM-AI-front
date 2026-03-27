import { useState, useEffect, useCallback, useRef } from "react";
import { Zap, Users, Sun, Moon, PanelLeftClose, Menu } from 'lucide-react';
import HomePage from './components/HomePage.jsx';
import SwitchHome from './components/SwitchHome.jsx';
import ProjectList, { calcProgress } from './components/ProjectList.jsx';
import OgsmEditor from './components/OgsmEditor.jsx';
import GenerateModal from './components/GenerateModal.jsx';
import MemberSettings from './components/MemberSettings.jsx';
import AuditPanel from './components/AuditPanel.jsx';
import BrutalistBackground from './components/BrutalistBackground.jsx'; 

// ─── VIBRANT BRUTALIST DESIGN TOKENS & CSS ──────────────────────────────────
const ACCENT_BLUE   = "#0000FF";
const ACCENT_PINK   = "#FF00FF";
const ACCENT_YELLOW = "#FFFF00";
const ACCENT_GREEN  = "#00FF00";

const BRUTALIST_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;900&family=Inter:wght@400;700;900&family=Noto+Sans+TC:wght@400;700;900&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --bg-light: #f8f9fa; --bg-dark: #121212; }
  html, body, #root { height: 100%; }
  body { font-family: "Inter", "Noto Sans TC", ui-sans-serif, sans-serif; background: var(--bg-light); color: #000; font-size: 14px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
  .dark body { background: var(--bg-dark); color: #fff; }
  a, button, [role="button"], .cursor-pointer { cursor: pointer; }
  input[type="text"], input[type="date"], textarea, select { cursor: text; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes click-burst { 0% { transform: scale(0); opacity: 1; } 100% { transform: scale(4); opacity: 0; } }
  @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .animate-click-burst { animation: click-burst 0.5s ease-out forwards; }
  .animate-slide-up { animation: slide-up 0.8s cubic-bezier(0.16,1,0.3,1) both; }
  .animate-scale-in { animation: scale-in 0.2s ease; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
  .dark ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); }

  /* Hover Effects for Brutalist Buttons */
  .b-action-hover:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 0 #000 !important; }
  .b-action-hover:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0 0 #000 !important; }
  .dark .b-action-hover:hover { box-shadow: 6px 6px 0 0 #fff !important; }
  .dark .b-action-hover:active { box-shadow: 2px 2px 0 0 #fff !important; }
`;

function EmptyState({ onNewProject, dark }) { return null; }
function Toast({ toast }) { return null; }
function ClickBurst({ x, y, id }) { return null; }

export default function App() {
  const [page, setPage] = useState("home");
  const [dark, setDark] = useState(false);
  const [projects, setProjects] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [members, setMembers] = useState([]);
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [showGenerate, setShowGenerate] = useState(false);
  const [showMembers, setShowMembers]   = useState(false);
  const [showAudit, setShowAudit]       = useState(false);
  const [auditProject, setAuditProject] = useState(null);
  const [toast, setToast] = useState(null);
  const [clickEffect, setClickEffect] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    import("./services/api.js").then(({ api }) => {
      api.getAll().then(data => {
        setProjects(data);
        setLoadingList(false);
        Promise.allSettled(data.map(p => api.getById(p.id))).then(results => {
          setProjects(prev => prev.map((p, i) => results[i].status === "fulfilled" ? results[i].value : p));
        });
      }).catch(() => setLoadingList(false));
      api.getMembers().then(setMembers).catch(() => {});
    });
  }, []);

  const selectProject = useCallback(async (id) => {
    if (id === activeId && page === "editor") return;
    setActiveId(id); setActiveProject(null); setLoadingDetail(true); setPage("editor");
    try {
      const { api } = await import("./services/api.js");
      const data = await api.getById(id);
      setActiveProject(data);
    } catch (e) { showToast("載入失敗：" + e.message, "error"); } finally { setLoadingDetail(false); }
  }, [activeId, page, showToast]);

  const handleDeleteProject = useCallback(async (id) => {
    if (!window.confirm("確定要刪除這個專案嗎？")) return;
    try {
      const { api } = await import("./services/api.js");
      await api.delete(id);
      setProjects(ps => ps.filter(p => p.id !== id));
      if (activeId === id) { setActiveId(null); setActiveProject(null); }
      showToast("專案已刪除");
    } catch (e) { showToast("刪除失敗：" + e.message, "error"); }
  }, [activeId, showToast]);

  const handleSave = useCallback(async (updated) => {
    try {
      const { api } = await import("./services/api.js");
      const saved = await api.update(updated.id, updated);
      setActiveProject(saved);
      setProjects(ps => ps.map(p => p.id === saved.id ? saved : p));
      showToast("已儲存");
    } catch (e) { showToast("儲存失敗：" + e.message, "error"); }
  }, [showToast]);

  const handleGenerated = useCallback((project) => {
    setProjects(ps => [project, ...ps]);
    setActiveId(project.id); 
    setActiveProject(project);
    setShowGenerate(false); 
    setPage("editor");
    showToast("OGSM 已生成！");
  }, [showToast]);

  const handleMembersChange = useCallback(async (newMembers) => {
    setMembers(newMembers);
    try {
      const { api } = await import("./services/api.js");
      await api.saveMembers(newMembers);
    } catch (e) { showToast("負責人儲存失敗", "error"); }
  }, [showToast]);

  const handleGlobalClick = (e) => {
    if(e.target.tagName !== 'BUTTON') setClickEffect({ x: e.clientX, y: e.clientY, id: Date.now() });
  };

  const renderSidebar = () => (
    <div style={{
      width: sidebarOpen ? "340px" : "0px",
      minWidth: sidebarOpen ? "340px" : "0px",
      height: "100%", display: "flex", flexDirection: "column",
      borderRight: `1px solid ${dark ? '#666363' : '#c5bebe'}`,
      background: "transparent",
      transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      position: "relative", zIndex: 30, overflow: "hidden"
    }}>
      <div style={{ width: "340px", height: "100%", display: "flex", flexDirection: "column" }}>
        
        <div style={{ padding: "24px 24px 15px", marginBottom: "10px", borderBottom: `1px solid ${dark ? '#c4c2c2' : '#d3cccc'}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div onClick={() => setPage("home")} className="cursor-pointer">
            <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: "24px", lineHeight: 0.85, letterSpacing: "-0.04em", textTransform: "uppercase", color: dark ? "#fff" : "#000" }}>
              STRATEGIC<br /><span style={{ color: ACCENT_BLUE }}>OGSM</span><br />PLANNER.
            </h1>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="b-action-hover"
            style={{ 
              width: '36px', height: '36px', background: dark ? '#222' : '#fff', border: `3px solid ${dark ? '#fff' : '#000'}`, 
              boxShadow: dark ? '3px 3px 0 0 #fff' : '3px 3px 0 0 #000', color: dark ? '#fff' : '#000', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' 
            }}
            title="收起側邊欄"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        <div style={{ padding: "0 24px 15px", display: "flex", gap: "16px" }}>
          <button 
            className="b-action-hover"
            onClick={() => setShowGenerate(true)} 
            style={{ 
              flex: 1, height: "52px", background: ACCENT_YELLOW, color: "#000", border: "4px solid #000", 
              boxShadow: "4px 4px 0 0 #000", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, 
              fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: 'all 0.15s' 
            }}
          >
            <Zap size={20} fill="currentColor" /> AI 生成 OGSM
          </button>
          <button 
            className="b-action-hover"
            onClick={() => setShowMembers(true)} 
            style={{ 
              width: "52px", height: "52px", flexShrink: 0, background: dark ? "#222" : "#fff", 
              border: `4px solid ${dark ? '#fff' : '#000'}`, boxShadow: dark ? '4px 4px 0 0 #fff' : '4px 4px 0 0 #000', 
              display: "flex", alignItems: "center", justifyContent: "center", position: "relative", color: dark ? '#fff' : '#000', transition: 'all 0.15s' 
            }}
            title="負責人管理"
          >
            <Users size={22} />
            <span style={{ position: "absolute", top: "-10px", right: "-10px", background: "#000", color: "#fff", fontSize: "11px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, padding: "2px 6px", border: "2px solid #fff", borderRadius: "12px" }}>
              {members.length > 0 ? members.length : '12'}
            </span>
          </button>
        </div>

        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <ProjectList 
            projects={projects} 
            loading={loadingList} 
            activeId={activeId} 
            onSelect={selectProject} 
            onDelete={handleDeleteProject}
            darkMode={dark} 
          />
        </div>

        <div style={{ padding: "15px 24px", borderTop: `1px solid ${dark ? '#666363' : '#c5bebe'}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent" }}>
          <span style={{ fontSize: "12px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontStyle: 'italic', letterSpacing: "0.08em", opacity: 0.4, color: dark ? '#fff' : '#000' }}>
            POWERED BY AI
          </span>
          <button 
            className="b-action-hover"
            onClick={() => setDark(d => !d)} 
            style={{ 
              width: "40px", height: "35px", background: dark ? '#222' : "#fff", color: dark ? '#fff' : "#000", 
              border: `4px solid ${dark ? '#fceeee' : '#000'}`, boxShadow: dark ? '4px 4px 0 0 #fff' : '4px 4px 0 0 #000', 
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: 'all 0.15s' 
            }}
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{BRUTALIST_CSS}</style>
      <div className={dark ? "dark" : ""} style={{ height: "100vh", overflow: "hidden", position: "relative", display: "flex", flexDirection: "column", backgroundColor: "transparent" }} onClick={handleGlobalClick}>
        <BrutalistBackground dark={dark} />

        {page === "home" ? (
          <div style={{ flex: 1, position: "relative", zIndex: 10, overflow: "hidden" }}>
            <HomePage onNewProject={() => setShowGenerate(true)} onManageProjects={() => setPage("projects")} dark={dark} />
          </div>
        ) : page === "projects" ? (
          <div style={{ flex: 1, position: "relative", zIndex: 10, overflow: "hidden" }}>
            <SwitchHome projects={projects} onSelect={(p) => selectProject(p.id)} onNewProject={() => setShowGenerate(true)} onBack={() => setPage("home")} dark={dark} onToggleDark={() => setDark(d => !d)} />
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", position: "relative", zIndex: 10, overflow: "hidden" }}>
            {renderSidebar()}
            
            <div style={{ flex: 1, overflow: "hidden", position: "relative", minWidth: 0 }}>
              {!sidebarOpen && page === "editor" && (
                <button 
                  onClick={() => setSidebarOpen(true)}
                  style={{
                    position: 'absolute', top: '24px', left: '24px', zIndex: 40,
                    width: '44px', height: '44px', background: dark ? '#222' : '#fff',
                    border: `4px solid ${dark ? '#fff' : '#000'}`, boxShadow: dark ? '4px 4px 0 0 #fff' : '4px 4px 0 0 #000',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: dark ? '#fff' : '#000'
                  }}
                >
                  <Menu size={24} />
                </button>
              )}
              {loadingDetail ? (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "20px" }}>
                  <div style={{ width: "64px", height: "64px", border: "8px solid rgba(0,0,0,0.1)", borderTopColor: ACCENT_BLUE, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, textTransform: "uppercase", fontSize: "14px", letterSpacing: "0.1em", opacity: 0.6 }}>載入中…</span>
                </div>
              ) : activeProject ? (
                <OgsmEditor 
                  project={activeProject} 
                  onSave={handleSave} 
                  onAudit={(p) => { setAuditProject(p); setShowAudit(true); }}
                  members={members} 
                  darkMode={dark} 
                  sidebarOpen={sidebarOpen} 
                />
              ) : (
                <EmptyState onNewProject={() => setShowGenerate(true)} dark={dark} />
              )}
            </div>
          </div>
        )}

        {showGenerate && <GenerateModal onClose={() => setShowGenerate(false)} onGenerated={handleGenerated} showToast={showToast} />}
        {showMembers && <MemberSettings members={members} onChange={handleMembersChange} onClose={() => setShowMembers(false)} darkMode={dark} />}
        {showAudit && <AuditPanel project={auditProject} onClose={() => setShowAudit(false)} darkMode={dark} />}

        <Toast toast={toast} />
        {clickEffect && <ClickBurst {...clickEffect} />}
      </div>
    </>
  );
}