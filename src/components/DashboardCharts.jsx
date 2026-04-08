import React, { useState, useMemo } from 'react';
import BrutalistSelect from './BrutalistSelect.jsx';

// ─── DESIGN TOKENS (shared) ───────────────────────────────────────────────────
const B_YELLOW = '#c8b800';
const B_GREEN  = '#18c96a';
const B_BLUE   = '#3a5bd9';
const B_PINK   = '#d63fa0';
const B_CYAN   = '#0fb8b8';
const B_ORANGE = '#d4750a';

const DARK  = { bg: '#1a1c1e', border: '#5a5a5a', text: '#e8e8e8', textSub: '#a8a8a8', textMuted: '#707070', cardBg: 'rgba(255,255,255,0.055)', headerBg: 'rgba(22,24,26,0.92)', grid: 'rgba(255,255,255,0.05)' };
const LIGHT = { bg: '#edeef0', border: '#3a3a3a', text: '#1a1a1a', textSub: '#404040', textMuted: '#707070', cardBg: 'rgba(0,0,0,0.035)',          headerBg: 'rgba(237,238,240,0.93)', grid: 'rgba(0,0,0,0.05)' };

function progressColor(pct) {
  if (pct === 0)   return DARK.textMuted;
  if (pct < 30)    return B_PINK;
  if (pct < 60)    return B_ORANGE;
  if (pct < 100)   return B_CYAN;
  return B_GREEN;
}
function incompleteColor(pct) {
  if (pct === 0)   return B_GREEN;
  if (pct <= 30)   return B_CYAN;
  if (pct <= 70)   return B_ORANGE;
  return B_PINK;
}

function DonutChart({ segments, dark, total, size = 110, centerKey = 'done', centerLabel }) {
  const T = dark ? DARK : LIGHT;
  const cx = size / 2, cy = size / 2, rOut = size * 0.4, rIn = size * 0.24;
  if (total === 0) return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={(rOut + rIn) / 2} fill="none"
        stroke={dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'} strokeWidth={rOut - rIn} />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={size * 0.12}
        fontWeight="900" fontFamily='"Space Grotesk", sans-serif' fill={T.textMuted}>-</text>
    </svg>
  );
  let a = -Math.PI / 2;
  const paths = [];
  segments.filter(s => s.value > 0).forEach((s, i) => {
    const sweep = Math.max(0, (s.value / total) * 2 * Math.PI - 0.025);
    if (sweep <= 0) return;
    const x1 = cx + rOut * Math.cos(a), y1 = cy + rOut * Math.sin(a);
    const x2 = cx + rOut * Math.cos(a + sweep), y2 = cy + rOut * Math.sin(a + sweep);
    const xi1 = cx + rIn * Math.cos(a + sweep), yi1 = cy + rIn * Math.sin(a + sweep);
    const xi2 = cx + rIn * Math.cos(a), yi2 = cy + rIn * Math.sin(a);
    const lg = sweep > Math.PI ? 1 : 0;
    paths.push(<path key={i} d={`M${x1},${y1} A${rOut},${rOut} 0 ${lg},1 ${x2},${y2} L${xi1},${yi1} A${rIn},${rIn} 0 ${lg},0 ${xi2},${yi2} Z`} fill={s.color} />);
    a += sweep + 0.025;
  });
  const centerSeg = segments.find(s => s.key === centerKey);
  const centerVal = centerSeg ? Math.round((centerSeg.value / total) * 100) : total;
  const centerText = centerLabel ?? `${centerSeg ? centerVal + '%' : centerVal}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize={size * 0.14}
        fontWeight="900" fontFamily='"Space Grotesk", sans-serif' fill={dark ? '#fff' : '#111'}>{centerText}</text>
    </svg>
  );
}

function HBarChart({ members, dark, barH = 20, valueKey = 'measurePct', maxValue, color, colorFn, labelFn }) {
  const T = dark ? DARK : LIGHT;
  const [expanded, setExpanded] = useState(null);
  if (!members.length) return null;
  const max = maxValue != null ? maxValue : Math.max(...members.map(m => m[valueKey] ?? 0), 1);

  const DETAIL_FIELDS = [
    { label: 'MD 完成率', get: m => `${m.measurePct}%`, color: m => progressColor(m.measurePct) },
    { label: 'MP 完成率', get: m => `${m.todoPct}%`, color: m => progressColor(m.todoPct) },
    { label: 'MD 完成/總', get: m => `${m.completedMeasures} / ${m.totalMeasures}`, color: () => B_BLUE },
    { label: 'MP 完成/總', get: m => `${m.doneTodos} / ${m.totalTodos}`, color: () => B_PINK },
    { label: '進行中 MD', get: m => m.inProgressMeasures, color: () => B_CYAN },
    { label: '逾期 MD+MP', get: m => m.overdueMeasures + m.overdueTodos, color: m => (m.overdueMeasures + m.overdueTodos) > 0 ? B_PINK : B_GREEN },
    { label: '負責專案', get: m => m.projects?.length ?? m.projects?.size ?? 0, color: () => B_ORANGE },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {members.map(m => {
        const val = m[valueKey] ?? 0;
        const barPct = max > 0 ? Math.min(100, (val / max) * 100) : 0;
        const c = colorFn ? colorFn(val) : (color ?? B_BLUE);
        const isExp = expanded === m.name;
        return (
          <div key={m.name}>
            <div
              onClick={() => setExpanded(isExp ? null : m.name)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '2px 0',
                background: isExp ? (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)') : 'transparent',
                transition: 'background 0.15s' }}
              onMouseEnter={e => { if (!isExp) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'; }}
              onMouseLeave={e => { if (!isExp) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ width: '72px', fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: isExp ? c : T.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'right', transition: 'color 0.15s' }}>
                {m.name}
              </div>
              <div style={{ flex: 1, height: barH, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', border: `1px solid ${isExp ? c : T.border}`, overflow: 'hidden', position: 'relative', transition: 'border-color 0.15s' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${barPct}%`, background: c, transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)', opacity: isExp ? 1 : 0.75 }} />
              </div>
              <div style={{ width: '38px', fontSize: '11px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: c, flexShrink: 0, textAlign: 'right' }}>
                {labelFn ? labelFn(val) : val}
              </div>
              <div style={{ width: '12px', flexShrink: 0, fontSize: '8px', color: T.textMuted, transition: 'transform 0.2s', transform: isExp ? 'rotate(180deg)' : 'none' }}>▼</div>
            </div>
            {/* Expanded detail panel */}
            {isExp && (
              <div style={{ marginLeft: '80px', marginBottom: '6px', padding: '10px 12px', background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderLeft: `3px solid ${c}`, display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
                {DETAIL_FIELDS.map(f => (
                  <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: '64px' }}>
                    <span style={{ fontSize: '12px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: f.color(m), lineHeight: 1 }}>{f.get(m)}</span>
                    <span style={{ fontSize: '8px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ fontSize: '8.5px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted, textAlign: 'center', marginTop: '4px', opacity: 0.7 }}>點擊條目展開詳細資訊</div>
    </div>
  );
}

function RadarChart({ members, dark, size = 300 }) {
  const T = dark ? DARK : LIGHT;
  const [hoveredMember, setHoveredMember] = useState(null);
  const [hoveredAxisSVG, setHoveredAxisSVG] = useState(null);
  const [hoveredAxisLegend, setHoveredAxisLegend] = useState(null);
  const cx = size / 2, cy = size / 2;
  const r = size * 0.34;

  // More discriminating axes — avoid pure completion % which clusters at 100%
  const maxMD      = Math.max(...members.map(m => m.totalMeasures), 1);
  const maxMP      = Math.max(...members.map(m => m.totalTodos), 1);
  const maxOverdue = Math.max(...members.map(m => m.overdueMeasures + m.overdueTodos), 1);
  const maxInprog  = Math.max(...members.map(m => m.inProgressMeasures), 1);

  // Overdue ratio: INVERSE — less overdue = higher score (discriminates well)
  const overdueRatio = m => {
    const tot = m.totalMeasures + m.totalTodos;
    if (!tot) return 1;
    const od = m.overdueMeasures + m.overdueTodos;
    return Math.max(0, 1 - od / tot);
  };
  // Completion velocity = completed / total across both MD+MP
  const completionVelocity = m => {
    const tot = m.totalMeasures + m.totalTodos;
    if (!tot) return 0;
    return (m.completedMeasures + m.doneTodos) / tot;
  };
  // In-progress engagement — how actively working
  const inProgressRatio = m => {
    if (!m.totalMeasures) return 0;
    return m.inProgressMeasures / Math.max(m.totalMeasures, 1);
  };
  // MP completion rate
  const mpRate = m => m.todoPct / 100;
  // MD completion rate
  const mdRate = m => m.measurePct / 100;
  // 任務健康度：已完成 ÷ (已完成 + 逾期) — 排除未開始雜訊，專注品質
  const taskHealth = m => {
    const done = m.completedMeasures + m.doneTodos;
    const od   = m.overdueMeasures + m.overdueTodos;
    if (done + od === 0) return 0.5; // 無資料居中
    return done / (done + od);
  };

  const AXES = [
    { label: '整體完成速度', color: B_GREEN,
      hint: '衡量成員整體執行效率，完成越多比例越高',
      formula: '(MD已完成 + MP已完成) ÷ (MD總量 + MP總量)',
      val: completionVelocity },
    { label: '無逾期指數',   color: B_CYAN,
      hint: '逾期越少得分越高；0逾期 = 滿分',
      formula: '1 − (MD逾期 + MP逾期) ÷ (MD總量 + MP總量)',
      val: overdueRatio },
    { label: 'MD完成率',    color: B_BLUE,
      hint: '定量指標（MD）的完成進度百分比',
      formula: 'MD已完成 ÷ MD總量 × 100%',
      val: mdRate },
    { label: '進行中積極度', color: B_YELLOW,
      hint: '反映成員主動推進MD的狀態，進行中比例越高越積極',
      formula: 'MD進行中數 ÷ MD總量',
      val: inProgressRatio },
    { label: 'MP完成率',    color: B_PINK,
      hint: '檢核步驟（MP）的完成進度百分比',
      formula: 'MP已完成 ÷ MP總量 × 100%',
      val: mpRate },
    { label: '任務健康度',   color: B_ORANGE,
      hint: '排除未開始任務雜訊，聚焦已啟動任務的品質比率',
      formula: '(MD完成+MP完成) ÷ ((MD完成+MP完成) + (MD逾期+MP逾期))',
      val: taskHealth },
  ];
  const n = AXES.length;
  const COLORS = [B_BLUE, B_PINK, B_GREEN, B_CYAN, B_ORANGE, B_YELLOW, '#9b59b6', '#e74c3c'];
  const pt = (axIdx, v) => {
    const a = (axIdx / n) * 2 * Math.PI - Math.PI / 2;
    return [cx + r * v * Math.cos(a), cy + r * v * Math.sin(a)];
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {/* ring labels */}
        {[0.25, 0.5, 0.75, 1.0].map(ring => (
          <polygon key={ring} points={AXES.map((_, i) => pt(i, ring).join(',')).join(' ')}
            fill={ring === 1.0 ? 'none' : (dark ? `rgba(255,255,255,${ring * 0.06})` : `rgba(0,0,0,${ring * 0.05})`)}
            stroke={dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)'}
            strokeWidth={ring === 1.0 ? 1.5 : 0.8}
            opacity={ring === 1.0 ? 0.6 : 0.5} />
        ))}
        {[25, 50, 75].map(pct => {
          const [x, y] = pt(2, pct / 100);
          return <text key={pct} x={x + 4} y={y + 3} fontSize="7" fontFamily='"Space Grotesk",sans-serif' fontWeight="700" fill={T.textMuted} opacity="0.55">{pct}%</text>;
        })}
        {/* axis lines */}
        {AXES.map((ax, i) => {
          const [x, y] = pt(i, 1);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={ax.color} strokeWidth="0.8" opacity="0.25" />;
        })}
        {/* axis labels with hover tooltip showing formula — independent from legend below */}
        {AXES.map((ax, i) => {
          const [x, y] = pt(i, 1.28);
          const memberHovActive = hoveredMember !== null;
          const isAxisHov = hoveredAxisSVG === i;

          return (
            <g key={i} style={{ cursor: 'help' }}
              onMouseEnter={() => setHoveredAxisSVG(i)}
              onMouseLeave={() => setHoveredAxisSVG(null)}>
              {/* Larger invisible hit area */}
              <rect x={x - 36} y={y - 12} width={72} height={24} fill="transparent" />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                fontSize={isAxisHov ? 9 : 8} fontFamily='"Space Grotesk",sans-serif' fontWeight="900"
                fill={ax.color} letterSpacing="0.04em"
                opacity={memberHovActive && !isAxisHov ? 0.55 : 1}>
                {ax.label}
              </text>

            </g>
          );
        })}
        {/* member polygons — dim non-hovered */}
        {members.map((m, mi) => {
          const vals = AXES.map(ax => Math.max(ax.val(m), 0.02));
          const pts = vals.map((v, i) => pt(i, v).join(',')).join(' ');
          const c = COLORS[mi % COLORS.length];
          const isHov = hoveredMember === m.name;
          const isDimmed = hoveredMember !== null && !isHov;
          return (
            <g key={m.name} style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredMember(m.name)}
              onMouseLeave={() => setHoveredMember(null)}>
              <polygon points={pts} fill={c}
                fillOpacity={isHov ? 0.28 : isDimmed ? 0.04 : 0.13}
                stroke={c} strokeWidth={isHov ? 2.5 : isDimmed ? 0.5 : 1.5}
                strokeOpacity={isHov ? 1 : isDimmed ? 0.3 : 0.8} />
              {AXES.map((ax, i) => {
                const [px, py] = pt(i, vals[i]);
                return <circle key={i} cx={px} cy={py}
                  r={isHov ? 4 : isDimmed ? 1.5 : 2.5}
                  fill={c} opacity={isHov ? 1 : isDimmed ? 0.2 : 0.75} />;
              })}
              {/* hover tooltip values on each axis */}
              {isHov && AXES.map((ax, i) => {
                const [px, py] = pt(i, vals[i]);
                const pct = Math.round(vals[i] * 100);
                const offX = px > cx + 5 ? 8 : px < cx - 5 ? -8 : 0;
                const offY = py > cy + 5 ? 12 : py < cy - 5 ? -10 : 0;
                return (
                  <text key={i} x={px + offX} y={py + offY} textAnchor="middle"
                    fontSize="8" fontFamily='"Space Grotesk",sans-serif' fontWeight="900"
                    fill={c} style={{ pointerEvents: 'none' }}>
                    {pct}%
                  </text>
                );
              })}
            </g>
          );
        })}
        {/* center label when hovered */}
        {hoveredMember && (() => {
          const m = members.find(x => x.name === hoveredMember);
          if (!m) return null;
          return (
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize="9"
              fontFamily='"Space Grotesk",sans-serif' fontWeight="900"
              fill={COLORS[members.indexOf(m) % COLORS.length]}>
              {m.name}
            </text>
          );
        })()}
      </svg>
      {/* HTML tooltip for SVG axis — same style as legend below */}
      {hoveredAxisSVG !== null && (() => {
        const ax = AXES[hoveredAxisSVG];
        if (!ax) return null;
        // Position based on which axis (top/bottom/left/right)
        const [lx, ly] = pt(hoveredAxisSVG, 1.28);
        const fromCenter = lx - cx;
        const fromCenterY = ly - cy;
        const tipLeft = fromCenter > 20 ? 'auto' : fromCenter < -20 ? '0px' : '50%';
        const tipRight = fromCenter > 20 ? '0px' : 'auto';
        const tipTransform = (fromCenter >= -20 && fromCenter <= 20) ? 'translateX(-50%)' : 'none';
        const tipBottom = fromCenterY < 0 ? 'auto' : '100%';
        const tipTop = fromCenterY >= 0 ? 'auto' : '100%';
        return (
          <div style={{
            position: 'absolute',
            top: fromCenterY >= 0 ? `${size * 0.5 + Math.abs(fromCenterY) + 18}px` : 'auto',
            bottom: fromCenterY < 0 ? `${size * 0.5 + Math.abs(fromCenterY) + 10}px` : 'auto',
            left: fromCenter >= -20 && fromCenter <= 20 ? '50%' :
                  fromCenter > 20 ? `${size * 0.5 + fromCenter + 8}px` : 'auto',
            right: fromCenter < -20 ? `${size * 0.5 - fromCenter + 8}px` : 'auto',
            transform: (fromCenter >= -20 && fromCenter <= 20) ? 'translateX(-50%)' : 'none',
            zIndex: 60, width: '220px', pointerEvents: 'none',
            background: dark ? '#1e2124' : '#f5f6f8',
            border: `2px solid ${ax.color}`,
            boxShadow: `4px 4px 0 ${ax.color}55`,
            padding: '10px 12px',
          }}>
            <div style={{ fontSize: '11px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: ax.color, marginBottom: '6px', paddingBottom: '5px', borderBottom: `1px solid ${ax.color}40` }}>{ax.label}</div>
            <div style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: dark ? '#c0c0c0' : '#383838', lineHeight: 1.6, marginBottom: '5px' }}>{ax.hint}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '8px', background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', padding: '4px 6px', borderLeft: `2px solid ${ax.color}`, whiteSpace: 'pre-wrap', color: dark ? '#909090' : '#555555' }}>{ax.formula}</div>
          </div>
        );
      })()}
      </div>
      {/* axis legend — hover to see formula */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', justifyContent: 'center', maxWidth: size + 100 }}>
        {AXES.map(ax => {
          const isHovAx = hoveredAxisLegend === AXES.indexOf(ax);
          return (
            <div key={ax.label} style={{ position: 'relative', display: 'inline-block' }}>
              <div
                onMouseEnter={() => setHoveredAxisLegend(AXES.indexOf(ax))}
                onMouseLeave={() => setHoveredAxisLegend(null)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'help',
                  padding: '3px 6px', borderRadius: '2px',
                  background: isHovAx ? (dark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)') : 'transparent',
                  border: `1px solid ${isHovAx ? ax.color : 'transparent'}`,
                  transition: 'all 0.15s' }}>
                <div style={{ width: '8px', height: '8px', background: ax.color, flexShrink: 0, borderRadius: '1px' }} />
                <span style={{ fontSize: '8.5px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: isHovAx ? 900 : 700, color: isHovAx ? ax.color : T.textMuted, whiteSpace: 'nowrap' }}>{ax.label}</span>
                <span style={{ fontSize: '8px', color: T.textMuted, opacity: 0.6 }}>?</span>
              </div>
              {/* Tooltip popup with full calculation detail */}
              {isHovAx && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                  marginBottom: '6px', zIndex: 50,
                  width: '220px',
                  background: dark ? '#1e2124' : '#f5f6f8',
                  border: `2px solid ${ax.color}`,
                  boxShadow: `4px 4px 0 ${ax.color}55`,
                  padding: '10px 12px',
                  pointerEvents: 'none',
                }}>
                  <div style={{ fontSize: '11px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: ax.color, marginBottom: '6px', paddingBottom: '5px', borderBottom: `1px solid ${ax.color}40` }}>{ax.label}</div>
                  <div style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: dark ? '#c0c0c0' : '#383838', lineHeight: 1.6, marginBottom: '5px' }}>{ax.hint}</div>
                  <div style={{ fontSize: '8.5px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: dark ? '#888' : '#606060', lineHeight: 1.5 }}>
                    <div style={{ fontFamily: 'monospace', background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', padding: '4px 6px', borderLeft: `2px solid ${ax.color}`, marginTop: '4px', whiteSpace: 'pre-wrap' }}>{ax.formula}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', justifyContent: 'center' }}>
        {members.map((m, mi) => {
          const isHov = hoveredMember === m.name;
          return (
            <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', opacity: hoveredMember && !isHov ? 0.4 : 1, transition: 'opacity 0.2s' }}
              onMouseEnter={() => setHoveredMember(m.name)}
              onMouseLeave={() => setHoveredMember(null)}>
              <div style={{ width: '8px', height: '8px', background: COLORS[mi % COLORS.length], flexShrink: 0, outline: isHov ? `2px solid ${COLORS[mi % COLORS.length]}` : 'none', outlineOffset: '1px' }} />
              <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: isHov ? COLORS[mi % COLORS.length] : T.textSub, whiteSpace: 'nowrap' }}>{m.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScatterPlot({ members, dark }) {
  const T = dark ? DARK : LIGHT;
  const [hovered, setHovered] = useState(null);
  const W = 400, H = 310;
  const mg = { t: 20, r: 20, b: 48, l: 48 };
  const pw = W - mg.l - mg.r;
  const ph = H - mg.t - mg.b;
  const maxTasks = Math.max(...members.map(m => m.totalMeasures + m.totalTodos), 1);
  const COLORS = [B_BLUE, B_PINK, B_GREEN, B_CYAN, B_ORANGE, B_YELLOW, '#9b59b6', '#e74c3c', '#16a085', '#2980b9'];

  const quadrantOpacity = dark ? 0.08 : 0.07;
  const quadrants = [
    { x: pw/2, y: 0,    w: pw/2, h: ph/2, label: '高MD低MP', opacity: quadrantOpacity * 0.7, color: B_BLUE },
    { x: pw/2, y: ph/2, w: pw/2, h: ph/2, label: '明星員工', opacity: quadrantOpacity,         color: B_GREEN },
    { x: 0,    y: ph/2, w: pw/2, h: ph/2, label: '低MD高MP', opacity: quadrantOpacity * 0.7, color: B_CYAN },
    { x: 0,    y: 0,    w: pw/2, h: ph/2, label: '需關注',   opacity: quadrantOpacity,         color: B_PINK },
  ];

  const getBubble = (m) => {
    const x = (m.measurePct / 100) * pw;
    const y = ph - (m.todoPct / 100) * ph;
    const bR = 6 + Math.sqrt((m.totalMeasures + m.totalTodos) / maxTasks) * 20;
    return { x, y, bR };
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      {/* Y-axis label: left column, horizontal text stacked vertically */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: '48px', paddingTop: '20px', marginRight: '8px', gap: '4px', flexShrink: 0 }}>
        <span style={{ fontSize: '12px', color: T.textMuted, lineHeight: 1 }}>↑</span>
        <span style={{ fontSize: '8px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: T.textMuted, letterSpacing: '0.06em', whiteSpace: 'nowrap', textAlign: 'center' }}>MP</span>
        <span style={{ fontSize: '8px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: T.textMuted, letterSpacing: '0.06em', whiteSpace: 'nowrap', textAlign: 'center' }}>完成率</span>
        <span style={{ fontSize: '12px', color: T.textMuted, lineHeight: 1 }}>↓</span>
      </div>

      {/* Chart + member list */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <clipPath id="sc-clip2"><rect x={0} y={0} width={pw} height={ph} /></clipPath>
            </defs>
            <g transform={`translate(${mg.l},${mg.t})`}>
              {quadrants.map((q, i) => (
                <g key={i}>
                  <rect x={q.x} y={q.y} width={q.w} height={q.h} fill={q.color} fillOpacity={q.opacity} />
                  <rect x={q.x + q.w/2 - 28} y={q.y + q.h/2 - 9} width={56} height={18} rx="2"
                    fill={dark ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.55)'} />
                  <text x={q.x + q.w/2} y={q.y + q.h/2} textAnchor="middle" dominantBaseline="middle"
                    fontSize="8.5" fontFamily='"Space Grotesk",sans-serif' fontWeight="900"
                    fill={q.color} opacity="0.85" letterSpacing="0.05em">{q.label}</text>
                </g>
              ))}
              {[0, 25, 50, 75, 100].map(v => (
                <g key={v}>
                  <line x1={0} y1={ph - ph*v/100} x2={pw} y2={ph - ph*v/100}
                    stroke={dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}
                    strokeWidth={v===50?1.5:0.7} opacity={v===50?0.9:0.5}
                    strokeDasharray={v===50?'6 4':'3 4'} />
                  <line x1={pw*v/100} y1={0} x2={pw*v/100} y2={ph}
                    stroke={dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}
                    strokeWidth={v===50?1.5:0.7} opacity={v===50?0.9:0.5}
                    strokeDasharray={v===50?'6 4':'3 4'} />
                  <text x={pw*v/100} y={ph+15} textAnchor="middle" fontSize="8"
                    fontFamily='"Space Grotesk",sans-serif' fontWeight="700" fill={T.textMuted}>{v}%</text>
                  <text x={-6} y={ph - ph*v/100 + 3} textAnchor="end" fontSize="8"
                    fontFamily='"Space Grotesk",sans-serif' fontWeight="700" fill={T.textMuted}>{v}%</text>
                </g>
              ))}
              <rect x={0} y={0} width={pw} height={ph} fill="none" stroke={T.border} strokeWidth="1.5" opacity="0.35" />
              <text x={pw/2} y={ph+36} textAnchor="middle" fontSize="9.5"
                fontFamily='"Space Grotesk",sans-serif' fontWeight="900" fill={T.textMuted} letterSpacing="0.07em">
                ← MD 完成率 →
              </text>
              <g clipPath="url(#sc-clip2)">
                {[false, true].map(isHovPass =>
                  members.map((m, i) => {
                    const { x, y, bR } = getBubble(m);
                    const color = COLORS[i % COLORS.length];
                    const isHov = hovered === i;
                    if (isHovPass !== isHov) return null;
                    const isDimmed = hovered !== null && !isHov;
                    return (
                      <g key={m.name} style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHovered(i)}
                        onMouseLeave={() => setHovered(null)}>
                        {isHov && <circle cx={x} cy={y} r={bR+8} fill={color} fillOpacity="0.1" stroke={color} strokeWidth="1" strokeOpacity="0.3"/>}
                        <circle cx={x} cy={y} r={bR}
                          fill={color} fillOpacity={isHov ? 0.82 : isDimmed ? 0.08 : 0.38}
                          stroke={color} strokeWidth={isHov ? 2.5 : isDimmed ? 0.5 : 1.5}
                          strokeOpacity={isHov ? 1 : isDimmed ? 0.12 : 0.75} />
                        {!isHov && !isDimmed && bR > 14 && (
                          <text x={x} y={y+3.5} textAnchor="middle" fontSize="8"
                            fontFamily='"Space Grotesk",sans-serif' fontWeight="900"
                            fill={dark?'rgba(255,255,255,0.9)':'rgba(0,0,0,0.75)'} style={{pointerEvents:'none'}}>
                            {m.name.slice(0, Math.floor(bR/5.5))}
                          </text>
                        )}
                      </g>
                    );
                  })
                )}
              </g>
            </g>
          </svg>

          {/* Floating tooltip */}
          {hovered !== null && (() => {
            const m = members[hovered];
            const { x, y, bR } = getBubble(m);
            const color = COLORS[hovered % COLORS.length];
            const overdueTot = m.overdueMeasures + m.overdueTodos;
            const totalTasks = m.totalMeasures + m.totalTodos;
            const absX = mg.l + x + bR + 10;
            const absY = mg.t + y - 10;
            const flipLeft = absX + 186 > W + 50;
            return (
              <div style={{
                position: 'absolute',
                top: Math.max(0, Math.min(absY, H - 185)),
                left: flipLeft ? mg.l + x - bR - 196 : absX,
                width: '182px',
                background: dark ? 'rgba(26,28,30,0.98)' : 'rgba(237,238,240,0.98)',
                border: `2px solid ${color}`,
                boxShadow: `4px 4px 0 ${color}44`,
                padding: '10px 12px',
                pointerEvents: 'none',
                zIndex: 20,
              }}>
                <div style={{ fontSize: '12px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color, marginBottom: '7px', borderBottom: `1px solid ${color}30`, paddingBottom: '5px' }}>
                  {m.name}
                </div>
                {[
                  { label: 'MD 完成率', value: `${m.measurePct}%`, color: progressColor(m.measurePct) },
                  { label: 'MP 完成率', value: `${m.todoPct}%`,   color: progressColor(m.todoPct) },
                  { label: 'MD 完成/總', value: `${m.completedMeasures}/${m.totalMeasures}`, color: B_BLUE },
                  { label: 'MP 完成/總', value: `${m.doneTodos}/${m.totalTodos}`, color: B_PINK },
                  { label: '進行中 MD', value: m.inProgressMeasures, color: B_CYAN },
                  { label: '逾期 (MD+MP)', value: overdueTot, color: overdueTot>0 ? B_PINK : B_GREEN },
                  { label: '負責專案', value: m.projects?.length ?? m.projects?.size ?? 0, color: B_ORANGE },
                  { label: '總任務量', value: `${totalTasks} 項`, color: T.textSub },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontSize: '8.5px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted }}>{row.label}</span>
                    <span style={{ fontSize: '11px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Member list sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '100px', paddingTop: '20px' }}>
          <div style={{ fontSize: '8px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>成員列表</div>
          {members.map((m, i) => {
            const color = COLORS[i % COLORS.length];
            const isHov = hovered === i;
            return (
              <div key={m.name}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                  padding: '3px 6px',
                  background: isHov ? `${color}18` : 'transparent',
                  border: `1px solid ${isHov ? color : 'transparent'}`,
                  transition: 'all 0.15s',
                }}>
                <div style={{ width: '7px', height: '7px', background: color, flexShrink: 0, borderRadius: '50%', outline: isHov ? `2px solid ${color}55` : 'none', outlineOffset: '1px' }} />
                <span style={{ fontSize: '10px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: isHov ? 900 : 700, color: isHov ? color : T.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '84px' }}>
                  {m.name}
                </span>
              </div>
            );
          })}
          <div style={{ marginTop: '6px', fontSize: '7.5px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted, lineHeight: 1.5 }}>
            懸停定位氣泡<br/>氣泡大小＝任務量
          </div>
        </div>
      </div>
    </div>
  );
}

function computeTreemap(nodes, x, y, w, h) {
  if (!nodes.length) return [];
  if (nodes.length === 1) return [{ ...nodes[0], x, y, w, h }];
  const total = nodes.reduce((s, n) => s + n.value, 0);
  if (!total) return nodes.map(n => ({ ...n, x, y, w: 0, h: 0 }));
  let acc = 0, pivot = 1;
  for (let i = 0; i < nodes.length; i++) {
    acc += nodes[i].value;
    if (acc >= total / 2 || i >= nodes.length - 2) { pivot = i + 1; break; }
  }
  const left  = nodes.slice(0, pivot);
  const right = nodes.slice(pivot);
  const frac  = left.reduce((s, n) => s + n.value, 0) / total;
  if (w >= h) {
    return [
      ...computeTreemap(left,  x,           y, w * frac,        h),
      ...computeTreemap(right, x + w * frac, y, w * (1 - frac), h),
    ];
  }
  return [
    ...computeTreemap(left,  x, y,           w, h * frac),
    ...computeTreemap(right, x, y + h * frac, w, h * (1 - frac)),
  ];
}
const TM_COLORS = [B_BLUE, B_PINK, B_CYAN, B_GREEN, B_ORANGE, B_YELLOW, '#9b59b6', '#e67e22', '#16a085', '#c0392b', '#2980b9', '#8e44ad'];

function TreemapChart({ items, dark, W = 600, H = 340 }) {
  const T = dark ? DARK : LIGHT;
  const [hovered, setHovered] = useState(null);
  const sorted = [...items].filter(i => i.value > 0).sort((a, b) => b.value - a.value);
  const rects  = computeTreemap(sorted, 0, 0, W, H);
  const GAP = 4;
  const hovR = hovered ? rects.find(r => r.label === hovered) : null;
  const totalTasks = sorted.reduce((s, i) => s + i.value, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
      <div style={{ width: W, flexShrink: 0 }}>
        <svg width={W} height={H} style={{ display: 'block' }}>
          {rects.map(r => {
            const isHov = hovered === r.label;
            const rx = r.x + GAP / 2, ry = r.y + GAP / 2;
            const rw = Math.max(0, r.w - GAP), rh = Math.max(0, r.h - GAP);
            const pct = totalTasks > 0 ? Math.round((r.value / totalTasks) * 100) : 0;
            const completedTotal = (r.completedMD ?? 0) + (r.completedMP ?? 0);
            const completionPct = r.value > 0 ? Math.round((completedTotal / r.value) * 100) : 0;
            return (
              <g key={r.label}
                onMouseEnter={() => setHovered(r.label)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'default' }}>
                {/* Background fill */}
                <rect x={rx} y={ry} width={rw} height={rh}
                  fill={r.color} fillOpacity={isHov ? 0.75 : 0.45}
                  stroke={isHov ? r.color : T.border}
                  strokeWidth={isHov ? 2.5 : 0.8} strokeOpacity={isHov ? 1 : 0.4} />
                {/* Completion bar at bottom of each cell */}
                {rw > 20 && rh > 16 && completionPct > 0 && (
                  <rect x={rx} y={ry + rh - 5} width={rw * completionPct / 100} height={5}
                    fill={B_GREEN} fillOpacity={isHov ? 0.9 : 0.7} />
                )}
                {/* Name */}
                {rw > 38 && rh > 22 && (
                  <text x={rx + 7} y={ry + 16} fontSize="10" fontFamily='"Space Grotesk",sans-serif'
                    fontWeight="900" fill={T.text} style={{ pointerEvents: 'none' }}>
                    {r.label.length * 8 > rw - 16
                      ? r.label.slice(0, Math.max(1, Math.floor((rw - 20) / 8))) + '\u2026'
                      : r.label}
                  </text>
                )}
                {/* MD · MP counts */}
                {rw > 55 && rh > 42 && (
                  <text x={rx + 7} y={ry + 30} fontSize="8.5" fontFamily='"Space Grotesk",sans-serif'
                    fontWeight="700" fill={T.textMuted} style={{ pointerEvents: 'none' }}>
                    MD {r.md} · MP {r.mp}
                  </text>
                )}
                {/* Total task count badge */}
                {rw > 55 && rh > 55 && (
                  <text x={rx + 7} y={ry + 44} fontSize="8" fontFamily='"Space Grotesk",sans-serif'
                    fontWeight="700" fill={r.color} style={{ pointerEvents: 'none' }}>
                    共 {r.value} 項 ({pct}%)
                  </text>
                )}
                {/* Completion % */}
                {rw > 55 && rh > 68 && (
                  <text x={rx + 7} y={ry + 57} fontSize="8" fontFamily='"Space Grotesk",sans-serif'
                    fontWeight="900" fill={B_GREEN} style={{ pointerEvents: 'none' }}>
                    ✓ {completionPct}% 完成
                  </text>
                )}
                {/* Large pct watermark for big cells */}
                {rw > 100 && rh > 80 && (
                  <text x={rx + rw - 10} y={ry + rh - 14} textAnchor="end"
                    fontSize={Math.min(32, rh * 0.3)} fontFamily='"Space Grotesk",sans-serif'
                    fontWeight="900" fill={r.color} fillOpacity="0.18"
                    style={{ pointerEvents: 'none' }}>
                    {r.value}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltip / detail row */}
      {hovR ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
          justifyContent: 'center',
          padding: '10px 14px',
          width: '100%',
          background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          border: `2px solid ${hovR.color}`,
          boxShadow: `3px 3px 0 ${hovR.color}44`,
        }}>
          <span style={{ fontSize: '12px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: hovR.color, minWidth: '80px' }}>{hovR.label}</span>
          {[
            { label: 'MD 任務', value: hovR.md, color: B_BLUE },
            { label: 'MP 步驟', value: hovR.mp, color: B_PINK },
            { label: '總任務量', value: hovR.value, color: T.textSub },
            { label: '佔比', value: `${totalTasks > 0 ? Math.round((hovR.value / totalTasks) * 100) : 0}%`, color: hovR.color },
            { label: '已完成', value: `${(hovR.completedMD ?? 0) + (hovR.completedMP ?? 0)} 項`, color: B_GREEN },
            { label: '完成率', value: `${hovR.value > 0 ? Math.round(((hovR.completedMD ?? 0) + (hovR.completedMP ?? 0)) / hovR.value * 100) : 0}%`, color: progressColor(hovR.value > 0 ? Math.round(((hovR.completedMD ?? 0) + (hovR.completedMP ?? 0)) / hovR.value * 100) : 0) },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '1px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.value}</span>
              <span style={{ fontSize: '8px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 12px', justifyContent: 'center' }}>
            {sorted.slice(0, 8).map((item, i) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '8px', height: '8px', background: TM_COLORS[i % TM_COLORS.length], flexShrink: 0 }} />
                <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted }}>
                  {item.label} <strong style={{ color: T.textSub }}>{item.value}</strong>
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted, textAlign: 'center' }}>
            游標懸停格子查看詳情 · 底部綠色條 ＝ 完成進度
          </div>
        </div>
      )}
    </div>
  );
}

function RadarSection({ stats, dark }) {
  const T = dark ? DARK : LIGHT;
  const sh = dark ? 'rgba(255,255,255,0.15)' : '#000';
  const [radarFocus, setRadarFocus] = useState('__top5__');
  const top5 = useMemo(
    () => [...stats].sort((a, b) => (b.measurePct + b.todoPct) - (a.measurePct + a.todoPct)).slice(0, 5),
    [stats]
  );
  const radarOptions = [
    { value: '__top5__', label: '前五名對比' },
    ...stats.map(m => ({ value: m.name, label: m.name })),
  ];
  const displayMembers = radarFocus === '__top5__'
    ? top5
    : stats.filter(m => m.name === radarFocus);
  const radarTitle = radarFocus === '__top5__'
    ? '負責人多維雷達圖 — 前五名'
    : `負責人多維雷達圖 — ${radarFocus}`;
  return (
    <div style={{ background: dark ? 'rgba(30,33,36,0.82)' : 'rgba(230,231,234,0.82)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: `2px solid ${T.border}`, boxShadow: `4px 4px 0 ${sh}`, padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <span style={{ fontSize: '10px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: B_YELLOW }}>{radarTitle}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textMuted }}>顯示</span>
        <BrutalistSelect
          value={radarFocus}
          onChange={setRadarFocus}
          options={radarOptions}
          darkMode={dark}
          style={{ minWidth: '150px', fontSize: '10px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900 }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <RadarChart members={displayMembers} dark={dark} size={300} />
      </div>
    </div>
  );
}

function ChartLegend({ segments, dark }) {
  const T = dark ? DARK : LIGHT;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 8px', justifyContent: 'center' }}>
      {segments.filter(s => s.value > 0).map(s => (
        <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '8px', height: '8px', background: s.color, flexShrink: 0 }} />
          <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, color: T.textMuted, whiteSpace: 'nowrap' }}>
            {s.label} <strong style={{ color: T.text }}>{s.value}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}

function StackedHBarChart({ members, dark, segments, barH = 20 }) {
  const T = dark ? DARK : LIGHT;
  const [expanded, setExpanded] = useState(null);
  const sorted = [...members]
    .sort((a, b) => {
      const totA = segments.reduce((s, seg) => s + seg.getVal(a), 0);
      const totB = segments.reduce((s, seg) => s + seg.getVal(b), 0);
      return totB - totA;
    })
    .slice(0, 10);
  const maxTot = Math.max(...sorted.map(m => segments.reduce((s, seg) => s + seg.getVal(m), 0)), 1);

  const EXTRA_FIELDS = [
    { label: 'MD 完成率', get: m => `${m.measurePct}%`, color: m => progressColor(m.measurePct) },
    { label: 'MP 完成率', get: m => `${m.todoPct}%`, color: m => progressColor(m.todoPct) },
    { label: '逾期 MD+MP', get: m => m.overdueMeasures + m.overdueTodos, color: m => (m.overdueMeasures + m.overdueTodos) > 0 ? B_PINK : B_GREEN },
    { label: '負責專案', get: m => m.projects?.length ?? m.projects?.size ?? 0, color: () => B_ORANGE },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 10px', marginBottom: '4px' }}>
        {segments.map(seg => (
          <div key={seg.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, color: T.textMuted }}>{seg.label}</span>
          </div>
        ))}
      </div>
      {sorted.map(m => {
        const tot = segments.reduce((s, seg) => s + seg.getVal(m), 0);
        const isExp = expanded === m.name;
        // pick a representative color from first non-zero segment
        const repSeg = segments.find(s => s.getVal(m) > 0);
        const repColor = repSeg ? repSeg.color : T.textSub;
        return (
          <div key={m.name}>
            <div
              onClick={() => setExpanded(isExp ? null : m.name)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '2px 0',
                background: isExp ? (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)') : 'transparent',
                transition: 'background 0.15s' }}
            >
              <div style={{ width: '72px', fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: isExp ? T.text : T.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'right' }}>
                {m.name}
              </div>
              <div style={{ flex: 1, height: barH, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', border: `1px solid ${isExp ? T.text : T.border}`, overflow: 'hidden', display: 'flex', transition: 'border-color 0.15s' }}>
                {segments.map(seg => {
                  const val = seg.getVal(m);
                  const w = maxTot > 0 ? (val / maxTot) * 100 : 0;
                  return w > 0 ? <div key={seg.key} style={{ height: '100%', width: `${w}%`, background: seg.color, transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)', flexShrink: 0 }} /> : null;
                })}
              </div>
              <div style={{ width: '24px', fontSize: '11px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: T.textSub, flexShrink: 0, textAlign: 'right' }}>
                {tot}
              </div>
              <div style={{ width: '12px', flexShrink: 0, fontSize: '8px', color: T.textMuted, transition: 'transform 0.2s', transform: isExp ? 'rotate(180deg)' : 'none' }}>▼</div>
            </div>
            {/* Expanded detail */}
            {isExp && (
              <div style={{ marginLeft: '80px', marginBottom: '6px', padding: '10px 12px', background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderLeft: `3px solid ${repColor}`, display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
                {segments.map(seg => (
                  <div key={seg.key} style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: '52px' }}>
                    <span style={{ fontSize: '12px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: seg.color, lineHeight: 1 }}>{seg.getVal(m)}</span>
                    <span style={{ fontSize: '8px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{seg.label}</span>
                  </div>
                ))}
                <div style={{ width: '100%', height: '1px', background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', margin: '2px 0' }} />
                {EXTRA_FIELDS.map(f => (
                  <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: '64px' }}>
                    <span style={{ fontSize: '12px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: f.color(m), lineHeight: 1 }}>{f.get(m)}</span>
                    <span style={{ fontSize: '8px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ fontSize: '8.5px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted, textAlign: 'center', marginTop: '4px', opacity: 0.7 }}>點擊條目展開詳細資訊</div>
    </div>
  );
}

function DistributionCard({ title, titleColor, donuts, dark, sh, T }) {
  const [activeIdx, setActiveIdx] = useState(null);
  return (
    <div style={{ background: dark ? 'rgba(30,33,36,0.82)' : 'rgba(230,231,234,0.82)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: `2px solid ${T.border}`, boxShadow: `4px 4px 0 ${sh}`, padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <span style={{ fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: titleColor }}>{title}</span>
      <div style={{ display: 'flex' }}>
        {donuts.map((d, i) => {
          const isActive = activeIdx === i;
          return (
            <div
              key={i}
              onClick={() => setActiveIdx(isActive ? null : i)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                cursor: 'pointer', padding: '10px 8px',
                background: isActive ? (dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') : 'transparent',
                outline: isActive ? `2px solid ${d.subColor}55` : '2px solid transparent',
                transition: 'background 0.15s, outline 0.15s',
              }}
            >
              <DonutChart segments={d.segments} dark={dark} total={d.total} centerKey={d.centerKey ?? 'done'} size={120} />
              <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: d.subColor }}>{d.subLabel}</span>
              <ChartLegend segments={d.segments} dark={dark} />
              <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, color: isActive ? d.subColor : T.textMuted, opacity: 0.8 }}>
                {isActive ? '▲ 收起' : '▼ 明細'}
              </span>
            </div>
          );
        })}
      </div>
      {activeIdx !== null && (
        <div style={{ borderTop: `2px solid ${T.border}`, paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: donuts[activeIdx].subColor }}>
            {donuts[activeIdx].drillTitle}
          </span>
          {donuts[activeIdx].drillContent}
        </div>
      )}
    </div>
  );
}

// ─── OVERDUE RISK MATRIX ───────────────────────────────────────────────────────
function OverdueRiskMatrix({ members, dark }) {
  const T = dark ? DARK : LIGHT;
  const [hovered, setHovered] = useState(null);
  const W = 420, H = 310;
  const mg = { t: 20, r: 20, b: 48, l: 48 };
  const pw = W - mg.l - mg.r;
  const ph = H - mg.t - mg.b;

  const maxLoad = Math.max(...members.map(m => m.totalMeasures + m.totalTodos), 1);
  const COLORS  = [B_BLUE, B_PINK, B_GREEN, B_CYAN, B_ORANGE, B_YELLOW, '#9b59b6', '#e74c3c', '#16a085', '#2980b9'];

  // Y-axis: load increases UPWARD (standard Cartesian).
  // Top-left = high load + low overdue → 高負擔低逾期
  // Bottom-left = low load + low overdue → 低負擔低逾期
  // Top-right = high load + high overdue → 高風險
  // Bubble size = total tasks (3rd dimension, shows absolute scale impact)
  const zones = [
    { x: 0,       y: 0,    w: pw*0.33, h: ph/2, color: B_CYAN,   label: '高負擔低逾期', opacity: 0.05 },
    { x: 0,       y: ph/2, w: pw*0.33, h: ph/2, color: B_GREEN,  label: '低負擔低逾期', opacity: 0.05 },
    { x: pw*0.33, y: 0,    w: pw*0.34, h: ph/2, color: B_ORANGE, label: '需注意',       opacity: 0.05 },
    { x: pw*0.33, y: ph/2, w: pw*0.34, h: ph/2, color: B_YELLOW, label: '中度風險',     opacity: 0.04 },
    { x: pw*0.67, y: 0,    w: pw*0.33, h: ph/2, color: B_PINK,   label: '高風險',       opacity: 0.07 },
    { x: pw*0.67, y: ph/2, w: pw*0.33, h: ph/2, color: B_ORANGE, label: '逾期偏高',     opacity: 0.05 },
  ];

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: '48px', paddingTop: '20px', marginRight: '8px', gap: '4px', flexShrink: 0 }}>
        <span style={{ fontSize: '12px', color: T.textMuted, lineHeight: 1 }}>↑</span>
        <span style={{ fontSize: '8px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: T.textMuted, whiteSpace: 'nowrap', textAlign: 'center' }}>任務</span>
        <span style={{ fontSize: '8px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: T.textMuted, whiteSpace: 'nowrap', textAlign: 'center' }}>負擔量</span>
        <span style={{ fontSize: '12px', color: T.textMuted, lineHeight: 1 }}>↓</span>
      </div>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
            <defs><clipPath id="risk-clip"><rect x={0} y={0} width={pw} height={ph} /></clipPath></defs>
            <g transform={`translate(${mg.l},${mg.t})`}>
              {zones.map((z, i) => {
                const lx = z.x + z.w / 2, ly = z.y + z.h / 2;
                const pillW = 56, pillH = 18;
                return (
                  <g key={i}>
                    <rect x={z.x} y={z.y} width={z.w} height={z.h} fill={z.color} fillOpacity={z.opacity} />
                    <rect x={lx - pillW/2} y={ly - pillH/2} width={pillW} height={pillH} rx="3"
                      fill={dark ? 'rgba(0,0,0,0.48)' : 'rgba(255,255,255,0.68)'} />
                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                      fontSize="8.5" fontFamily='"Space Grotesk",sans-serif' fontWeight="900"
                      fill={z.color} opacity="0.95" letterSpacing="0.04em">{z.label}</text>
                  </g>
                );
              })}
              {[0, 33, 67, 100].map(v => (
                <g key={v}>
                  <line x1={pw*v/100} y1={0} x2={pw*v/100} y2={ph} stroke={dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.28)'} strokeWidth="1" opacity="0.7" strokeDasharray="4 4" />
                  <text x={pw*v/100} y={ph+15} textAnchor="middle" fontSize="8" fontFamily='"Space Grotesk",sans-serif' fontWeight="700" fill={T.textMuted}>{v}%</text>
                </g>
              ))}
              {[0, 25, 50, 75, 100].map(v => (
                <g key={v}>
                  <line x1={0} y1={ph - ph*v/100} x2={pw} y2={ph - ph*v/100} stroke={dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.22)'} strokeWidth="0.8" opacity="0.6" strokeDasharray="3 4" />
                  <text x={-6} y={ph - ph*v/100 + 3} textAnchor="end" fontSize="8" fontFamily='"Space Grotesk",sans-serif' fontWeight="700" fill={T.textMuted}>{v}%</text>
                </g>
              ))}
              <rect x={0} y={0} width={pw} height={ph} fill="none" stroke={T.border} strokeWidth="1.5" opacity="0.35" />
              <text x={pw/2} y={ph+36} textAnchor="middle" fontSize="9.5" fontFamily='"Space Grotesk",sans-serif' fontWeight="900" fill={T.textMuted} letterSpacing="0.07em">← 逾期比率 (逾期 ÷ 總任務) →</text>
              <g clipPath="url(#risk-clip)">
                {[false, true].map(isHovPass =>
                  members.map((m, i) => {
                    const overdueTot   = m.overdueMeasures + m.overdueTodos;
                    const totalTasks   = m.totalMeasures + m.totalTodos;
                    const overdueRatio = totalTasks > 0 ? (overdueTot / totalTasks) * 100 : 0;
                    const loadRatio    = (totalTasks / maxLoad) * 100;
                    const px = (overdueRatio / 100) * pw;
                    const py = ph - (loadRatio / 100) * ph; // high load → near top (small py)
                    const bR = 6 + Math.sqrt(totalTasks / maxLoad) * 20; // bubble = total tasks
                    const color     = COLORS[i % COLORS.length];
                    const isHov     = hovered === i;
                    const isDimmed  = hovered !== null && !isHov;
                    // Risk color aligned to zone X-axis boundaries (33% / 67%)
                    const riskColor = overdueRatio >= 67 ? B_PINK : overdueRatio >= 33 ? B_ORANGE : color;
                    if (isHovPass !== isHov) return null;
                    return (
                      <g key={m.name} style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
                        {isHov && <circle cx={px} cy={py} r={bR+8} fill={riskColor} fillOpacity="0.1" stroke={riskColor} strokeWidth="1" strokeOpacity="0.3" />}
                        <circle cx={px} cy={py} r={bR}
                          fill={riskColor} fillOpacity={isHov ? 0.82 : isDimmed ? 0.08 : 0.42}
                          stroke={riskColor} strokeWidth={isHov ? 2.5 : isDimmed ? 0.5 : 1.5}
                          strokeOpacity={isHov ? 1 : isDimmed ? 0.12 : 0.82} />
                        {!isHov && !isDimmed && bR > 13 && (
                          <text x={px} y={py+3.5} textAnchor="middle" fontSize="7.5" fontFamily='"Space Grotesk",sans-serif' fontWeight="900"
                            fill={dark?'rgba(255,255,255,0.9)':'rgba(0,0,0,0.75)'} style={{pointerEvents:'none'}}>
                            {m.name.slice(0, Math.floor(bR/4.5))}
                          </text>
                        )}
                      </g>
                    );
                  })
                )}
              </g>
            </g>
          </svg>
          {hovered !== null && (() => {
            const m           = members[hovered];
            const overdueTot  = m.overdueMeasures + m.overdueTodos;
            const totalTasks  = m.totalMeasures + m.totalTodos;
            const overdueRatio = totalTasks > 0 ? Math.round((overdueTot / totalTasks) * 100) : 0;
            const loadRatio   = Math.round((totalTasks / maxLoad) * 100);
            const color       = COLORS[hovered % COLORS.length];
            // Risk level based on zone boundaries: X: 0-33% low, 33-67% mid, 67-100% high
            //                                              Y: >50% high load, <=50% low load
            const highLoad    = loadRatio > 50;
            const riskTier    = overdueRatio >= 67 ? 2 : overdueRatio >= 33 ? 1 : 0;
            const RISK_META   = [
              { color: B_GREEN,  label: '✓ 低逾期',   zone: highLoad ? '高負擔低逾期' : '低負擔低逾期' },
              { color: B_ORANGE, label: '△ 需注意',   zone: highLoad ? '需注意'       : '中度風險'     },
              { color: B_PINK,   label: '⚠ 高風險',   zone: highLoad ? '高風險'       : '逾期偏高'     },
            ];
            const riskColor   = RISK_META[riskTier].color;
            const riskLabel   = RISK_META[riskTier].label;
            const zoneLabel   = RISK_META[riskTier].zone;
            const px          = (overdueRatio / 100) * pw;
            const py          = ph - (loadRatio / 100) * ph;
            const absX        = mg.l + px + 20;
            const flipLeft    = absX + 190 > W + 40;
            const absY        = mg.t + py - 10;
            return (
              <div style={{ position: 'absolute', top: Math.max(0, Math.min(absY, H - 200)), left: flipLeft ? absX - 202 : absX,
                width: '188px', background: dark ? 'rgba(26,28,30,0.98)' : 'rgba(237,238,240,0.98)',
                border: `2px solid ${riskColor}`, boxShadow: `4px 4px 0 ${riskColor}44`,
                padding: '10px 12px', pointerEvents: 'none', zIndex: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px', paddingBottom: '5px', borderBottom: `1px solid ${riskColor}30` }}>
                  <span style={{ fontSize: '12px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color }}>{m.name}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ fontSize: '8.5px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: riskColor, background: `${riskColor}22`, padding: '2px 6px' }}>{riskLabel}</span>
                    <span style={{ fontSize: '7.5px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted, opacity: 0.8 }}>{zoneLabel}</span>
                  </div>
                </div>
                {[
                  { label: '逾期比率',   value: `${overdueRatio}%`,              color: riskColor },
                  { label: '逾期 MD+MP', value: `${overdueTot} 項`,              color: B_PINK },
                  { label: '總任務量',   value: `${totalTasks} 項`,              color: T.textSub },
                  { label: '負擔量 / 最高', value: `${totalTasks} / ${maxLoad} 項`, color: B_CYAN },
                  { label: 'MD 進行中',  value: `${m.inProgressMeasures} 項`,    color: B_CYAN },
                  { label: 'MD 完成率',  value: `${m.measurePct}%`,              color: progressColor(m.measurePct) },
                  { label: 'MP 完成率',  value: `${m.todoPct}%`,                 color: progressColor(m.todoPct) },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '8.5px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted }}>{row.label}</span>
                    <span style={{ fontSize: '11px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: row.color }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ marginTop: '6px', paddingTop: '5px', borderTop: `1px solid ${riskColor}30`, fontSize: '7.5px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted }}>
                  氣泡大小 ＝ 任務總數（第三維度）
                </div>
              </div>
            );
          })()}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '100px', paddingTop: '20px' }}>
          <div style={{ fontSize: '8px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>成員列表</div>
          {members.map((m, i) => {
            const overdueTot = m.overdueMeasures + m.overdueTodos;
            const totalTasks = m.totalMeasures + m.totalTodos;
            const overdueR   = totalTasks > 0 ? (overdueTot / totalTasks) * 100 : 0;
            // Align sidebar dot color to zone boundaries
            const riskColor  = overdueR >= 67 ? B_PINK : overdueR >= 33 ? B_ORANGE : COLORS[i % COLORS.length];
            const isHov      = hovered === i;
            return (
              <div key={m.name} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '3px 6px',
                  background: isHov ? `${riskColor}18` : 'transparent', border: `1px solid ${isHov ? riskColor : 'transparent'}`, transition: 'all 0.15s' }}>
                <div style={{ width: '7px', height: '7px', background: riskColor, flexShrink: 0, borderRadius: '50%', outline: isHov ? `2px solid ${riskColor}55` : 'none', outlineOffset: '1px' }} />
                <span style={{ fontSize: '10px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: isHov ? 900 : 700, color: isHov ? riskColor : T.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '84px' }}>{m.name}</span>
              </div>
            );
          })}
          <div style={{ marginTop: '6px', fontSize: '7.5px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted, lineHeight: 1.6 }}>
            懸停定位氣泡<br/>紅色＝高逾期風險<br/>氣泡大小＝任務總數
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkloadBalanceChart({ members, dark }) {
  const T = dark ? DARK : LIGHT;
  const [hovered, setHovered] = useState(null);
  if (!members.length) return null;
  const sorted = [...members].sort((a, b) => (b.totalMeasures + b.totalTodos) - (a.totalMeasures + a.totalTodos));
  const maxTotal = Math.max(...sorted.map(m => m.totalMeasures + m.totalTodos), 1);

  const BAR_H = 28;
  const GAP = 6;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginBottom: '4px' }}>
        {[
          { color: B_GREEN,  label: 'MD 已完成' },
          { color: B_CYAN,   label: 'MD 進行中' },
          { color: B_PINK,   label: 'MD 逾期' },
          { color: dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)', label: 'MD 未開始' },
          { color: '#50fa7b', label: 'MP 已完成', border: `1px dashed ${B_GREEN}` },
          { color: '#ff79c6', label: 'MP 逾期', border: `1px dashed ${B_PINK}` },
          { color: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)', label: 'MP 未完成', border: `1px dashed ${T.border}` },
        ].map(seg => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', background: seg.color, flexShrink: 0, border: seg.border || 'none' }} />
            <span style={{ fontSize: '8.5px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted }}>{seg.label}</span>
          </div>
        ))}
      </div>

      {sorted.map((m, i) => {
        const total = m.totalMeasures + m.totalTodos;
        const barWidth = total / maxTotal;
        const isHov = hovered === i;

        // MD segments
        const mdDone = m.completedMeasures;
        const mdProg = m.inProgressMeasures;
        const mdOver = m.overdueMeasures;
        const mdOther = Math.max(0, m.totalMeasures - mdDone - mdProg - mdOver);
        // MP segments
        const mpDone = m.doneTodos;
        const mpOver = m.overdueTodos;
        const mpOther = Math.max(0, m.totalTodos - mpDone - mpOver);

        const totalForBar = Math.max(total, 1);
        const segs = [
          { w: mdDone  / totalForBar, color: B_GREEN,  opacity: isHov ? 0.95 : 0.75 },
          { w: mdProg  / totalForBar, color: B_CYAN,   opacity: isHov ? 0.95 : 0.75 },
          { w: mdOver  / totalForBar, color: B_PINK,   opacity: isHov ? 0.95 : 0.75 },
          { w: mdOther / totalForBar, color: dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)', opacity: 1 },
          { w: mpDone  / totalForBar, color: '#50fa7b', opacity: isHov ? 0.8 : 0.55, dashed: true },
          { w: mpOver  / totalForBar, color: '#ff79c6', opacity: isHov ? 0.8 : 0.55, dashed: true },
          { w: mpOther / totalForBar, color: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)', opacity: 1, dashed: true },
        ];

        const completionPct = total > 0 ? Math.round(((m.completedMeasures + m.doneTodos) / total) * 100) : 0;
        const overduePct    = total > 0 ? Math.round(((m.overdueMeasures + m.overdueTodos) / total) * 100) : 0;

        return (
          <div key={m.name}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'default' }}>
            {/* Name */}
            <div style={{ width: '80px', fontSize: '10px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: isHov ? T.text : T.textSub, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {m.name}
            </div>
            {/* Bar */}
            <div style={{ flex: 1, height: BAR_H, background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${isHov ? T.text : T.border}`, overflow: 'hidden', display: 'flex', position: 'relative', transition: 'border-color 0.15s' }}>
              {segs.filter(s => s.w > 0).map((seg, si) => (
                <div key={si} style={{
                  height: '100%', width: `${seg.w * barWidth * 100}%`,
                  background: seg.color, opacity: seg.opacity,
                  borderRight: seg.dashed ? `1px dashed ${T.border}` : 'none',
                  transition: 'opacity 0.2s',
                  flexShrink: 0,
                }} />
              ))}
              {/* Completion % overlay */}
              {isHov && (
                <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: T.text, letterSpacing: '0.04em' }}>
                  ✓{completionPct}% {overduePct > 0 ? `· ⚠${overduePct}%` : ''}
                </div>
              )}
            </div>
            {/* Total count */}
            <div style={{ width: '38px', fontSize: '11px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: isHov ? T.text : T.textMuted, flexShrink: 0, textAlign: 'right' }}>
              {total}
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted, textAlign: 'center', marginTop: '4px' }}>
        橫條長度 ＝ 相對任務量；MD 實線 · MP 虛線；游標懸停顯示完成 / 逾期率
      </div>
    </div>
  );
}


// ─── ASSIGNEE TOTAL TASK BAR CHART ────────────────────────────────────────────
function AssigneeBarChart({ members, dark }) {
  const T = dark ? DARK : LIGHT;
  const [expanded, setExpanded] = useState(null);
  const sorted = [...members].sort((a, b) => (b.totalMeasures + b.totalTodos) - (a.totalMeasures + a.totalTodos));
  const maxTotal = Math.max(...sorted.map(m => m.totalMeasures + m.totalTodos), 1);
  const BAR_H = 20;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {sorted.map((m, i) => {
        const total = m.totalMeasures + m.totalTodos;
        const mdW = maxTotal > 0 ? (m.totalMeasures / maxTotal) * 100 : 0;
        const mpW = maxTotal > 0 ? (m.totalTodos / maxTotal) * 100 : 0;
        const isExp = expanded === m.name;
        const barColor = i === 0 ? B_ORANGE : i < 3 ? B_CYAN : B_BLUE;
        return (
          <div key={m.name}>
            <div onClick={() => setExpanded(isExp ? null : m.name)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '2px 0',
                background: isExp ? (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)') : 'transparent' }}>
              <div style={{ width: '64px', fontSize: '9.5px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: isExp ? barColor : T.textSub, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.name}
              </div>
              <div style={{ flex: 1, height: BAR_H, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', border: `1px solid ${isExp ? barColor : T.border}`, overflow: 'hidden', display: 'flex' }}>
                <div style={{ height: '100%', width: `${mdW}%`, background: B_BLUE, opacity: 0.75, flexShrink: 0 }} />
                <div style={{ height: '100%', width: `${mpW}%`, background: B_PINK, opacity: 0.6, flexShrink: 0 }} />
              </div>
              <div style={{ width: '36px', fontSize: '10px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: barColor, flexShrink: 0, textAlign: 'right' }}>{total}</div>
              <div style={{ width: '10px', flexShrink: 0, fontSize: '7px', color: T.textMuted, transform: isExp ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</div>
            </div>
            {isExp && (
              <div style={{ marginLeft: '72px', marginBottom: '5px', padding: '8px 10px', background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderLeft: `3px solid ${barColor}`, display: 'flex', flexWrap: 'wrap', gap: '7px 16px' }}>
                {[
                  { label: 'MD 總量', value: m.totalMeasures, color: B_BLUE },
                  { label: 'MP 總量', value: m.totalTodos, color: B_PINK },
                  { label: 'MD 完成', value: m.completedMeasures, color: B_GREEN },
                  { label: 'MP 完成', value: m.doneTodos, color: B_GREEN },
                  { label: 'MD 逾期', value: m.overdueMeasures, color: B_PINK },
                  { label: 'MP 逾期', value: m.overdueTodos, color: B_PINK },
                  { label: 'MD 進行中', value: m.inProgressMeasures, color: B_CYAN },
                  { label: 'MD 完成率', value: `${m.measurePct}%`, color: progressColor(m.measurePct) },
                  { label: 'MP 完成率', value: `${m.todoPct}%`, color: progressColor(m.todoPct) },
                ].map(f => (
                  <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ fontSize: '12px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: f.color, lineHeight: 1 }}>{f.value}</span>
                    <span style={{ fontSize: '7.5px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
        {[{ color: B_BLUE, label: 'MD' }, { color: B_PINK, label: 'MP' }].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', background: s.color, opacity: 0.75 }} />
            <span style={{ fontSize: '8px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted }}>{s.label}</span>
          </div>
        ))}
        <span style={{ fontSize: '8px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted, marginLeft: '4px' }}>點擊展開詳情</span>
      </div>
    </div>
  );
}

function ChartsSection({ stats, dark, unassignedMeasures = 0, unassignedTodos = 0, chartView = 'all' }) {
  const T = dark ? DARK : LIGHT;
  const sh = dark ? 'rgba(255,255,255,0.15)' : '#000';
  if (!stats.length) return null;

  const totMD = stats.reduce((s, x) => s + x.totalMeasures, 0);
  const doneMD = stats.reduce((s, x) => s + x.completedMeasures, 0);
  const overMD = stats.reduce((s, x) => s + x.overdueMeasures, 0);
  const progMD = stats.reduce((s, x) => s + x.inProgressMeasures, 0);
  const otherMD = Math.max(0, totMD - doneMD - overMD - progMD);
  const totMP = stats.reduce((s, x) => s + x.totalTodos, 0);
  const doneMP = stats.reduce((s, x) => s + x.doneTodos, 0);
  const overMP = stats.reduce((s, x) => s + x.overdueTodos, 0);
  const otherMP = Math.max(0, totMP - doneMP - overMP);

  const mdSegments = [
    { key: 'done',     label: '完成',  value: doneMD,  color: B_GREEN },
    { key: 'progress', label: '進行中', value: progMD,  color: B_CYAN },
    { key: 'overdue',  label: '逾期',  value: overMD,  color: B_PINK },
    { key: 'other',    label: '未開始', value: otherMD, color: dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)' },
  ];
  const mpSegments = [
    { key: 'done',    label: '完成',  value: doneMP,  color: B_GREEN },
    { key: 'overdue', label: '逾期',  value: overMP,  color: B_PINK },
    { key: 'other',   label: '未完成', value: otherMP, color: dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)' },
  ];
  const mdAssignSegs = [
    { key: 'assigned',   label: '已指派', value: totMD,             color: B_BLUE },
    { key: 'unassigned', label: '未指派', value: unassignedMeasures, color: B_ORANGE },
  ];
  const mpAssignSegs = [
    { key: 'assigned',   label: '已指派', value: totMP,         color: B_PINK },
    { key: 'unassigned', label: '未指派', value: unassignedTodos, color: B_ORANGE },
  ];

  const byPctMD  = [...stats].sort((a, b) => b.measurePct        - a.measurePct        || b.totalMeasures  - a.totalMeasures).slice(0, 10);
  const byPctMP  = [...stats].sort((a, b) => b.todoPct           - a.todoPct           || b.totalTodos      - a.totalTodos).slice(0, 10);
  const byCntMD  = [...stats].sort((a, b) => b.completedMeasures - a.completedMeasures || a.name.localeCompare(b.name)).slice(0, 10);
  const byCntMP  = [...stats].sort((a, b) => b.doneTodos         - a.doneTodos         || a.name.localeCompare(b.name)).slice(0, 10);
  const maxCntMD = Math.max(...byCntMD.map(m => m.completedMeasures), 1);
  const maxCntMP = Math.max(...byCntMP.map(m => m.doneTodos), 1);

  const cardBg = dark ? 'rgba(30,33,36,0.82)' : 'rgba(230,231,234,0.82)';
  const card = (title, titleColor, children) => (
    <div style={{ background: cardBg, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: `2px solid ${T.border}`, boxShadow: `4px 4px 0 ${sh}`, padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <span style={{ fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: titleColor }}>{title}</span>
      {children}
    </div>
  );

  const statsWI     = stats.map(m => ({ ...m, incompMDPct: 100 - m.measurePct, incompMPPct: 100 - m.todoPct, incompMeasures: m.totalMeasures - m.completedMeasures, incompTodos: m.totalTodos - m.doneTodos }));
  const byIncRateMD = [...statsWI].sort((a, b) => b.incompMDPct     - a.incompMDPct     || b.totalMeasures - a.totalMeasures).slice(0, 10);
  const byIncRateMP = [...statsWI].sort((a, b) => b.incompMPPct     - a.incompMPPct     || b.totalTodos    - a.totalTodos).slice(0, 10);
  const byCntIncMD  = [...statsWI].sort((a, b) => b.incompMeasures  - a.incompMeasures  || a.name.localeCompare(b.name)).slice(0, 10);
  const byCntIncMP  = [...statsWI].sort((a, b) => b.incompTodos     - a.incompTodos     || a.name.localeCompare(b.name)).slice(0, 10);
  const maxIncMD    = Math.max(...byCntIncMD.map(m => m.incompMeasures), 1);
  const maxIncMP    = Math.max(...byCntIncMP.map(m => m.incompTodos), 1);

  const showRate         = chartView === 'rate_count';
  const showCount        = chartView === 'rate_count';
  const showStatus       = chartView === 'status';
  const showAssign       = chartView === 'assign';
  const showIncompRate   = chartView === 'incomp_both';
  const showIncompCount  = chartView === 'incomp_both';
  const showTreemap      = chartView === 'treemap';
  const showRadar        = chartView === 'radar';
  const showScatter      = chartView === 'scatter';
  const showRiskMatrix   = chartView === 'risk_matrix';
  const showWorkload     = chartView === 'workload';
  const tmItems = [
    ...stats.map((m, i) => ({ label: m.name, value: m.totalMeasures + m.totalTodos, md: m.totalMeasures, mp: m.totalTodos, completedMD: m.completedMeasures, completedMP: m.doneTodos, color: TM_COLORS[i % TM_COLORS.length] })),
    ...(unassignedMeasures + unassignedTodos > 0 ? [{ label: '未指派', value: unassignedMeasures + unassignedTodos, md: unassignedMeasures, mp: unassignedTodos, completedMD: 0, completedMP: 0, color: dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.18)' }] : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Row 1 — 完成率排行 */}
      {showRate && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {card('MD 完成率排行', B_BLUE,
            <HBarChart members={byPctMD} dark={dark} valueKey="measurePct" colorFn={progressColor} labelFn={v => `${v}%`} />
          )}
          {card('MP 完成率排行', B_PINK,
            <HBarChart members={byPctMP} dark={dark} valueKey="todoPct" colorFn={progressColor} labelFn={v => `${v}%`} />
          )}
        </div>
      )}
      {/* Row 2 — 完成數排行 */}
      {showCount && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {card('MD 完成數排行', B_GREEN,
            <HBarChart members={byCntMD} dark={dark} valueKey="completedMeasures" maxValue={maxCntMD} color={B_GREEN} labelFn={v => v} />
          )}
          {card('MP 完成數排行', B_CYAN,
            <HBarChart members={byCntMP} dark={dark} valueKey="doneTodos" maxValue={maxCntMP} color={B_CYAN} labelFn={v => v} />
          )}
        </div>
      )}
      {/* Row 3 — 任務狀態分布 + 指派分布 */}
      {(showStatus || showAssign) && (
        <div style={{ display: 'grid', gridTemplateColumns: (showStatus && showAssign) ? '1fr 1fr' : '1fr', gap: '16px' }}>
          {showStatus && (
            <DistributionCard
              title="任務狀態分布" titleColor={T.textMuted} dark={dark} sh={sh} T={T}
              donuts={[
                {
                  segments: mdSegments, total: totMD, subLabel: 'MD 定量指標', subColor: B_BLUE,
                  drillTitle: 'MD 各負責人狀態明細',
                  drillContent: (
                    <StackedHBarChart members={stats} dark={dark} segments={[
                      { key: 'done',     label: '完成',  color: B_GREEN,  getVal: m => m.completedMeasures },
                      { key: 'progress', label: '進行中', color: B_CYAN,   getVal: m => m.inProgressMeasures },
                      { key: 'overdue',  label: '逾期',  color: B_PINK,   getVal: m => m.overdueMeasures },
                      { key: 'other',    label: '未開始', color: dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.13)', getVal: m => Math.max(0, m.totalMeasures - m.completedMeasures - m.inProgressMeasures - m.overdueMeasures) },
                    ]} />
                  ),
                },
                {
                  segments: mpSegments, total: totMP, subLabel: 'MP 檢核步驟', subColor: B_PINK,
                  drillTitle: 'MP 各負責人狀態明細',
                  drillContent: (
                    <StackedHBarChart members={stats} dark={dark} segments={[
                      { key: 'done',    label: '完成',  color: B_GREEN,  getVal: m => m.doneTodos },
                      { key: 'overdue', label: '逾期',  color: B_PINK,   getVal: m => m.overdueTodos },
                      { key: 'other',   label: '未完成', color: dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.13)', getVal: m => Math.max(0, m.totalTodos - m.doneTodos - m.overdueTodos) },
                    ]} />
                  ),
                },
              ]}
            />
          )}
          {showAssign && (
            <DistributionCard
              title="MD / MP 指派分布" titleColor={B_ORANGE} dark={dark} sh={sh} T={T}
              donuts={[
                {
                  segments: mdAssignSegs, total: totMD + unassignedMeasures, subLabel: 'MD 定量指標', subColor: B_BLUE, centerKey: 'assigned',
                  drillTitle: 'MD 各負責人指派數量',
                  drillContent: (
                    <HBarChart
                      members={[...stats].sort((a, b) => b.totalMeasures - a.totalMeasures).slice(0, 10)}
                      dark={dark} valueKey="totalMeasures" color={B_BLUE} labelFn={v => v}
                    />
                  ),
                },
                {
                  segments: mpAssignSegs, total: totMP + unassignedTodos, subLabel: 'MP 檢核步驟', subColor: B_PINK, centerKey: 'assigned',
                  drillTitle: 'MP 各負責人指派數量',
                  drillContent: (
                    <HBarChart
                      members={[...stats].sort((a, b) => b.totalTodos - a.totalTodos).slice(0, 10)}
                      dark={dark} valueKey="totalTodos" color={B_PINK} labelFn={v => v}
                    />
                  ),
                },
              ]}
            />
          )}
        </div>
      )}
      {/* 未完成率排行 */}
      {showIncompRate && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {card('MD 未完成率排行', B_PINK,
            <HBarChart members={byIncRateMD} dark={dark} valueKey="incompMDPct" colorFn={incompleteColor} labelFn={v => `${v}%`} />
          )}
          {card('MP 未完成率排行', B_ORANGE,
            <HBarChart members={byIncRateMP} dark={dark} valueKey="incompMPPct" colorFn={incompleteColor} labelFn={v => `${v}%`} />
          )}
        </div>
      )}
      {/* 未完成數排行 */}
      {showIncompCount && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {card('MD 未完成數排行', B_PINK,
            <HBarChart members={byCntIncMD} dark={dark} valueKey="incompMeasures" maxValue={maxIncMD} color={B_PINK} labelFn={v => v} />
          )}
          {card('MP 未完成數排行', B_ORANGE,
            <HBarChart members={byCntIncMP} dark={dark} valueKey="incompTodos" maxValue={maxIncMP} color={B_ORANGE} labelFn={v => v} />
          )}
        </div>
      )}
      {/* 雷達圖 */}
      {showRadar && <RadarSection stats={stats} dark={dark} />}
      {/* 矩形樹狀圖 + 指派量長條圖 並排 */}
      {showTreemap && card('任務指派總量分析', B_CYAN,
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: B_CYAN }}>矩形樹狀圖 — MD+MP 任務佔比</div>
            <TreemapChart items={tmItems} dark={dark} W={310} H={250} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: B_ORANGE }}>矩形樹狀圖 — 已指派任務量（負責人佔比）</div>
            <TreemapChart
              items={[...stats].sort((a,b)=>(b.totalMeasures+b.totalTodos)-(a.totalMeasures+a.totalTodos)).map((m,i)=>({
                label: m.name,
                value: m.totalMeasures + m.totalTodos,
                md: m.totalMeasures,
                mp: m.totalTodos,
                completedMD: m.completedMeasures,
                completedMP: m.doneTodos,
                color: TM_COLORS[i % TM_COLORS.length],
              }))}
              dark={dark} W={310} H={250}
            />
          </div>
        </div>
      )}
      {/* 散佈圖 */}
      {showScatter && card('MD × MP 完成率散佈圖', B_CYAN,
        <ScatterPlot members={stats} dark={dark} />
      )}
      {/* 逾期風險矩陣 */}
      {showRiskMatrix && card('逾期風險矩陣 — 負擔 × 逾期率', B_PINK,
        <OverdueRiskMatrix members={stats} dark={dark} />
      )}
      {/* 任務結構平衡圖 */}
      {showWorkload && card('負責人任務結構平衡圖', B_ORANGE,
        <WorkloadBalanceChart members={stats} dark={dark} />
      )}
    </div>
  );
}

// ─── SORT CONTROLS ────────────────────────────────────────────────────────────

// ─── SORT / CHART OPTIONS ────────────────────────────────────────────────────
export const SORT_OPTIONS = [
  { key: 'measurePct',        label: 'MD 完成率' },
  { key: 'todoPct',           label: 'MP 完成率' },
  { key: 'projectCount',      label: '專案數' },
  { key: 'overdueTotal',      label: '總逾期數' },
  { key: 'totalMeasures',     label: 'MD 總量' },
  { key: 'totalTodos',        label: 'MP 總量' },
  { key: 'completedMeasures', label: 'MD 完成數' },
  { key: 'doneTodos',         label: 'MP 完成數' },
];
export const CHART_VIEW_OPTIONS = [
  { value: 'rate_count',   label: '完成率 / 完成數排行' },
  { value: 'incomp_both',  label: '未完成率 / 未完成數排行' },
  { value: 'workload',     label: '任務結構平衡圖' },
  { value: 'treemap',      label: '矩形樹狀圖（任務佔比）' },
  { value: 'risk_matrix',  label: '逾期風險矩陣' },
  { value: 'scatter',      label: 'MD × MP 散佈圖' },
  { value: 'status',       label: '任務狀態分布' },
  { value: 'assign',       label: '指派分布' },
  { value: 'radar',        label: '多維雷達圖' },
];

export { DonutChart, HBarChart, RadarChart, ScatterPlot, TreemapChart,
  ChartLegend, StackedHBarChart, DistributionCard, OverdueRiskMatrix,
  WorkloadBalanceChart, AssigneeBarChart, RadarSection, ChartsSection };