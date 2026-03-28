import { useState } from 'react'
import { api } from '../services/api.js'

// ─── VIBRANT BRUTALIST DESIGN TOKENS ────────────────────────────────────────
const ACCENT_BLUE   = "#0000FF";
const ACCENT_PINK   = "#FF00FF";
const ACCENT_YELLOW = "#FFFF00";

// ─── THEME CONFIGURATION ────────────────────────────────────────────────────
const DARK = {
  bg: '#2A2A2A',
  text: '#FFFFFF',
  textSub: '#CCCCCC',
  border: '#FFFFFF',
  inputBg: 'rgba(255,255,255,0.06)',
  altBg: 'rgba(255,255,255,0.15)',
  grid: 'rgba(255,255,255,0.06)',
  scanline: 'rgba(255,255,255,0.2)',
  backdrop: 'rgba(0,0,0,0.85)',
  headerBg: 'rgba(160, 160, 160)'
};

const LIGHT = {
  bg: '#FFFFFF',
  text: '#000000',
  textSub: 'rgba(0,0,0,0.7)',
  border: '#000000',
  inputBg: 'rgba(0,0,255,0.04)',
  altBg: '#f0f0f0',
  grid: 'rgba(0,0,0,0.04)',
  scanline: 'rgba(0,0,0,0.2)',
  backdrop: 'rgba(255,255,255,0.8)',
  headerBg: 'rgb(18, 18, 18)'
};

// 👇 這裡補上了與 MemberSettings 完全相同的預設值 darkMode = true
export default function GenerateModal({ onClose, onGenerated, showToast, darkMode = true }) {
  const [objective, setObjective] = useState('')
  const [deadline,  setDeadline]  = useState('')
  const [context,   setContext]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [progress,  setProgress]  = useState('')

  // 完全相同的判斷邏輯
  const T = darkMode ? DARK : LIGHT;

  const handleSubmit = async () => {
    if (!objective.trim()) return
    setLoading(true)

    const steps = ['分析目標…', '規劃 Goals…', '制定 Strategies…', '規劃定量指標…', '生成待辦清單…', '整合輸出…']
    let i = 0
    setProgress(steps[0])
    const tick = setInterval(() => {
      i = (i + 1) % steps.length
      setProgress(steps[i])
    }, 1800)

    try {
      const project = await api.generate({
        objective:         objective.trim(),
        deadline:          deadline.trim() || undefined,
        additionalContext: context.trim()  || undefined,
      })
      onGenerated(project)
    } catch (e) {
      showToast('生成失敗：' + e.message, 'error')
    } finally {
      clearInterval(tick)
      setLoading(false)
      setProgress('')
    }
  }

  const handleKey = (e) => { if (e.key === 'Escape') onClose() }

  return (
    <div 
      style={{
        position: "fixed", inset: 0,
        background: T.backdrop, backdropFilter: "blur(4px)",
        zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.3s ease"
      }} 
      onClick={e => e.target === e.currentTarget && onClose()} 
      onKeyDown={handleKey}
    >
      <style>{`.gm-date::-webkit-calendar-picker-indicator { cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M14 6 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%23000000" /><path d="M10 2 v10 h8 v12 h-16 v-16 h4 v-6 z" fill="%23FF00FF" stroke="%23FFFFFF" stroke-width="2.5" stroke-linejoin="miter" /></svg>') 10 2, pointer !important; }`}</style>
      <div className="b-card animate-scale-in" role="dialog" aria-modal="true" style={{
        background: T.bg, color: T.text, width: "600px", maxWidth: "92vw", maxHeight: "90vh",
        border: `4px solid ${T.border}`,
        boxShadow: `8px 8px 0px ${(darkMode ? "#223fce" : "#7389dd")}`,
        overflowY: "auto", position: "relative",
        transition: "background 0.3s ease, color 0.3s ease, border 0.3s ease, box-shadow 0.3s ease"
      }}>
        {/* Animated background grid inside dialog */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `linear-gradient(to right, ${T.grid} 1px, transparent 1px), linear-gradient(to bottom, ${T.grid} 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
          transition: "background-image 0.3s ease"
        }} />

        {/* Animated scanning line */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 1 }}>
          <div style={{
            position: "absolute", left: 0, right: 0, height: "2px",
            background: `linear-gradient(to right, transparent, ${T.scanline}, transparent)`,
            animation: "progress-slide 2.5s linear infinite",
          }} />
        </div>

        {/* Header */}
        <div style={{
          background: T.headerBg, padding: "12px 28px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          position: "relative", zIndex: 10, transition: "background 0.3s ease"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ background: ACCENT_YELLOW, padding: "8px", display: "flex", alignItems: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
                <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
              </svg>
            </div>
            <h2 style={{
              fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
              fontSize: "25px", letterSpacing: "-0.03em", textTransform: "uppercase", 
              color: T.bg, 
              margin: 0
            }}>生成 OGSM</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{ 
              background: "none", border: "none", color: T.bg, fontSize: "28px", 
              lineHeight: 1, transition: "color 0.15s", cursor: "pointer", opacity: loading ? 0.5 : 1 
            }}
            onMouseEnter={e => !loading && (e.currentTarget.style.color = ACCENT_PINK)}
            onMouseLeave={e => !loading && (e.currentTarget.style.color = T.bg)}
          >✕</button>
        </div>

        <div style={{ padding: "14px 28px", position: "relative", zIndex: 10 }}>
          <p style={{
            fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: "16px",
            lineHeight: 1.4, color: T.textSub, marginBottom: "16px", textTransform: "uppercase",
            marginTop: 0, transition: "color 0.3s ease"
          }}>
            輸入核心目標與截止日期，AI 將自動規劃 Goals、Strategies、定量指標，以及各指標對應的 MP 檢核步驟。
          </p>

          {/* Objective */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{
              fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
              letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "8px",
              color: T.text, transition: "color 0.3s ease"
            }}>
              OBJECTIVE 目標 <span style={{ color: ACCENT_PINK }}>*</span>
            </label>
            <textarea
              style={{
                width: "100%", padding: "16px", fontSize: "16px", fontWeight: 700,
                border: `4px solid ${T.border}`, boxShadow: "none",
                fontFamily: '"Space Grotesk", sans-serif', color: T.text,
                background: T.inputBg, resize: "vertical", minHeight: "100px",
                outline: "none", transition: "border-color 0.15s, background 0.3s ease, color 0.3s ease",
              }}
              placeholder="例：在 2026 年底前將體重從 85kg 減至 75kg"
              value={objective} onChange={e => setObjective(e.target.value)}
              disabled={loading} rows={3} autoFocus
            />
          </div>

          {/* Deadline */}
          <div style={{ marginBottom: "15px" }}>
            <label style={{
              fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
              letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "8px",
              color: T.text, transition: "color 0.3s ease"
            }}>
              📅 計畫截止日期 <span style={{ opacity: 0.6, fontStyle: "normal", textTransform: "none" }}>(建議填寫，AI 將據此安排各指標期限)</span>
            </label>
            <input
              type="date"
              className="gm-date"
              style={{
                padding: "7px 16px", fontSize: "16px", fontFamily: "monospace", fontWeight: 700,
                border: `4px solid ${T.border}`, boxShadow: "none", background: T.inputBg, color: T.text,
                width: "100%", maxWidth: "250px", outline: "none",
                colorScheme: darkMode ? "dark" : "light",
                transition: "background 0.3s ease, color 0.3s ease, border 0.3s ease"
              }}
              value={deadline} onChange={e => setDeadline(e.target.value)}
              disabled={loading}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Context */}
          <div style={{ marginBottom: "10px" }}>
            <label style={{
              fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
              letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "8px",
              color: T.text, transition: "color 0.3s ease"
            }}>
              補充背景資訊 <span style={{ opacity: 0.6, fontStyle: "normal", textTransform: "none" }}>(選填)</span>
            </label>
            <textarea
              style={{
                width: "100%", padding: "12px 16px", fontSize: "14px",
                border: `4px solid ${T.border}`, boxShadow: "none", color: T.text,
                background: T.inputBg, resize: "vertical", outline: "none",
                transition: "background 0.3s ease, color 0.3s ease, border 0.3s ease"
              }}
              placeholder="例：目前痛點、預算規模、產業背景、特定限制…"
              value={context} onChange={e => setContext(e.target.value)}
              disabled={loading} rows={2}
            />
          </div>

          {/* M 說明 */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <span style={{ 
              background: ACCENT_YELLOW, color: "#000", border: `2px solid ${T.border}`, 
              fontSize: "10px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, 
              padding: "2px 6px", letterSpacing: "0.05em", flexShrink: 0, marginTop: "2px",
              transition: "border 0.3s ease"
            }}>MD</span>
            <span style={{ fontSize: "13px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, lineHeight: 1.5, color: T.text, transition: "color 0.3s ease" }}>
              定量指標 — 監控最終產出數字與績效（例：體重、體脂率、業績達成率）
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginTop: "8px" }}>
            <span style={{ 
              background: ACCENT_BLUE, color: "#fff", border: `2px solid ${T.border}`, 
              fontSize: "10px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, 
              padding: "2px 6px", letterSpacing: "0.05em", flexShrink: 0, marginTop: "2px",
              transition: "border 0.3s ease"
            }}>MP</span>
            <span style={{ marginBottom: "13px", fontSize: "13px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, lineHeight: 1.5, color: T.text, transition: "color 0.3s ease" }}>
              檢核步驟 — 每個定量指標底下的可執行行動（例：每週量體重、記錄飲食）
            </span>
          </div>
          
          {/* Loading state */}
          {loading && (
            <div style={{ marginBottom: "24px", padding: "16px", border: `4px solid ${T.border}`, background: ACCENT_YELLOW, color: "#000" }}>
              <div style={{
                fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
                fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                {progress || '初始化…'}
              </div>
              <div style={{ height: "4px", background: "rgba(0,0,0,0.15)", marginTop: "12px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: "40%", background: "#000", animation: "marquee 1.5s linear infinite" }} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
            <button
              onClick={onClose} disabled={loading}
              style={{
                padding: "10px 20px", fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 900, fontSize: "16px", textTransform: "uppercase",
                background: T.bg, color: T.text, border: `4px solid ${T.border}`, boxShadow: `4px 4px 0 0 ${(darkMode ? "#868686" : "#000000")}`,
                transition: "all 0.15s",
                cursor: loading ? "not-allowed" : "pointer"
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${(darkMode ? "#868686" : "#000000")}`; e.currentTarget.style.background = darkMode ? "#636363" : "#858585"; } }}
              onMouseLeave={e => { if (!loading) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `4px 4px 0 0 ${(darkMode ? "#868686" : "#000000")}`; e.currentTarget.style.background = T.bg; } }}
              onMouseDown={e => { if (!loading) { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = `2px 2px 0 0 ${T.border}`; } }}
              onMouseUp={e => { if (!loading) { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${T.border}`; } }}
            >取消</button>
            <button
              onClick={handleSubmit} disabled={!objective.trim() || loading}
              style={{
                padding: "10px 20px", fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 900, fontSize: "16px", textTransform: "uppercase",
                background: objective.trim() && !loading ? ACCENT_YELLOW : (darkMode ? "#444" : "#ddd"),
                color: objective.trim() && !loading ? "#000" : (darkMode ? "#888" : "#888"),
                border: `4px solid ${T.border}`, boxShadow: `4px 4px 0 0 ${(darkMode ? "#868686" : "#000000")}`,
                display: "flex", alignItems: "center", gap: "8px",
                opacity: loading || !objective.trim() ? 0.6 : 1,
                transition: "all 0.15s",
                cursor: loading || !objective.trim() ? "not-allowed" : "pointer"
              }}
              onMouseEnter={e => {
                if (objective.trim() && !loading) {
                  e.currentTarget.style.transform = 'translate(-2px,-2px)';
                  e.currentTarget.style.boxShadow = `6px 6px 0 0 ${(darkMode ? "#868686" : "#000000")}`;
                  e.currentTarget.style.background = darkMode ? "#286390" : '#0b4979';
                  e.currentTarget.style.color = T.bg;
                }
              }}
              onMouseLeave={e => {
                if (objective.trim() && !loading) {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = `4px 4px 0 0 ${(darkMode ? "#868686" : "#000000")}`;
                  e.currentTarget.style.background = ACCENT_YELLOW;
                  e.currentTarget.style.color = "#000000";
                }
              }}
              onMouseDown={e => {
                if (objective.trim() && !loading) {
                  e.currentTarget.style.transform = 'translate(2px,2px)';
                  e.currentTarget.style.boxShadow = `2px 2px 0 0 ${T.border}`;
                }
              }}
              onMouseUp={e => {
                if (objective.trim() && !loading) {
                  e.currentTarget.style.transform = 'translate(-2px,-2px)';
                  e.currentTarget.style.boxShadow = `6px 6px 0 0 ${T.border}`;
                }
              }}
            >
              {loading ? (
                <>
                  <span style={{ 
                    width: "16px", height: "16px", border: "3px solid rgba(0,0,0,0.3)", 
                    borderTopColor: "#000", borderRadius: "50%", animation: "spin 0.6s linear infinite", 
                    display: "inline-block" 
                  }} />
                  生成中…
                </>
              ) : <>⚡ 開始生成</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}