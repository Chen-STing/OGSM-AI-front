import React from 'react';
import BrutalistBackground from './BrutalistBackground'; // 引入獨立的背景元件

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────
const ACCENT_BLUE   = "#0000FF";
const ACCENT_PINK   = "#FF00FF";
const ACCENT_YELLOW = "#FFFF00";

// ─── MARQUEE TICKER ──────────────────────────────────────────────────────────
function Marquee({ dark }) {
  const text = "Define Objective, Map the Goals, Choose the Strategy, Define the Measures. Align, Implement, Measure. • ";
  
  const spanStyle = {
    fontFamily: '"Space Grotesk", sans-serif',
    fontWeight: 900,
    fontSize: "24px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontStyle: "italic",
    whiteSpace: "nowrap",
    paddingRight: "15px"
  };

  return (
    <div style={{
      overflow: "hidden",
      borderTop: dark ? "4px solid rgba(255,255,255,0.15)" : "8px solid #000",
      background: dark ? "#111" : "#000",
      padding: "15px 0",
      flexShrink: 0,
      zIndex: 20,
      display: "flex"
    }}>
      <style>{`
        @keyframes marqueeScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div style={{ display: "flex", width: "fit-content", animation: "marqueeScroll 60s linear infinite", color: "#FFF" }}>
        <div style={{ display: "flex" }}>
          {[...Array(5)].map((_, i) => <span key={`a-${i}`} style={spanStyle}>{text}</span>)}
        </div>
        <div style={{ display: "flex" }}>
          {[...Array(5)].map((_, i) => <span key={`b-${i}`} style={spanStyle}>{text}</span>)}
        </div>
      </div>
    </div>
  );
}

// ─── HOME PAGE ───────────────────────────────────────────────────────────────
export default function HomePage({ onNewProject, onManageProjects, dark }) {
  return (
    <div style={{ 
      height: "100%", 
      display: "flex", 
      flexDirection: "column", 
      position: "relative",
      backgroundColor: dark ? "transparent" : "transparent",
      overflow: "hidden"
    }}>
      
      {/* 載入獨立出來的背景與動畫 (如果您是放在 App.jsx 全域，這裡也可以移除，但保留無妨) */}
      <BrutalistBackground dark={dark} />

      {/* 主要內容區塊 */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "0 64px", maxWidth: "1400px", margin: "0 auto", width: "100%",
        position: "relative", zIndex: 10,
      }}>

        {/* Huge title */}
        <div className="animate-slide-up" style={{ marginBottom: "48px", marginLeft: "64px" }}>
          <h1 style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 900,
            fontSize: "clamp(80px, 10vw, 110px)",
            lineHeight: 0.85,
            letterSpacing: "-0.04em",
            textTransform: "uppercase",
            color: dark ? "#fff" : "#000",
            margin: 0
          }}>
            STRATEGIC<br />
            <span style={{ color: ACCENT_BLUE }}>OGSM</span><br />
            PLANNER.
          </h1>
        </div>

        {/* CTA row */}
        <div className="animate-slide-up-delay" style={{
          display: "flex", gap: "32px", alignItems: "stretch",
          marginLeft: "64px", flexWrap: "wrap",
        }}>
          {/* Description card (加入 Hover 效果) */}
          <div className="b-card" 
            style={{
              background: ACCENT_YELLOW, color: "#000",
              padding: "40px 48px", maxWidth: "600px",
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 700, fontSize: "20px", lineHeight: 1.6,
              display: "flex", alignItems: "center",
              border: "6px solid #000",
              boxShadow: "12px 12px 0 0 #000",
              transition: "transform 0.15s, box-shadow 0.15s", // 加入平滑過渡
              cursor: "default"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translate(-4px, -4px)";
              e.currentTarget.style.boxShadow = "16px 16px 0 0 #000";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translate(0, 0)";
              e.currentTarget.style.boxShadow = "12px 12px 0 0 #000";
            }}
          >
            利用 OGSM 框架與 AI 技術，將您的願景轉化為具體的執行計畫。精確定義目標、策略與衡量指標。
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", justifyContent: "space-between" }}>
            <button
              onClick={onNewProject}
              className="b-border"
              style={{
                padding: "20px 48px", fontSize: "22px",
                fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
                textTransform: "uppercase", letterSpacing: "0.04em",
                background: "#696969ff", color: "#fff",
                border: "6px solid #000",
                boxShadow: "10px 10px 0 0 rgba(0,0,0,1)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "16px",
                transition: "all 0.15s", // 改為 all 讓顏色也能平滑過渡
                cursor: "pointer",
                flex: 1
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translate(-2px, -2px)";
                e.currentTarget.style.boxShadow = "12px 12px 0 0 rgba(0,0,0,1)";
                e.currentTarget.style.background = ACCENT_BLUE; // Hover 時變成藍色
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translate(0, 0)";
                e.currentTarget.style.boxShadow = "10px 10px 0 0 rgba(0,0,0,1)";
                e.currentTarget.style.background = "#696969ff"; // 離開時恢復黑色
                e.currentTarget.style.color = "#fff";
              }}
              onMouseDown={e => {
                e.currentTarget.style.transform = "translate(4px, 4px)";
                e.currentTarget.style.boxShadow = "6px 6px 0 0 rgba(0,0,0,1)";
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              新增專案
            </button>
            <button
              onClick={onManageProjects}
              className="b-border"
              style={{
                padding: "20px 48px", fontSize: "22px",
                fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
                textTransform: "uppercase", letterSpacing: "0.04em",
                background: ACCENT_PINK, color: "#000",
                border: "6px solid #000", 
                boxShadow: "10px 10px 0 0 #000",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "16px",
                transition: "all 0.15s", // 改為 all
                cursor: "pointer",
                flex: 1
              }}
              onMouseEnter={e => { 
                e.currentTarget.style.transform = "translate(-2px, -2px)";
                e.currentTarget.style.boxShadow = "12px 12px 0 0 rgba(0,0,0,1)";
                e.currentTarget.style.background = "#fff"; // Hover 時變成白色
              }}
              onMouseLeave={e => { 
                e.currentTarget.style.transform = "translate(0, 0)";
                e.currentTarget.style.boxShadow = "10px 10px 0 0 rgba(0,0,0,1)";
                e.currentTarget.style.background = ACCENT_PINK; // 離開時恢復粉紅色
              }}
              onMouseDown={e => {
                e.currentTarget.style.transform = "translate(4px, 4px)";
                e.currentTarget.style.boxShadow = "6px 6px 0 0 rgba(0,0,0,1)";
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
              管理專案
            </button>
          </div>
        </div>
      </div>

      <Marquee dark={dark} />
    </div>
  );
}