import React from 'react';

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
const ACCENT_BLUE   = "#0d0dd0ff";
const ACCENT_PINK   = "#FF00FF";
const ACCENT_YELLOW = "#bcbc31";
const ACCENT_GREEN  = "#00FF00";

export default function BrutalistBackground({ dark }) {
  return (
    <div style={{
      position: "absolute",
      top: 0, 
      right: 0,         // 【關鍵修改】對齊父元素（側邊欄）的最右側
      width: "100vw",   // 【關鍵修改】寬度維持整個螢幕寬，製造全局背景的錯覺
      height: "100vh",  // 【關鍵修改】高度維持整個螢幕高
      overflow: "hidden", 
      zIndex: 0,
      pointerEvents: "none",
      backgroundColor: dark ? "#313131ff" : "#f8f9fa",
      transition: "background-color 0.3s ease",
    }}>
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

        /* 空心圓形脈衝漂浮動畫 */
        @keyframes circlePulseFloat {
          0%   { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(40px, -40px) scale(1.5); }
          66%  { transform: translate(-20px, 30px) scale(0.8); }
          100% { transform: translate(0, 0) scale(1); }
        }

        /* 空心三角形自轉漂浮動畫 */
        @keyframes triangleSpinFloat {
          0%   { transform: translate(0, 0) rotate(0deg); }
          50%  { transform: translate(-50px, 50px) rotate(180deg); }
          100% { transform: translate(0, 0) rotate(360deg); }
        }
      `}</style>

      {/* ─── 大星星 ─── */}
      <div style={{ position: "absolute", top: "25%", left: "-40px", color: ACCENT_BLUE, opacity: 0.15, animation: "starRotateScale1 20s infinite linear" }}>
        <svg width="230" height="230" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" style={{ overflow: "visible" }}>
          <path d="M12 2.5L14.7 8.8L21.5 9.5L16.3 14L17.8 20.7L12 17.2L6.2 20.7L7.7 14L2.5 9.5L9.3 8.8L12 2.5Z" />
        </svg>
      </div>
      <div style={{ position: "absolute", bottom: "25%", right: "-80px", color: ACCENT_PINK, opacity: 0.15, animation: "starRotateScale2 25s infinite linear" }}>
        <svg width="450" height="450" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" style={{ overflow: "visible" }}>
          <path d="M12 2.5L14.7 8.8L21.5 9.5L16.3 14L17.8 20.7L12 17.2L6.2 20.7L7.7 14L2.5 9.5L9.3 8.8L12 2.5Z" />
        </svg>
      </div>

      {/* ─── 空心圓形 ─── */}
      {[
        { top: '11%', left: '80%', color: "#ff7300", size: 80, duration: "14s" },
        { top: '75%', left: '10%', color: ACCENT_YELLOW, size: 140, duration: "20s" },
        { top: '85%', left: '60%', color: '#02fcfc', size: 60, duration: "16s" },
      ].map((circle, i) => (
        <div key={`circle-${i}`} style={{ position: "absolute", top: circle.top, left: circle.left, color: circle.color, opacity: 0.15, animation: `circlePulseFloat ${circle.duration} infinite linear` }}>
          <svg width={circle.size} height={circle.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /></svg>
        </div>
      ))}

      {/* ─── 空心三角形 ─── */}
      {[
        { top: '35%', left: '17%', color: ACCENT_GREEN, size: 65, duration: "18s" },
        { top: '65%', left: '80%', color: ACCENT_BLUE, size: 80, duration: "22s" },
        { top: '41%', left: '53%', color: "#fd0000", size: 40, duration: "25s" },
        { top: '6%', left: '46%', color: dark ? "#FFF" : "#000", size: 60, duration: "15s" },
      ].map((tri, i) => (
        <div key={`tri-${i}`} style={{ position: "absolute", top: tri.top, left: tri.left, color: tri.color, opacity: 0.15, animation: `triangleSpinFloat ${tri.duration} infinite linear` }}>
          <svg width={tri.size} height={tri.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter"><polygon points="12,2 22,20 2,20" /></svg>
        </div>
      ))}

      {/* ─── 漂浮十字架 ─── */}
      {[
        { top: '10%', left: '20%', color: '#00d4fa', size: 40, duration: "15s" },
        { top: '80%', left: '25%', color: ACCENT_PINK, size: 60, duration: "22s" },
        { top: '40%', left: '81%', color: ACCENT_YELLOW, size: 50, duration: "18s" },
        { top: '7%', left: '67%', color: ACCENT_GREEN, size: 35, duration: "25s" },
        { top: '60%', left: '45%', color: dark ? "#FFF" : "#000", size: 30, duration: "20s" },
      ].map((cross, i) => (
        <div key={i} style={{ position: "absolute", top: cross.top, left: cross.left, color: cross.color, opacity: 0.2, animation: `crossFloat1 ${cross.duration} infinite linear` }}>
          <svg width={cross.size} height={cross.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </div>
      ))}

      {/* ─── 巨大的浮水印文字 ─── */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <h2 style={{
          transform: "rotate(-15deg)",
          opacity: 0.03,
          fontSize: "25vw", // 【關鍵修改】恢復為超大 vw，看起來像全局浮水印
          fontWeight: 900,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          userSelect: "none",
          pointerEvents: "none",
          margin: 0,
          fontFamily: '"Space Grotesk", sans-serif',
          color: dark ? "#FFF" : "#000",
          transition: "color 0.3s ease"
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
        transition: "background-image 0.3s ease"
      }} />
    </div>
  );
}