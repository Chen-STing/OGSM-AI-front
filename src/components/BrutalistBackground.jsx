import React from 'react';

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
const ACCENT_BLUE   = "#0000FF";
const ACCENT_PINK   = "#FF00FF";
const ACCENT_YELLOW = "#FFFF00";
const ACCENT_GREEN  = "#00FF00";

export default function BrutalistBackground({ dark }) {
  return (
    <div style={{
      position: "fixed",
      top: 0, 
      left: 0, 
      width: "100vw", 
      height: "100vh",
      overflow: "hidden", 
      zIndex: -1,
      pointerEvents: "none",
      // 🌟 新增這裡：根據明暗模式切換真實的底色
      backgroundColor: dark ? "#121212" : "#f8f9fa",
      // 🌟 新增這裡：讓切換時有平滑的漸變效果
      transition: "background-color 0.3s ease",
    }}>
      {/* 注入專屬背景動畫 Keyframes */}
      <style>{`
        /* 星星動畫 */
        @keyframes starRotateScale1 {
          0%   { transform: translateY(0) rotate(0deg) scale(1); }
          50%  { transform: translateY(-100px) rotate(180deg) scale(1.5); }
          100% { transform: translateY(0) rotate(360deg) scale(1); }
        }
        @keyframes starRotateScale2 {
          0%   { transform: translateX(0) rotate(360deg) scale(1); }
          50%  { transform: translateX(150px) rotate(180deg) scale(0.8); }
          100% { transform: translateX(0) rotate(0deg) scale(1); }
        }
        
        /* 十字架漂浮旋轉動畫 */
        @keyframes crossFloat1 {
          0%   { transform: translate(0, 0) rotate(0deg); }
          25%  { transform: translate(50px, -50px) rotate(90deg); }
          50%  { transform: translate(0, 50px) rotate(180deg); }
          75%  { transform: translate(-50px, -50px) rotate(270deg); }
          100% { transform: translate(0, 0) rotate(360deg); }
        }
      `}</style>

      {/* ─── 大星星 (已加入圓角處理) ─── */}
      {/* 左上角 藍色星星 */}
      <div style={{
        position: "absolute", top: "25%", left: "-40px",
        color: ACCENT_BLUE, opacity: 0.1,
        animation: "starRotateScale1 20s infinite linear"
      }}>
        <svg 
          width="200" height="200" viewBox="0 0 24 24" 
          fill="currentColor" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinejoin="round" 
          style={{ overflow: "visible" }}
        >
          <path d="M12 2.5L14.7 8.8L21.5 9.5L16.3 14L17.8 20.7L12 17.2L6.2 20.7L7.7 14L2.5 9.5L9.3 8.8L12 2.5Z" />
        </svg>
      </div>

      {/* 右下角 粉色星星 */}
      <div style={{
        position: "absolute", bottom: "25%", right: "-80px",
        color: ACCENT_PINK, opacity: 0.1,
        animation: "starRotateScale2 25s infinite linear"
      }}>
        <svg 
          width="450" height="450" viewBox="0 0 24 24" 
          fill="currentColor" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinejoin="round" 
          style={{ overflow: "visible" }}
        >
          <path d="M12 2.5L14.7 8.8L21.5 9.5L16.3 14L17.8 20.7L12 17.2L6.2 20.7L7.7 14L2.5 9.5L9.3 8.8L12 2.5Z" />
        </svg>
      </div>

      {/* ─── 漂浮十字架 ─── */}
      {[
        { top: '10%', left: '20%', color: ACCENT_BLUE, size: 40, duration: "15s" },
        { top: '80%', left: '15%', color: ACCENT_PINK, size: 60, duration: "22s" },
        { top: '40%', left: '85%', color: ACCENT_YELLOW, size: 50, duration: "18s" },
        { top: '15%', left: '70%', color: ACCENT_GREEN, size: 35, duration: "25s" },
        { top: '60%', left: '45%', color: dark ? "#FFF" : "#000", size: 30, duration: "20s" },
      ].map((cross, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: cross.top,
            left: cross.left,
            color: cross.color,
            opacity: 0.2,
            animation: `crossFloat1 ${cross.duration} infinite linear`
          }}
        >
          <svg width={cross.size} height={cross.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
             <line x1="12" y1="5" x2="12" y2="19" />
             <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
      ))}

      {/* ─── 巨大的浮水印文字 ─── */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden"
      }}>
        <h2 style={{
          transform: "rotate(-15deg)",
          opacity: 0.03,
          fontSize: "25vw",
          fontWeight: 900,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          userSelect: "none",
          pointerEvents: "none",
          margin: 0,
          fontFamily: '"Space Grotesk", sans-serif',
          color: dark ? "#FFF" : "#000",
          transition: "color 0.3s ease" // 讓文字顏色也平滑過渡
        }}>
          STRATEGIC FOCUS
        </h2>
      </div>

      {/* ─── 背景網格疊加層 ─── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: -1, pointerEvents: "none",
        backgroundImage: dark 
          ? "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)"
          : "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        transition: "background-image 0.3s ease" // 網格也加入過渡
      }} />
    </div>
  );
}