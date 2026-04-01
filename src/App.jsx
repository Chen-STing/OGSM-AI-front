import { useState, useEffect, useCallback, useRef, Fragment, useLayoutEffect } from "react";
import { Zap, Users, Sun, Moon, PanelLeftClose, Menu } from 'lucide-react';
import HomePage from './components/HomePage.jsx';
import SwitchHome from './components/SwitchHome.jsx';
import ProjectList, { calcProgress } from './components/ProjectList.jsx';
import OgsmEditor from './components/OgsmEditor.jsx';
import GenerateModal from './components/GenerateModal.jsx';
import MemberSettings from './components/MemberSettings.jsx';
import AuditPanel from './components/AuditPanel.jsx';
import BrutalistBackground from './components/BrutalistBackground.jsx';
import KonamiCode from './components/KonamiCode.jsx';
import { loadSavedBgConfig, loadSavedModalConfig, loadSavedExpSettings } from './bgConfig.js';

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

  /* ⚡ BRUTALIST CURSORS ⚡ */
  /* 所有自訂義游標規則都包在 .custom-cursor class 內 */
  /* 當 customCursor 關閉時，移除 .custom-cursor class 即可全部停用 */

  /* 1. 全域預設：霓虹黃箭頭 */
  .custom-cursor, .custom-cursor * {
    cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><polygon points="6,6 16,28 20,20 28,16" fill="%23000000" /><polygon points="2,2 12,24 16,16 24,12" fill="%23FFFF00" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></svg>') 2 2, auto !important;
  }

  /* 2. 可點擊元素：綠色像素手指 */
  .custom-cursor button, .custom-cursor a, .custom-cursor [role="button"],
  .custom-cursor .cursor-pointer, .custom-cursor .clickable, .custom-cursor select,
  .custom-cursor button *, .custom-cursor a *, .custom-cursor [role="button"] *,
  .custom-cursor .cursor-pointer *, .custom-cursor .clickable *,
  .custom-cursor [style*="cursor: pointer"], .custom-cursor [style*="cursor:pointer"],
  .custom-cursor [style*="cursor: pointer"] *, .custom-cursor [style*="cursor:pointer"] * {
    cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M14 6 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%23000000" /><path d="M10 2 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%2300FF00" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></svg>') 10 2, pointer !important;
  }

  /* 3. 文字輸入：青色 I-Beam */
  .custom-cursor textarea:not([readonly]),
  .custom-cursor input[type="text"]:not([readonly]),
  .custom-cursor input:not([type]):not([readonly]),
  .custom-cursor input[type="search"]:not([readonly]),
  .custom-cursor input[type="email"]:not([readonly]),
  .custom-cursor input[type="password"]:not([readonly]),
  .custom-cursor input[type="date"]:not([readonly]),
  .custom-cursor input[type="number"]:not([readonly]) {
    cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M10 6 h16 v4 h-6 v12 h6 v4 h-16 v-4 h6 v-12 h-6 z" fill="%23000000" /><path d="M6 2 h16 v4 h-6 v12 h6 v4 h-16 v-4 h6 v-12 h-6 z" fill="%2300FFFF" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></svg>') 14 16, text !important;
  }

  /* 4. 唯讀欄位 */
  .custom-cursor textarea[readonly], .custom-cursor input[readonly] {
    cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><polygon points="6,6 16,28 20,20 28,16" fill="%23000000" /><polygon points="2,2 12,24 16,16 24,12" fill="%23FFFF00" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></svg>') 2 2, auto !important;
  }

  /* 5. AI 生成遮罩 */
  .custom-cursor .ogsm-ai-loading-overlay,
  .custom-cursor .ogsm-ai-loading-overlay * {
    cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g><animateTransform attributeName="transform" type="rotate" from="0 16 16" to="360 16 16" dur="1.5s" repeatCount="indefinite" /><polygon points="18,4 22,14 32,18 22,22 18,32 14,22 4,18 14,14" fill="%23000000" /><polygon points="16,2 20,12 30,16 20,20 16,30 12,20 2,16 12,12" fill="%23FF0000" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></g></svg>') 16 16, wait !important;
  }

  /* 5. 載入／停用 */
  .custom-cursor .loading, .custom-cursor [disabled] {
    cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g><animateTransform attributeName="transform" type="rotate" from="0 16 16" to="360 16 16" dur="1.5s" repeatCount="indefinite" /><polygon points="18,4 22,14 32,18 22,22 18,32 14,22 4,18 14,14" fill="%23000000" /><polygon points="16,2 20,12 30,16 20,20 16,30 12,20 2,16 12,12" fill="%23FF0000" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></g></svg>') 16 16, wait !important;
  }

  /* 6. 全域載入狀態 */
  body.is-loading .custom-cursor,
  body.is-loading .custom-cursor *,
  body.is-loading .custom-cursor button,
  body.is-loading .custom-cursor a,
  body.is-loading .custom-cursor [role="button"],
  body.is-loading .custom-cursor .cursor-pointer,
  body.is-loading .custom-cursor input,
  body.is-loading .custom-cursor textarea,
  body.is-loading .custom-cursor select {
    cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g><animateTransform attributeName="transform" type="rotate" from="0 16 16" to="360 16 16" dur="1.5s" repeatCount="indefinite" /><polygon points="18,4 22,14 32,18 22,22 18,32 14,22 4,18 14,14" fill="%23000000" /><polygon points="16,2 20,12 30,16 20,20 16,30 12,20 2,16 12,12" fill="%23FF0000" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></g></svg>') 16 16, wait !important;
    pointer-events: none !important;
  }

  /* 7. loading 豁免區 */
  body.is-loading .custom-cursor [data-loading-exempt],
  body.is-loading .custom-cursor [data-loading-exempt] * {
    pointer-events: auto !important;
    cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M14 6 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%23000000" /><path d="M10 2 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%2300FF00" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></svg>') 10 2, pointer !important;
  }

  /* 8. disabled button */
  .custom-cursor button[disabled],
  .custom-cursor button[disabled] * {
    cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g><animateTransform attributeName="transform" type="rotate" from="0 16 16" to="360 16 16" dur="1.5s" repeatCount="indefinite" /><polygon points="18,4 22,14 32,18 22,22 18,32 14,22 4,18 14,14" fill="%23000000" /><polygon points="16,2 20,12 30,16 20,20 16,30 12,20 2,16 12,12" fill="%23FF0000" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></g></svg>') 16 16, wait !important;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes click-burst { 0% { transform: scale(0) translate(0,0); opacity: 1; } 100% { transform: scale(4) translate(0,0); opacity: 0; } }
  @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .animate-click-burst { animation: click-burst 0.5s ease-out forwards; }
  .animate-slide-up { animation: slide-up 0.8s cubic-bezier(0.16,1,0.3,1) both; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
  .dark ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); }

  .b-action-hover:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 0 #000 !important; }
  .b-action-hover:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0 0 #000 !important; }
  .dark .b-action-hover:hover { box-shadow: 6px 6px 0 0 rgba(255,255,255,0.2) !important; }
  .dark .b-action-hover:active { box-shadow: 2px 2px 0 0 rgba(255,255,255,0.2) !important; }
  .ai-action-hover:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 0 #000 !important; }
  .ai-action-hover:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0 0 #000 !important; }
  .dark .ai-action-hover:hover { box-shadow: 6px 6px 0 0 #131313 !important; }
  .dark .ai-action-hover:active { box-shadow: 2px 2px 0 0 #131313 !important; }

  @keyframes block-exit-left   { 0% { transform: translateX(0);     opacity: 1; } 100% { transform: translateX(-120%); opacity: 0; } }
  @keyframes block-exit-right  { 0% { transform: translateX(0);     opacity: 1; } 100% { transform: translateX(120%);  opacity: 0; } }
  @keyframes block-enter-left  { 0% { transform: translateX(-120%); opacity: 0; } 100% { transform: translateX(0);     opacity: 1; } }
  @keyframes block-enter-right { 0% { transform: translateX(120%);  opacity: 0; } 100% { transform: translateX(0);     opacity: 1; } }
  @keyframes marquee-exit-down { 0% { transform: translateY(0);     opacity: 1; } 100% { transform: translateY(100%); opacity: 0; } }
  @keyframes marquee-enter-up  { 0% { transform: translateY(100%);  opacity: 0; } 100% { transform: translateY(0);    opacity: 1; } }
  @keyframes grid-enter        { 0% { transform: translateY(40px);  opacity: 0; } 100% { transform: translateY(0);    opacity: 1; } }
  @keyframes sh-controls-enter { 0% { transform: translateX(40px);  opacity: 0; } 100% { transform: translateX(0);   opacity: 1; } }
  @keyframes block-exit-down   { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(100vh); opacity: 0; } }

  .hp-exiting .hp-desc-card { animation: block-exit-left   0.45s cubic-bezier(0.4, 0, 1, 1) 0.05s forwards; }
  .hp-exiting .hp-buttons   { animation: block-exit-right  0.45s cubic-bezier(0.4, 0, 1, 1) 0.1s  forwards; }
  .hp-exiting .hp-marquee   { animation: marquee-exit-down 0.4s  cubic-bezier(0.4, 0, 1, 1) 0.15s forwards; }

  /* 移除標題的 block-enter-down，讓 Javascript 無縫接管位置！ */
  .hp-entering .hp-desc-card { animation: block-enter-left 0.35s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both; }
  .hp-entering .hp-buttons   { animation: block-enter-right 0.35s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both; }
  .hp-entering .hp-marquee   { animation: marquee-enter-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both; }

  .sh-entering .sh-controls-anim { animation: sh-controls-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both; }
  .sh-entering .sh-grid-anim     { animation: grid-enter        0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s  both; }

  .sh-exiting-to-editor .sh-controls-anim { animation: block-exit-right 0.45s cubic-bezier(0.4, 0, 1, 1) forwards; }
  .sh-exiting-to-editor .sh-grid-anim     { animation: block-exit-left  0.45s cubic-bezier(0.4, 0, 1, 1) forwards; }

  .sh-exiting-to-home .sh-controls-anim { animation: block-exit-down 0.45s cubic-bezier(0.4, 0, 1, 1) forwards !important; }
  .sh-exiting-to-home .sh-grid-anim     { animation: block-exit-down 0.45s cubic-bezier(0.4, 0, 1, 1) 0.05s forwards !important; }

  .sh-entering-from-editor .sh-controls-anim { animation: block-enter-right 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both; }
  .sh-entering-from-editor .sh-grid-anim     { animation: block-enter-left  0.45s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both; }

  .editor-sidebar-entering { animation: block-enter-left 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .editor-main-entering    { animation: block-enter-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both; }

  .editor-sidebar-exiting { animation: block-exit-left 0.45s cubic-bezier(0.4, 0, 1, 1) forwards; }
  .editor-main-exiting    { animation: block-exit-right 0.45s cubic-bezier(0.4, 0, 1, 1) forwards; }
`;

function parseRoute(pathname = window.location.pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/') return { page: 'home' };
  if (clean === '/management') return { page: 'projects' };
  const match = clean.match(/^\/management\/(.+)$/);
  if (match) return { page: 'editor', id: decodeURIComponent(match[1]) };
  return { page: 'home' };
}

function navigate(path, replace = false) {
  if (replace) window.history.replaceState(null, '', path);
  else window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function EmptyState() { return null; }
function Toast({ toast }) { return null; }
function ClickBurst({ x, y }) {
  return <div style={{ position: 'fixed', left: x - 20, top: y - 20, width: 40, height: 40, borderRadius: '50%', border: '4px solid #FF00FF', pointerEvents: 'none', zIndex: 9999, animation: 'click-burst 0.5s ease-out forwards' }} />;
}

export default function App() {
  const [route, setRoute] = useState(() => parseRoute());
  const [transition, setTransition] = useState('idle');
  const [displayedPage, setDisplayedPage] = useState(() => parseRoute().page);
  const transitionTimer = useRef(null);

  const [dark, setDark] = useState(false);
  const [projects, setProjects] = useState([]);
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
  const [membersHovered, setMembersHovered] = useState(false);
  const [closeSidebarHovered, setCloseSidebarHovered] = useState(false);
  const [openSidebarHovered, setOpenSidebarHovered] = useState(false);
  const [darkToggleHovered, setDarkToggleHovered] = useState(false);
  const [aiGenerateHovered, setAiGenerateHovered] = useState(false);
  const [expSettings, setExpSettings] = useState(loadSavedExpSettings);

  useEffect(() => {
    const onPop = () => setRoute(parseRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (transition.startsWith('exiting') || transition.startsWith('entering')) return;
    if (route.page !== displayedPage) {
      setDisplayedPage(route.page);
      setTransition('idle');
    }
  }, [route.page, displayedPage, transition]);

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

  useEffect(() => {
    if (route.page !== 'editor' || !route.id) return;
    if (activeProject && activeProject.id === route.id) return;
    setActiveProject(null);
    setLoadingDetail(true);
    import("./services/api.js").then(({ api }) =>
      api.getById(route.id)
        .then(data => setActiveProject(data))
        .catch(e => showToast("載入失敗：" + e.message, "error"))
        .finally(() => setLoadingDetail(false))
    );
  }, [route.page, route.id]);

  useEffect(() => {
    if (loadingList || loadingDetail) document.body.classList.add('is-loading');
    else document.body.classList.remove('is-loading');
    return () => document.body.classList.remove('is-loading');
  }, [loadingList, loadingDetail]);

  useEffect(() => {
    if (expSettings.customCursor) document.body.classList.add('custom-cursor');
    else document.body.classList.remove('custom-cursor');
    return () => document.body.classList.remove('custom-cursor');
  }, [expSettings.customCursor]);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const goHome = useCallback(() => {
    if (displayedPage === 'home') return;
    if (transition !== 'idle') return; 

    if (displayedPage === 'projects') {
      setTransition('exiting-projects-to-home');
      clearTimeout(transitionTimer.current);
      transitionTimer.current = setTimeout(() => {
        navigate('/');
        setDisplayedPage('home');
        setTransition('entering-home');
        transitionTimer.current = setTimeout(() => setTransition('idle'), 700);
      }, 550);
    } else if (displayedPage === 'editor') {
      // ✨ 完全比照上方 projects 回 home 的邏輯與秒數 (550ms)
      setTransition('exiting-editor-to-home');
      clearTimeout(transitionTimer.current);
      transitionTimer.current = setTimeout(() => {
        navigate('/');
        setDisplayedPage('home');
        setTransition('entering-home');
        transitionTimer.current = setTimeout(() => setTransition('idle'), 700);
      }, 550);
    } else {
      navigate('/');
    }
  }, [displayedPage, transition]);

  const goProjects = useCallback(() => {
    if (displayedPage === 'projects') return;
    if (transition !== 'idle') return;

    if (displayedPage === 'home') {
      setTransition('exiting-home');
      clearTimeout(transitionTimer.current);
      transitionTimer.current = setTimeout(() => {
        navigate('/management');
        setDisplayedPage('projects');
        setTransition('entering-projects');
        transitionTimer.current = setTimeout(() => setTransition('idle'), 700);
      }, 550);
    } else if (displayedPage === 'editor') {
      setTransition('exiting-editor-to-projects');
      clearTimeout(transitionTimer.current);
      transitionTimer.current = setTimeout(() => {
        navigate('/management');
        setDisplayedPage('projects');
        setTransition('entering-projects-from-editor');
        transitionTimer.current = setTimeout(() => setTransition('idle'), 600);
      }, 550);
    } else {
      navigate('/management');
    }
  }, [displayedPage, transition]);

  const selectProject = useCallback(async (id) => {
    if (route.page === 'editor' && route.id === id) return;
    if (transition !== 'idle') return;

    if (displayedPage === 'projects') {
      setTransition('exiting-projects');
      clearTimeout(transitionTimer.current);
      transitionTimer.current = setTimeout(() => {
        navigate(`/management/${encodeURIComponent(id)}`);
        setDisplayedPage('editor');
        setTransition('entering-editor');
        transitionTimer.current = setTimeout(() => setTransition('idle'), 600);
      }, 550);
    } else {
      navigate(`/management/${encodeURIComponent(id)}`);
    }
  }, [route.page, route.id, displayedPage, transition]);

  const handleDeleteProject = useCallback(async (id) => {
    try {
      const { api } = await import("./services/api.js");
      await api.delete(id);
      setProjects(ps => ps.filter(p => p.id !== id));
      if (route.id === id) { setActiveProject(null); navigate('/management', true); }
      showToast("專案已刪除");
    } catch (e) { showToast("刪除失敗：" + e.message, "error"); }
  }, [route.id, showToast]);

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
    setActiveProject(project);
    setShowGenerate(false);
    navigate(`/management/${encodeURIComponent(project.id)}`);
    showToast("OGSM 已生成！");
  }, [showToast]);

  const handleMembersChange = useCallback(async (newMembers) => {
    setMembers(newMembers);
    try {
      const { api } = await import("./services/api.js");
      await api.saveMembers(newMembers);
    } catch (e) { showToast("負責人儲存失敗", "error"); }
  }, [showToast]);

  const [bgConfig, setBgConfig]       = useState(loadSavedBgConfig);
  const [modalConfigs, setModalConfigs] = useState(() => ({
    generate:  loadSavedModalConfig('generate'),
    member:    loadSavedModalConfig('member'),
    aiconfirm: loadSavedModalConfig('aiconfirm'),
  }));

  const handleGlobalClick = (e) => {
    if (loadingList || loadingDetail) return;
    if (!expSettings.clickEffect) return;
    if (e.target.tagName !== 'BUTTON') setClickEffect({ x: e.clientX, y: e.clientY, id: Date.now() });
    setTimeout(() => setClickEffect(null), 520);
  };

  const isExitingHome                = transition === 'exiting-home';
  const isEnteringHome               = transition === 'entering-home';
  const isEnteringProjects           = transition === 'entering-projects';
  const isExitingProjects            = transition === 'exiting-projects'; 
  const isExitingProjectsToHome      = transition === 'exiting-projects-to-home';
  const isEnteringEditor             = transition === 'entering-editor';
  const isExitingEditorToProjects    = transition === 'exiting-editor-to-projects';
  const isExitingEditorToHome        = transition === 'exiting-editor-to-home';
  const isEnteringProjectsFromEditor = transition === 'entering-projects-from-editor';

  const isEditorExiting = isExitingEditorToProjects || isExitingEditorToHome;

  const sidebarTitleRef = useRef(null);

  useLayoutEffect(() => {
    if (isEditorExiting && sidebarTitleRef.current) {
      const el = sidebarTitleRef.current;
      el.style.transition = "none";
      el.style.transform = "none";
      
      const rect = el.getBoundingClientRect();
      const currentFontSize = 24; // 側邊欄標題目前大小
      let targetX = 0, targetY = 0, scale = 1;
      
      const cw = document.documentElement.clientWidth;

      if (isExitingEditorToProjects) {
        // 飛向管理專案頁 (SwitchHome)
        targetX = 48 - rect.left;
        targetY = 32 - rect.top;
        const shSize = Math.max(24, Math.min(cw * 0.03, 36)); 
        scale = shSize / currentFontSize;
      } else { 
        // ✨ 飛向首頁 (HomePage)：直接讀取首頁留下的快取座標 (比照原本的做法)
        const exactLeft = window.__OGSM_HOME_RECT__?.left ?? (Math.max(0, (cw - 1400) / 2) + 64);
        const exactTop  = window.__OGSM_HOME_RECT__?.top ?? (window.innerHeight * 0.35);
        
        targetX = exactLeft - rect.left;
        targetY = exactTop - rect.top;
        
        // 讀取首頁標題大小的快取
        const homeSize = window.__OGSM_HOME_SIZE__ ?? Math.max(80, Math.min(cw * 0.1, 110));
        scale = homeSize / currentFontSize;
      }

      el.style.transformOrigin = "top left";
      el.style.willChange = "transform"; // 保留這行硬體加速，讓放大過程不模糊
      
      requestAnimationFrame(() => {
        // ✨ 動畫時間與曲線「完全對齊」 550ms 切換時機
        el.style.transition = "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.55s ease";
        el.style.transform = `translate(${targetX}px, ${targetY}px) scale(${scale})`;
        el.style.zIndex = 9999;
        el.style.position = "relative"; 
      });
    }
  }, [isEditorExiting, isExitingEditorToProjects]);

  const renderSidebar = () => (
    <div style={{
      width: sidebarOpen ? "340px" : "0px", minWidth: sidebarOpen ? "340px" : "0px",
      height: "100%", display: "flex", flexDirection: "column",
      borderRight: `1px solid ${isEditorExiting ? 'rgba(0,0,0,0)' : (dark ? '#3C3C3C' : '#D0D0D0')}`, 
      background: "transparent",
      transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.15s ease-out",
      position: "relative", zIndex: 50, 
      overflow: isEditorExiting ? "visible" : "hidden" 
    }}>
      <div style={{ width: "340px", height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ 
          padding: "24px 24px 15px",
          borderBottom: `1px solid ${isEditorExiting ? 'rgba(0,0,0,0)' : (dark ? '#3C3C3C' : '#D0D0D0')}`, 
          transition: 'border-color 0.15s ease-out', display: "flex", justifyContent: "space-between", alignItems: "flex-start" 
        }}>
          <div onClick={goHome} className="cursor-pointer">
            <h1 ref={sidebarTitleRef} style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: "24px", lineHeight: 0.85, letterSpacing: "-0.04em", textTransform: "uppercase", color: dark ? "#fff" : "#000", margin: 0 }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.6" }}
              onMouseLeave={e => { if (isEditorExiting || transition !== 'idle') return; e.currentTarget.style.opacity = 1; }}
            >
              STRATEGIC<br /><span style={{ color: ACCENT_BLUE }}>OGSM</span><br />PLANNER.
            </h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} data-sidebar-toggle="" className="b-action-hover"
            onMouseEnter={() => setCloseSidebarHovered(true)}
            onMouseLeave={() => setCloseSidebarHovered(false)}
            style={{ width: '36px', height: '36px', background: closeSidebarHovered ? '#0000FF' : (dark ? '#222' : '#fff'), border: `3px solid ${dark ? '#fff' : '#000'}`, boxShadow: dark ? '3px 3px 0 0 rgba(255,255,255,0.2)' : '3px 3px 0 0 #000', color: closeSidebarHovered ? '#fff' : (dark ? '#fff' : '#000'), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', opacity: isEditorExiting ? 0 : 1, pointerEvents: isEditorExiting ? 'none' : 'auto' }}
            title="收起側邊欄">
            <PanelLeftClose size={18} />
          </button>
        </div>

        <div className={isEnteringEditor ? "editor-sidebar-entering" : isEditorExiting ? "editor-sidebar-exiting" : ""} style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 24px 15px", display: "flex", gap: "16px" }}>
            <button className="ai-action-hover" onClick={() => setShowGenerate(true)}
              onMouseEnter={e => { setAiGenerateHovered(true); if (dark) e.currentTarget.style.boxShadow = '6px 6px 0 0 #131313'; }}
              onMouseLeave={e => { setAiGenerateHovered(false); e.currentTarget.style.boxShadow = '4px 4px 0 0 #000'; }}
              style={{ flex: 1, height: "52px", background: aiGenerateHovered ? '#FF0000' : ACCENT_YELLOW, color: aiGenerateHovered ? '#fff' : "#000", border: "4px solid #000", boxShadow: '4px 4px 0 0 #000', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: 'all 0.15s' }}>
              <Zap size={20} fill="currentColor" /> AI 生成 OGSM
            </button>
            <button className="b-action-hover" onClick={() => setShowMembers(true)}
              onMouseEnter={() => setMembersHovered(true)}
              onMouseLeave={() => setMembersHovered(false)}
              style={{ width: "52px", height: "52px", flexShrink: 0, background: membersHovered ? '#FF00FF' : (dark ? "#222" : "#fff"), border: `3px solid ${dark ? '#fff' : '#000'}`, boxShadow: dark ? '4px 4px 0 0 rgba(255,255,255,0.2)' : '4px 4px 0 0 #000', display: "flex", alignItems: "center", justifyContent: "center", position: "relative", color: membersHovered ? '#fff' : (dark ? '#fff' : '#000'), transition: 'all 0.15s' }}
              title="負責人管理">
              <Users size={22} />
              <span style={{ position: "absolute", top: "-10px", right: "-10px", background: "#000", color: membersHovered ? '#FF00FF' : "#fff", fontSize: "11px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, padding: "2px 6px", border: `2px solid ${membersHovered ? '#FF00FF' : '#fff'}`, borderRadius: "12px", transition: 'all 0.15s' }}>
                {members.length > 0 ? members.length : '12'}
              </span>
            </button>
          </div>

          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <ProjectList projects={projects} loading={loadingList} activeId={route.id ?? null} onSelect={selectProject} onDelete={handleDeleteProject} onManage={goProjects} darkMode={dark} />
          </div>

          <div style={{ padding: "15px 24px", borderTop: `1px solid ${dark ? '#3C3C3C' : '#D0D0D0'}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent" }}>
            <span style={{ fontSize: "12px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontStyle: 'italic', letterSpacing: "0.08em", opacity: 0.4, color: dark ? '#fff' : '#000' }}>POWERED BY AI</span>
            <button className="b-action-hover" onClick={() => setDark(d => !d)} data-sidebar-toggle=""
              onMouseEnter={() => setDarkToggleHovered(true)}
              onMouseLeave={() => setDarkToggleHovered(false)}
              style={{ width: "35px", height: "35px", background: darkToggleHovered ? (dark ? '#fff' : '#000') : (dark ? '#222' : "#fff"), color: darkToggleHovered ? (dark ? '#000' : '#fff') : (dark ? '#fff' : "#000"), border: `2px solid ${dark ? '#555555' : '#000'}`, boxShadow: dark ? '4px 4px 0 0 rgba(255,255,255,0.2)' : '4px 4px 0 0 #000', display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: 'all 0.15s' }}>
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const { page } = route;

  return (
    <>
      <style>{BRUTALIST_CSS}</style>
      <div className={`${dark ? "dark" : ""} ${expSettings.customCursor ? "custom-cursor" : ""}`} style={{ height: "100vh", overflow: "hidden", position: "relative", display: "flex", flexDirection: "column", backgroundColor: "transparent" }} onClick={handleGlobalClick}>
        <BrutalistBackground dark={dark} bgConfig={bgConfig} />

        {/* ── HOME PAGE ── */}
        {(displayedPage === 'home' || isExitingHome) && (
          <div style={{ flex: 1, position: "relative", zIndex: 10, overflow: "hidden" }}>
            <HomePage onNewProject={() => setShowGenerate(true)} onManageProjects={goProjects} dark={dark} exiting={isExitingHome} entering={isEnteringHome} />
          </div>
        )}

        {/* ── PROJECTS PAGE (SwitchHome) ── */}
        {(displayedPage === 'projects' && !isExitingHome) && (
          <div style={{ flex: 1, position: "relative", zIndex: 10, overflow: "hidden" }}>
            <SwitchHome
              projects={projects}
              onSelect={p => selectProject(p.id)}
              onNewProject={() => setShowGenerate(true)}
              onDeleteProject={handleDeleteProject}
              onBack={goHome}
              dark={dark}
              onToggleDark={() => setDark(d => !d)}
              entering={isEnteringProjects ? 'home' : isEnteringProjectsFromEditor ? 'editor' : null}
              exitingTo={isExitingProjects ? 'editor' : isExitingProjectsToHome ? 'home' : null}
            />
          </div>
        )}

        {/* ── EDITOR PAGE ── */}
        {(displayedPage === 'editor' || isEditorExiting) && (
          <div style={{ flex: 1, display: "flex", position: "relative", zIndex: 10, overflow: "hidden" }}>
            {renderSidebar()}
            <div className={isEnteringEditor ? "editor-main-entering" : isEditorExiting ? "editor-main-exiting" : ""} style={{ flex: 1, overflow: "hidden", position: "relative", minWidth: 0 }}>
              {!sidebarOpen && (
                <button className="b-action-hover" onClick={() => setSidebarOpen(true)} data-sidebar-toggle=""
                  onMouseEnter={() => setOpenSidebarHovered(true)}
                  onMouseLeave={() => setOpenSidebarHovered(false)}
                  style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 40, width: '44px', height: '44px', background: openSidebarHovered ? '#FFFF00' : (dark ? '#222' : '#fff'), border: `4px solid ${dark ? '#fff' : '#000'}`, boxShadow: dark ? '4px 4px 0 0 rgba(255,255,255,0.2)' : '4px 4px 0 0 #000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: openSidebarHovered ? '#000' : (dark ? '#fff' : '#000'), opacity: isEditorExiting ? 0 : 1, transition: 'all 0.15s' }}>
                  <Menu size={24} />
                </button>
              )}
              {loadingDetail ? (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "20px" }}>
                  <div style={{ width: "64px", height: "64px", border: "8px solid rgba(0,0,0,0.1)", borderTopColor: "#FF0000", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, textTransform: "uppercase", fontSize: "14px", letterSpacing: "0.1em", opacity: 0.6 }}>載入中…</span>
                </div>
              ) : activeProject ? (
                <OgsmEditor project={activeProject} onSave={handleSave} onAudit={p => { setAuditProject(p); setShowAudit(true); }} members={members} darkMode={dark} sidebarOpen={sidebarOpen} aiConfirmShapeConfig={modalConfigs.aiconfirm} />
              ) : (
                <EmptyState onNewProject={() => setShowGenerate(true)} dark={dark} />
              )}
            </div>
          </div>
        )}

        {showGenerate && <GenerateModal onClose={() => setShowGenerate(false)} onGenerated={handleGenerated} showToast={showToast} darkMode={dark} shapeConfig={modalConfigs.generate} />}
        {showMembers && <MemberSettings members={members} onChange={handleMembersChange} onClose={() => setShowMembers(false)} darkMode={dark} shapeConfig={modalConfigs.member} />}
        {showAudit && <AuditPanel project={auditProject} onClose={() => setShowAudit(false)} darkMode={dark} />}

        <Toast toast={toast} />
        {clickEffect && <ClickBurst key={clickEffect.id} x={clickEffect.x} y={clickEffect.y} />}
      </div>

      <KonamiCode
        dark={dark}
        onBgChange={setBgConfig}
        onModalChange={(key, cfg) => setModalConfigs(p => ({ ...p, [key]: cfg }))}
        onExpChange={setExpSettings}
      />
    </>
  );
}