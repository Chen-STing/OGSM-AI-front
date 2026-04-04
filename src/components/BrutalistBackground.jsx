import React, { useRef, useLayoutEffect } from 'react';
import {
  DEFAULT_CONFIG, ORIGINAL_STARS, ORIGINAL_CIRCLES, ORIGINAL_TRIS, ORIGINAL_CROSSES,
  genItems
} from '../bgConfig.js';

export default function BrutalistBackground({ dark, bgConfig }) {
  const bgRef = useRef(null);

  useLayoutEffect(() => {
    if (!bgRef.current || typeof document === 'undefined') return;
    
    // 完美同步時間軸：強制讓所有新產生的背景 CSS Animation 的起點絕對一致
    const syncAnimations = () => {
      if (window.__GLOBAL_BG_START__ === undefined) {
        window.__GLOBAL_BG_START__ = document.timeline ? document.timeline.currentTime : performance.now();
      }
      const anims = bgRef.current.getAnimations({ subtree: true });
      anims.forEach(anim => {
        if (anim.startTime !== window.__GLOBAL_BG_START__) {
          anim.startTime = window.__GLOBAL_BG_START__;
        }
      });
    };

    const alignToViewport = () => {
      const el = bgRef.current;
      if (!el || !el.parentElement) return;
      const rect = el.parentElement.getBoundingClientRect();
      const offsetX = window.innerWidth - rect.right;
      const offsetY = -rect.top;
      // 強制平移讓背景的 100vw x 100vh 完美涵蓋瀏覽器的邊界，進而讓內部 fixed / absolute 座標與主背景完全重疊
      el.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    };

    let isAnimating = true;
    const loopAlign = () => {
      alignToViewport();
      if (isAnimating) requestAnimationFrame(loopAlign);
    };

    const f1 = requestAnimationFrame(() => {
      syncAnimations();
      loopAlign();
    });
    const f2 = requestAnimationFrame(() => requestAnimationFrame(() => {
      syncAnimations();
    }));
    
    const stopRaf = setTimeout(() => { isAnimating = false; }, 800); // 確保彈窗動畫(最長0.55s)期間緊密追蹤定位

    window.addEventListener('resize', alignToViewport);
    return () => {
      isAnimating = false;
      clearTimeout(stopRaf);
      cancelAnimationFrame(f1);
      cancelAnimationFrame(f2);
      window.removeEventListener('resize', alignToViewport);
    };
  }, [bgConfig]);

  const cfg = bgConfig ?? DEFAULT_CONFIG;

  const useOriginal =
    !bgConfig ||
    (cfg.starCount   === DEFAULT_CONFIG.starCount   &&
     cfg.circleCount === DEFAULT_CONFIG.circleCount &&
     cfg.crossCount  === DEFAULT_CONFIG.crossCount  &&
     cfg.triCount    === DEFAULT_CONFIG.triCount);

  const rc = (c) => c === '__DARK__' ? (dark ? '#FFF' : '#000') : c;

  const seedBase = (cfg.seed ?? 0) >>> 0;
  const stars   = useOriginal ? ORIGINAL_STARS   : genItems(cfg.starCount,   (seedBase ^ 0xdeadbeef) >>> 0, 150, 450);
  const circles = useOriginal ? ORIGINAL_CIRCLES : genItems(cfg.circleCount, (seedBase ^ 0xcafebabe) >>> 0, 60,  180);
  const crosses = useOriginal ? ORIGINAL_CROSSES : genItems(cfg.crossCount,  (seedBase ^ 0xbeefdead) >>> 0, 30,   70);
  const tris    = useOriginal ? ORIGINAL_TRIS    : genItems(cfg.triCount,    (seedBase ^ 0xfeedface) >>> 0, 40,  100);

  return (
    <div ref={bgRef} style={{ position:"absolute", top:0, right:0, width:"100vw", height:"100vh", overflow:"hidden", zIndex:0, pointerEvents:"none", backgroundColor: dark?"#313131ff":"#f8f9fa", transition:"background-color 0.3s ease" }}>
      <style>{`
        @keyframes starRotateScale1 { 0%{transform:translateY(0) rotate(0deg) scale(1)} 50%{transform:translateY(-100px) rotate(180deg) scale(1.5)} 100%{transform:translateY(0) rotate(360deg) scale(1)} }
        @keyframes starRotateScale2 { 0%{transform:translateX(0) rotate(360deg) scale(1)} 50%{transform:translateX(150px) rotate(180deg) scale(0.8)} 100%{transform:translateX(0) rotate(0deg) scale(1)} }
        @keyframes crossFloat1 { 0%{transform:translate(0,0) rotate(0deg)} 25%{transform:translate(50px,-50px) rotate(90deg)} 50%{transform:translate(0,50px) rotate(180deg)} 75%{transform:translate(-50px,-50px) rotate(270deg)} 100%{transform:translate(0,0) rotate(360deg)} }
        @keyframes circlePulseFloat { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-40px) scale(1.5)} 66%{transform:translate(-20px,30px) scale(0.8)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes triangleSpinFloat { 0%{transform:translate(0,0) rotate(0deg)} 50%{transform:translate(-50px,50px) rotate(180deg)} 100%{transform:translate(0,0) rotate(360deg)} }
      `}</style>

      {/* Stars */}
      {stars.map((s, i) => {
        const posStyle = s.bottom !== undefined
          ? { position:"absolute", bottom:s.bottom, right:s.right ?? "auto" }
          : { position:"absolute", top:s.top, left:s.left };
        const anim = s.anim
          ? `${s.anim} ${s.duration} infinite linear`
          : `${i%2===0?'starRotateScale1':'starRotateScale2'} ${s.duration} infinite linear`;
        return (
            <div key={`star-${i}`} style={{ ...posStyle, color:rc(s.color), opacity:0.15, animation:anim }}>
              <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" style={{ overflow:"visible" }}>
                <path d="M12 2.5L14.7 8.8L21.5 9.5L16.3 14L17.8 20.7L12 17.2L6.2 20.7L7.7 14L2.5 9.5L9.3 8.8L12 2.5Z"/>
              </svg>
            </div>
          );
        })}

        {/* Circles */}
        {circles.map((c, i) => (
          <div key={`circle-${i}`} style={{ position:"absolute", top:c.top, left:c.left, color:rc(c.color), opacity:0.15, animation:`circlePulseFloat ${c.duration} infinite linear` }}>
            <svg width={c.size} height={c.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/></svg>
          </div>
        ))}

        {/* Triangles */}
        {tris.map((t, i) => (
          <div key={`tri-${i}`} style={{ position:"absolute", top:t.top, left:t.left, color:rc(t.color), opacity:0.15, animation:`triangleSpinFloat ${t.duration} infinite linear` }}>
            <svg width={t.size} height={t.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter"><polygon points="12,2 22,20 2,20"/></svg>
          </div>
        ))}

        {/* Crosses */}
        {crosses.map((c, i) => (
          <div key={`cross-${i}`} style={{ position:"absolute", top:c.top, left:c.left, color:rc(c.color), opacity:0.2, animation:`crossFloat1 ${c.duration} infinite linear` }}>
            <svg width={c.size} height={c.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
        ))}

        {/* Watermark */}
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
          <h2 style={{ transform:"rotate(-15deg)", opacity:0.03, fontSize:"25vw", fontWeight:900, textTransform:"uppercase", whiteSpace:"nowrap", userSelect:"none", pointerEvents:"none", margin:0, fontFamily:'"Space Grotesk",sans-serif', color:dark?"#FFF":"#000", transition:"color 0.3s ease" }}>
            {cfg.watermarkText || 'STRATEGIC FOCUS'}
          </h2>
        </div>

        {/* Grid */}
        <div style={{ position:"absolute", inset:0, zIndex:-1, pointerEvents:"none", backgroundImage: dark ? "linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)" : "linear-gradient(rgba(0,0,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.05) 1px,transparent 1px)", backgroundSize:"40px 40px", transition:"background-image 0.3s ease" }} />
      </div>
    );
  }