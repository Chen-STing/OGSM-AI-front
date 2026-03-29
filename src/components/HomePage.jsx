import React, { useRef, useLayoutEffect } from 'react';

const ACCENT_BLUE   = "#0000FF";
const ACCENT_PINK   = "#FF00FF";
const ACCENT_YELLOW = "#FFFF00";

function Marquee({ dark }) {
  const text = "Define Objective, Map the Goals, Choose the Strategy, Define the Measures. Align, Implement, Measure. • ";
  const spanStyle = { fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: "24px", textTransform: "uppercase", letterSpacing: "0.08em", fontStyle: "italic", whiteSpace: "nowrap", paddingRight: "15px" };

  return (
    <div className="hp-marquee" style={{ overflow: "hidden", borderTop: dark ? "4px solid rgba(255,255,255,0.15)" : "8px solid #000", background: dark ? "#111" : "#000", padding: "15px 0", flexShrink: 0, zIndex: 20, display: "flex" }}>
      <style>{`@keyframes marqueeScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
      <div style={{ display: "flex", width: "fit-content", animation: "marqueeScroll 60s linear infinite", color: "#FFF" }}>
        <div style={{ display: "flex" }}>{[...Array(5)].map((_, i) => <span key={`a-${i}`} style={spanStyle}>{text}</span>)}</div>
        <div style={{ display: "flex" }}>{[...Array(5)].map((_, i) => <span key={`b-${i}`} style={spanStyle}>{text}</span>)}</div>
      </div>
    </div>
  );
}

export default function HomePage({ onNewProject, onManageProjects, dark, exiting, entering, hideTitle }) {
  const titleRef = useRef(null);
  
  // 保證滑動動畫只在 "整個網站" 首度開啟時觸發
  const isFirstMount = useRef(true);
  useLayoutEffect(() => {
    const timer = setTimeout(() => { isFirstMount.current = false; }, 50);
    return () => clearTimeout(timer);
  }, []);

  // 1. 全域精準座標快取 (Left, Top, Font Size)
  useLayoutEffect(() => {
    const updateCache = () => {
      if (titleRef.current && !exiting) {
        const el = titleRef.current;
        const oldT = el.style.transform;
        el.style.transform = 'none';
        const rect = el.getBoundingClientRect();
        window.__OGSM_HOME_RECT__ = { top: rect.top, left: rect.left };
        window.__OGSM_HOME_SIZE__ = parseFloat(window.getComputedStyle(el).fontSize);
        el.style.transform = oldT;
      }
    };
    updateCache();
    const timer = setTimeout(updateCache, 500);
    window.addEventListener('resize', updateCache);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateCache);
    };
  }, [exiting]);

  // 2. 飛向 SwitchHome (保留 0.5s 的長度)
  useLayoutEffect(() => {
    if (exiting && titleRef.current) {
      const el = titleRef.current;
      el.style.transition = "none";
      el.style.transform = "none";
      
      const rect = el.getBoundingClientRect();
      const targetX = 48 - rect.left;
      const targetY = 32 - rect.top;
      
      const currentFontSize = parseFloat(window.getComputedStyle(el).fontSize);
      const cw = document.documentElement.clientWidth;
      const switchHomeTargetSize = Math.max(24, Math.min(cw * 0.03, 36)); 
      const scale = switchHomeTargetSize / currentFontSize;

      el.style.transformOrigin = "top left";
      
      requestAnimationFrame(() => {
        el.style.transition = "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease";
        el.style.transform = `translate(${targetX}px, ${targetY}px) scale(${scale})`;
        el.style.zIndex = 9999;
        el.style.position = "relative";
      });
    }
  }, [exiting]);

  return (
    <div
      className={`${exiting ? "hp-exiting" : ""} ${entering ? "hp-entering" : ""}`}
      style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}
    >
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "0 64px", maxWidth: "1400px", margin: "0 auto", width: "100%",
        position: "relative", zIndex: 10,
      }}>
        {/* 嚴格判斷：若是轉場回來則完全不加上 animate-slide-up，保證落地不跳躍 */}
        <div className={`hp-title ${isFirstMount.current && !entering && !exiting ? "animate-slide-up" : ""}`} style={{ marginBottom: "48px", marginLeft: "64px", opacity: hideTitle ? 0 : 1 }}>
          <h1 id="home-title-target" ref={titleRef} style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: "clamp(80px, 10vw, 110px)", lineHeight: 0.85, letterSpacing: "-0.04em", textTransform: "uppercase", color: dark ? "#fff" : "#000", margin: 0 }}>
            STRATEGIC<br /><span style={{ color: ACCENT_BLUE }}>OGSM</span><br />PLANNER.
          </h1>
        </div>

        <div className={exiting ? "" : (entering ? "" : (isFirstMount.current ? "animate-slide-up-delay" : ""))} style={{ display: "flex", gap: "32px", alignItems: "stretch", marginLeft: "64px", flexWrap: "wrap" }}>
          <div className="hp-desc-card b-card"
            style={{ background: ACCENT_YELLOW, color: "#000", padding: "40px 48px", maxWidth: "600px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: "20px", lineHeight: 1.6, display: "flex", alignItems: "center", border: "6px solid #000", boxShadow: "12px 12px 0 0 #000", transition: "transform 0.15s, box-shadow 0.15s", cursor: "default" }}
            onMouseEnter={e => { if (exiting) return; e.currentTarget.style.transform = "translate(-4px, -4px)"; e.currentTarget.style.boxShadow = "16px 16px 0 0 #000"; }}
            onMouseLeave={e => { if (exiting) return; e.currentTarget.style.transform = "translate(0, 0)"; e.currentTarget.style.boxShadow = "12px 12px 0 0 #000"; }}
          >
            利用 OGSM 框架與 AI 技術，將您的願景轉化為具體的執行計畫。精確定義目標、策略與衡量指標。
          </div>

          <div className="hp-buttons" style={{ display: "flex", flexDirection: "column", gap: "20px", justifyContent: "space-between" }}>
            <button onClick={onNewProject} className="b-border"
              style={{ padding: "20px 48px", fontSize: "22px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", background: "#696969ff", color: "#fff", border: "6px solid #000", boxShadow: "10px 10px 0 0 rgba(0,0,0,1)", display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", transition: "all 0.15s", cursor: "pointer", flex: 1 }}
              onMouseEnter={e => { if (exiting) return; e.currentTarget.style.transform = "translate(-2px, -2px)"; e.currentTarget.style.boxShadow = "12px 12px 0 0 rgba(0,0,0,1)"; e.currentTarget.style.background = ACCENT_BLUE; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { if (exiting) return; e.currentTarget.style.transform = "translate(0, 0)"; e.currentTarget.style.boxShadow = "10px 10px 0 0 rgba(0,0,0,1)"; e.currentTarget.style.background = "#696969ff"; e.currentTarget.style.color = "#fff"; }}
              onMouseDown={e => { if (exiting) return; e.currentTarget.style.transform = "translate(4px, 4px)"; e.currentTarget.style.boxShadow = "6px 6px 0 0 rgba(0,0,0,1)"; }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              新增專案
            </button>
            <button onClick={onManageProjects} className="b-border"
              style={{ padding: "20px 48px", fontSize: "22px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", background: ACCENT_PINK, color: "#000", border: "6px solid #000", boxShadow: "10px 10px 0 0 #000", display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", transition: "all 0.15s", cursor: "pointer", flex: 1 }}
              onMouseEnter={e => { if (exiting) return; e.currentTarget.style.transform = "translate(-2px, -2px)"; e.currentTarget.style.boxShadow = "12px 12px 0 0 rgba(0,0,0,1)"; e.currentTarget.style.background = "#fff"; }}
              onMouseLeave={e => { if (exiting) return; e.currentTarget.style.transform = "translate(0, 0)"; e.currentTarget.style.boxShadow = "10px 10px 0 0 rgba(0,0,0,1)"; e.currentTarget.style.background = ACCENT_PINK; }}
              onMouseDown={e => { if (exiting) return; e.currentTarget.style.transform = "translate(4px, 4px)"; e.currentTarget.style.boxShadow = "6px 6px 0 0 rgba(0,0,0,1)"; }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              管理專案
            </button>
          </div>
        </div>
      </div>
      <Marquee dark={dark} />
    </div>
  );
}