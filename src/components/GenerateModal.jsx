import { useState } from 'react'
import { api } from '../services/api.js'

// ─── VIBRANT BRUTALIST DESIGN TOKENS ────────────────────────────────────────
const ACCENT_BLUE   = "#0000FF";
const ACCENT_PINK   = "#FF00FF";
const ACCENT_YELLOW = "#FFFF00";

export default function GenerateModal({ onClose, onGenerated, showToast }) {
  const [objective, setObjective] = useState('')
  const [deadline,  setDeadline]  = useState('')
  const [context,   setContext]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [progress,  setProgress]  = useState('')

  // 邏輯完全保留
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
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)",
        zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center",
      }} 
      onClick={e => e.target === e.currentTarget && onClose()} 
      onKeyDown={handleKey}
    >
      <div className="b-card animate-scale-in" role="dialog" aria-modal="true" style={{
        background: "#fff", width: "600px", maxWidth: "92vw", maxHeight: "90vh",
        overflowY: "auto", position: "relative",
      }}>
        {/* Animated background grid inside dialog */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }} />

        {/* Animated scanning line (Optional Brutalist touch) */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 1 }}>
          <div style={{
            position: "absolute", left: 0, right: 0, height: "2px",
            background: "linear-gradient(to right, transparent, rgba(0,0,0,0.2), transparent)",
            animation: "progress-slide 2.5s linear infinite",
          }} />
        </div>

        {/* Header */}
        <div style={{
          background: "#000", padding: "24px 28px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          position: "relative", zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ background: ACCENT_YELLOW, padding: "8px", display: "flex", alignItems: "center" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
              </svg>
            </div>
            <h2 style={{
              fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
              fontSize: "28px", letterSpacing: "-0.03em", textTransform: "uppercase", color: "#fff",
              margin: 0
            }}>生成 OGSM</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{ 
              background: "none", border: "none", color: "#fff", fontSize: "28px", 
              lineHeight: 1, transition: "color 0.15s", cursor: "pointer", opacity: loading ? 0.5 : 1 
            }}
            onMouseEnter={e => !loading && (e.currentTarget.style.color = ACCENT_PINK)}
            onMouseLeave={e => !loading && (e.currentTarget.style.color = "#fff")}
          >✕</button>
        </div>

        <div style={{ padding: "32px 28px", position: "relative", zIndex: 10 }}>
          <p style={{
            fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, fontSize: "16px",
            lineHeight: 1.4, opacity: 0.7, marginBottom: "28px", textTransform: "uppercase",
            marginTop: 0
          }}>
            輸入核心目標與截止日期，AI 將自動規劃 Goals、Strategies、定量指標，以及各指標對應的 MP 檢核步驟。
          </p>

          {/* Objective */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{
              fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
              letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "8px",
            }}>
              OBJECTIVE 目標 <span style={{ color: ACCENT_PINK }}>*</span>
            </label>
            <textarea
              style={{
                width: "100%", padding: "16px", fontSize: "16px", fontWeight: 700,
                border: "4px solid #000", boxShadow: "none",
                fontFamily: '"Space Grotesk", sans-serif',
                background: "rgba(0,0,255,0.04)", resize: "vertical", minHeight: "100px",
                outline: "none", transition: "border-color 0.15s",
              }}
              placeholder="例：在 2026 年底前將體重從 85kg 減至 75kg"
              value={objective} onChange={e => setObjective(e.target.value)}
              disabled={loading} rows={3} autoFocus
            />
          </div>

          {/* Deadline */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{
              fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
              letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "8px",
            }}>
              📅 計畫截止日期 <span style={{ opacity: 0.4, fontStyle: "normal", textTransform: "none" }}>(建議填寫，AI 將據此安排各指標期限)</span>
            </label>
            <input
              type="date"
              style={{
                padding: "12px 16px", fontSize: "16px", fontFamily: "monospace", fontWeight: 700,
                border: "4px solid #000", boxShadow: "none", background: "rgba(0,0,0,0.04)",
                width: "100%", maxWidth: "250px", outline: "none",
              }}
              value={deadline} onChange={e => setDeadline(e.target.value)}
              disabled={loading}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Context */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{
              fontSize: "9px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
              letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "8px",
            }}>
              補充背景資訊 <span style={{ opacity: 0.4, fontStyle: "normal", textTransform: "none" }}>(選填)</span>
            </label>
            <textarea
              style={{
                width: "100%", padding: "12px 16px", fontSize: "14px",
                border: "4px solid #000", boxShadow: "none",
                background: "rgba(0,0,0,0.04)", resize: "vertical", outline: "none",
              }}
              placeholder="例：目前痛點、預算規模、產業背景、特定限制…"
              value={context} onChange={e => setContext(e.target.value)}
              disabled={loading} rows={2}
            />
          </div>

          {/* M 說明 (Brutalist style tip box) */}
          <div style={{
            border: "3px solid #000", padding: "14px 18px", marginBottom: "24px",
            background: "#fff", boxShadow: "4px 4px 0 0 rgba(0,0,0,0.1)",
            display: "flex", flexDirection: "column", gap: "10px"
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <span style={{ 
                background: ACCENT_YELLOW, color: "#000", border: "2px solid #000", 
                fontSize: "10px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, 
                padding: "2px 6px", letterSpacing: "0.05em", flexShrink: 0, marginTop: "2px"
              }}>MD</span>
              <span style={{ fontSize: "13px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, lineHeight: 1.5 }}>
                定量指標 — 監控最終產出數字與績效（例：體重、體脂率、業績達成率）
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <span style={{ 
                background: ACCENT_BLUE, color: "#fff", border: "2px solid #000", 
                fontSize: "10px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, 
                padding: "2px 6px", letterSpacing: "0.05em", flexShrink: 0, marginTop: "2px"
              }}>MP</span>
              <span style={{ fontSize: "13px", fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, lineHeight: 1.5 }}>
                檢核步驟 — 每個定量指標底下的可執行行動（例：每週量體重、記錄飲食）
              </span>
            </div>
          </div>

          {/* Loading state (Brutalist Progress Bar) */}
          {loading && (
            <div style={{ marginBottom: "24px", padding: "16px", border: "4px solid #000", background: ACCENT_YELLOW }}>
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
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button
              onClick={onClose} disabled={loading}
              style={{
                padding: "14px 28px", fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 900, fontSize: "16px", textTransform: "uppercase",
                background: "#fff", border: "4px solid #000", boxShadow: "4px 4px 0 0 #000",
                transition: "background 0.15s", cursor: loading ? "not-allowed" : "pointer"
              }}
              onMouseEnter={e => { !loading && (e.currentTarget.style.background = "#f0f0f0"); }}
              onMouseLeave={e => { !loading && (e.currentTarget.style.background = "#fff"); }}
            >取消</button>
            <button
              onClick={handleSubmit} disabled={!objective.trim() || loading}
              style={{
                padding: "14px 28px", fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 900, fontSize: "16px", textTransform: "uppercase",
                background: objective.trim() && !loading ? ACCENT_YELLOW : "#ddd",
                color: "#000", border: "4px solid #000", boxShadow: "4px 4px 0 0 #000",
                display: "flex", alignItems: "center", gap: "8px",
                opacity: loading || !objective.trim() ? 0.6 : 1,
                transition: "background 0.15s",
                cursor: loading || !objective.trim() ? "not-allowed" : "pointer"
              }}
              onMouseEnter={e => { 
                if (objective.trim() && !loading) {
                  e.currentTarget.style.background = "#000"; 
                  e.currentTarget.style.color = ACCENT_YELLOW; 
                }
              }}
              onMouseLeave={e => { 
                if (objective.trim() && !loading) {
                  e.currentTarget.style.background = ACCENT_YELLOW; 
                  e.currentTarget.style.color = "#000"; 
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