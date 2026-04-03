// ── Global CSS injected by App ───────────────────────────────────────────────

export const BRUTALIST_CSS = `
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

export const TRANSLATION_CSS = `
  @keyframes translate-pop-in {
    0%   { opacity: 0; transform: scale(0.88) translateY(6px); }
    100% { opacity: 1; transform: scale(1)    translateY(0); }
  }
  .translate-popup {
    animation: translate-pop-in 0.18s cubic-bezier(0.16,1,0.3,1) both;
    font-family: "Inter", "Noto Sans TC", sans-serif;
  }
  .cipher-popup {
    animation: translate-pop-in 0.18s cubic-bezier(0.16,1,0.3,1) both;
    font-family: "Inter", "Noto Sans TC", sans-serif;
  }
`;
