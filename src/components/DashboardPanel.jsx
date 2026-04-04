import React, { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { loadSavedBgConfig } from '../bgConfig.js';
import BrutalistBackground from './BrutalistBackground.jsx';
import BrutalistSelect from './BrutalistSelect.jsx';
import { navigate } from '../utils/router.js';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const B_YELLOW = '#e0de0b';
const B_GREEN  = '#00FF00';
const B_BLUE   = '#4242e3';
const B_PINK   = '#FF00FF';
const B_CYAN   = '#14d3d3';
const B_ORANGE = '#dd800f';

const DARK  = { bg: '#121212', border: '#b7b6b6', text: '#FFFFFF', textSub: '#B8B8B8', textMuted: '#888888', cardBg: 'rgba(255,255,255,0.04)', headerBg: 'rgba(17,17,17,0.85)', grid: 'rgba(255,255,255,0.04)' };
const LIGHT = { bg: '#f8f9fa', border: '#000000', text: '#111111', textSub: '#484848', textMuted: '#666666', cardBg: 'rgba(0,0,0,0.02)',         headerBg: 'rgba(248,248,248,0.9)',  grid: 'rgba(0,0,0,0.04)' };

// ─── HELPERS ──────────────────────────────────────────────────────────────────
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

function MiniBar({ value, color, height = 6, dark }) {
  const T = dark ? DARK : LIGHT;
  return (
    <div style={{ height, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, value)}%`, background: color, transition: 'width 0.5s ease' }} />
    </div>
  );
}

function StatChip({ label, value, color, dark }) {
  const T = dark ? DARK : LIGHT;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: '60px' }}>
      <span style={{ fontSize: '20px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: color || T.text, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.textMuted }}>{label}</span>
    </div>
  );
}

// ─── DATA AGGREGATION ─────────────────────────────────────────────────────────
function buildStats(projects, selectedIds) {
  const targets = selectedIds.size === 0
    ? projects
    : projects.filter(p => selectedIds.has(p.id));

  // Map: assignee name → stats
  const map = {};
  const ensure = (name) => {
    if (!map[name]) map[name] = {
      name,
      projects: new Set(),
      totalMeasures: 0,
      completedMeasures: 0,
      totalTodos: 0,
      doneTodos: 0,
      overdueTodos: 0,
      inProgressMeasures: 0,
      overdueMeasures: 0,
    };
    return map[name];
  };

  const today = new Date().toISOString().slice(0, 10);
  let unassignedMeasures = 0;
  let unassignedTodos = 0;

  targets.forEach(p => {
    (p.goals || []).forEach(g => {
      (g.strategies || []).forEach(s => {
        (s.measures || []).forEach(m => {
          // Assignees on this measure
          const assignees = Array.isArray(m.assignees) ? m.assignees
            : m.assignee ? [m.assignee] : [];
          const validAssignees = assignees.filter(n => !!n);

          const isCompleted = m.status === 'Completed';
          const isOverdue   = m.status === 'Overdue' || (!isCompleted && m.deadline && m.deadline < today);
          const isInProgress = m.status === 'InProgress' || (!isCompleted && !isOverdue && (m.progress || 0) > 0);

          if (validAssignees.length === 0) {
            unassignedMeasures++;
          } else {
            validAssignees.forEach(name => {
              const st = ensure(name);
              st.projects.add(p.id);
              st.totalMeasures++;
              if (isCompleted)  st.completedMeasures++;
              if (isOverdue)    st.overdueMeasures++;
              if (isInProgress) st.inProgressMeasures++;
            });
          }

          // Todos (MP steps)
          (m.todos || []).forEach(t => {
            const tAssignees = Array.isArray(t.assignees) ? t.assignees
              : t.assignee ? [t.assignee] : [];
            const tOverdue = !t.done && t.deadline && t.deadline < today;

            // If no assignee on todo, fallback to measure's assignees
            const effectiveAssignees = (tAssignees.filter(n => !!n).length > 0 ? tAssignees : validAssignees).filter(n => !!n);

            if (effectiveAssignees.length === 0) {
              unassignedTodos++;
            } else {
              effectiveAssignees.forEach(name => {
                const st = ensure(name);
                st.projects.add(p.id);
                st.totalTodos++;
                if (t.done)    st.doneTodos++;
                if (tOverdue)  st.overdueTodos++;
              });
            }
          });
        });
      });
    });
  });

  const list = Object.values(map).map(st => ({
    ...st,
    projects: [...st.projects],
    measurePct: st.totalMeasures ? Math.round((st.completedMeasures / st.totalMeasures) * 100) : 0,
    todoPct:    st.totalTodos    ? Math.round((st.doneTodos    / st.totalTodos)    * 100) : 0,
  })).sort((a, b) => b.measurePct - a.measurePct || a.name.localeCompare(b.name));
  return { list, unassignedMeasures, unassignedTodos };
}

// ─── MEMBER CARD ─────────────────────────────────────────────────────────────
function MemberCard({ stat, dark, rank }) {
  const T = dark ? DARK : LIGHT;
  const mColor = progressColor(stat.measurePct);
  const tColor = progressColor(stat.todoPct);
  const sh = dark ? 'rgba(255,255,255,0.15)' : '#000';

  const rankColors = { 1: B_YELLOW, 2: '#C0C0C0', 3: '#CD7F32' };
  const rankColor = rankColors[rank] || null;

  return (
    <div style={{
      background: T.cardBg,
      border: `3px solid ${rankColor || T.border}`,
      boxShadow: rankColor ? `6px 6px 0 ${rankColor}` : `4px 4px 0 ${sh}`,
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      position: 'relative',
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}>
      {/* Rank badge */}
      {rankColor && (
        <div style={{
          position: 'absolute', top: '-14px', left: '16px',
          background: rankColor, color: '#000',
          padding: '2px 10px',
          fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          border: `2px solid ${dark ? '#000' : '#fff'}`,
        }}>
          #{rank}
        </div>
      )}

      {/* Name & project count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ fontSize: '18px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: T.text, letterSpacing: '-0.02em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {stat.name}
        </div>
        <div style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.08em', color: T.textMuted, flexShrink: 0, border: `1px solid ${T.border}`, padding: '2px 6px', whiteSpace: 'nowrap' }}>
          {stat.projects.length} 個專案
        </div>
      </div>

      {/* MD 定量指標 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: B_BLUE }}>MD 定量指標</span>
          <span style={{ fontSize: '14px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: mColor }}>{stat.measurePct}%</span>
        </div>
        <MiniBar value={stat.measurePct} color={mColor} height={8} dark={dark} />
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'nowrap' }}>
          <StatChip label="完成" value={stat.completedMeasures} color={B_GREEN} dark={dark} />
          <StatChip label="進行中" value={stat.inProgressMeasures} color={B_CYAN} dark={dark} />
          <StatChip label="逾期" value={stat.overdueMeasures} color={B_PINK} dark={dark} />
          <StatChip label="共" value={stat.totalMeasures} dark={dark} />
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: `1px dashed ${T.border}`, opacity: 0.3 }} />

      {/* MP 步驟 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: B_PINK }}>MP 檢核步驟</span>
          <span style={{ fontSize: '14px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: tColor }}>{stat.todoPct}%</span>
        </div>
        <MiniBar value={stat.todoPct} color={tColor} height={6} dark={dark} />
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'nowrap' }}>
          <StatChip label="完成" value={stat.doneTodos} color={B_GREEN} dark={dark} />
          <StatChip label="逾期" value={stat.overdueTodos} color={B_PINK} dark={dark} />
          <StatChip label="共" value={stat.totalTodos} dark={dark} />
        </div>
      </div>
    </div>
  );
}

// ─── FILTER DROPDOWN (shared for projects & assignees) ─────────────────────────
function FilterDropdown({ items, selectedKeys, onToggle, onClear, accentColor, dark, emptyLabel }) {
  const [q, setQ] = useState('');
  const T = dark ? DARK : LIGHT;
  const filtered = items.filter(it => it.label.toLowerCase().includes(q.toLowerCase()));
  const allSelected = selectedKeys.size === 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Search with inline clear ✕ */}
      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="搜尋..."
          style={{
            width: '100%', padding: '6px 32px 6px 10px', fontSize: '11px', boxSizing: 'border-box',
            fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
            background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            border: `2px solid ${T.border}`, color: T.text, outline: 'none',
          }}
        />
        {q !== '' && (
          <button
            onClick={() => setQ('')}
            style={{
              position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
              width: '20px', height: '20px', padding: 0, border: 'none',
              background: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
              color: dark ? '#fff' : '#000', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 900, lineHeight: 1, transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = accentColor; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'; e.currentTarget.style.color = dark ? '#fff' : '#000'; }}
          >✕</button>
        )}
      </div>
      {/* Item list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {/* 全部選項 */}
        <div
          onClick={onClear}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '7px 10px', cursor: 'pointer',
            background: allSelected ? (dark ? `${accentColor}28` : `${accentColor}16`) : 'transparent',
            outline: allSelected ? `1px solid ${accentColor}44` : '1px solid transparent',
            transition: 'background 0.12s', userSelect: 'none',
          }}
        >
          <div style={{
            width: '14px', height: '14px', flexShrink: 0,
            border: `2px solid ${allSelected ? accentColor : T.border}`,
            background: allSelected ? accentColor : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.12s',
          }}>
            {allSelected && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><path d="M5 12l5 5L20 7"/></svg>}
          </div>
          <span style={{
            fontSize: '12px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
            color: allSelected ? accentColor : T.text, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>全部</span>
        </div>
        {filtered.map(it => {
          const active = selectedKeys.has(it.key);
          return (
            <div
              key={it.key}
              onClick={() => onToggle(it.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '7px 10px', cursor: 'pointer',
                background: active ? (dark ? `${accentColor}28` : `${accentColor}16`) : 'transparent',
                outline: active ? `1px solid ${accentColor}44` : '1px solid transparent',
                transition: 'background 0.12s', userSelect: 'none',
              }}
            >
              <div style={{
                width: '14px', height: '14px', flexShrink: 0,
                border: `2px solid ${active ? accentColor : T.border}`,
                background: active ? accentColor : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.12s',
              }}>
                {active && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><path d="M5 12l5 5L20 7"/></svg>}
              </div>
              <span style={{
                fontSize: '12px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
                color: active ? accentColor : T.text,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
              }}>
                {it.label}
              </span>
            </div>
          );
        })}
        {filtered.length === 0 && items.length === 0 && (
          <div style={{ padding: '12px 10px', fontSize: '11px', fontFamily: '"Space Grotesk", sans-serif', color: T.textMuted, textAlign: 'center' }}>
            {emptyLabel || '無符合結果'}
          </div>
        )}
        {filtered.length === 0 && items.length > 0 && (
          <div style={{ padding: '12px 10px', fontSize: '11px', fontFamily: '"Space Grotesk", sans-serif', color: T.textMuted, textAlign: 'center' }}>
            無符合結果
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CHART COMPONENTS ───────────────────────────────────────────────────────
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

function HBarChart({ members, dark, barH = 18, valueKey = 'measurePct', maxValue, color, colorFn, labelFn }) {
  const T = dark ? DARK : LIGHT;
  if (!members.length) return null;
  const max = maxValue != null ? maxValue : Math.max(...members.map(m => m[valueKey] ?? 0), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      {members.map(m => {
        const val = m[valueKey] ?? 0;
        const barPct = max > 0 ? Math.min(100, (val / max) * 100) : 0;
        const c = colorFn ? colorFn(val) : (color ?? B_BLUE);
        return (
          <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '72px', fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: T.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'right' }}>
              {m.name}
            </div>
            <div style={{ flex: 1, height: barH, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', border: `1px solid ${T.border}`, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${barPct}%`, background: c, transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
            </div>
            <div style={{ width: '38px', fontSize: '11px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: c, flexShrink: 0, textAlign: 'right' }}>
              {labelFn ? labelFn(val) : val}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RadarChart({ members, dark, size = 260 }) {
  const T = dark ? DARK : LIGHT;
  const cx = size / 2, cy = size / 2;
  const r = size * 0.36;
  const maxMD   = Math.max(...members.map(m => m.totalMeasures), 1);
  const maxMP   = Math.max(...members.map(m => m.totalTodos), 1);
  const maxProj = Math.max(...members.map(m => m.projects?.size ?? 0), 1);
  const AXES = [
    { label: 'MD完成率', val: m => m.measurePct / 100 },
    { label: 'MP完成率', val: m => m.todoPct / 100 },
    { label: 'MD任務量', val: m => m.totalMeasures / maxMD },
    { label: 'MP任務量', val: m => m.totalTodos / maxMP },
    { label: '指派專案', val: m => (m.projects?.size ?? 0) / maxProj },
  ];
  const n = AXES.length;
  const COLORS = [B_BLUE, B_PINK, B_GREEN, B_CYAN, B_ORANGE, B_YELLOW];
  const pt = (axIdx, v) => {
    const a = (axIdx / n) * 2 * Math.PI - Math.PI / 2;
    return [cx + r * v * Math.cos(a), cy + r * v * Math.sin(a)];
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {[0.25, 0.5, 0.75, 1.0].map(ring => (
          <polygon key={ring} points={AXES.map((_, i) => pt(i, ring).join(',')).join(' ')} fill="none" stroke={T.border} strokeWidth="0.5" opacity="0.25" />
        ))}
        {[25, 50, 75].map(pct => {
          const [x, y] = pt(0, pct / 100);
          return <text key={pct} x={x + 4} y={y} fontSize="7" fontFamily='"Space Grotesk",sans-serif' fontWeight="700" fill={T.textMuted} opacity="0.5">{pct}%</text>;
        })}
        {AXES.map((_, i) => {
          const [x, y] = pt(i, 1);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={T.border} strokeWidth="0.8" opacity="0.22" />;
        })}
        {AXES.map((ax, i) => {
          const [x, y] = pt(i, 1.24);
          return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="8.5" fontFamily='"Space Grotesk",sans-serif' fontWeight="900" fill={T.textMuted} letterSpacing="0.04em">{ax.label}</text>;
        })}
        {members.map((m, mi) => {
          const pts = AXES.map((ax, i) => pt(i, Math.max(ax.val(m), 0.02)).join(',')).join(' ');
          const c = COLORS[mi % COLORS.length];
          return (
            <g key={m.name}>
              <polygon points={pts} fill={c} fillOpacity="0.12" stroke={c} strokeWidth="1.5" strokeOpacity="0.8" />
              {AXES.map((ax, i) => {
                const [px, py] = pt(i, Math.max(ax.val(m), 0.02));
                return <circle key={i} cx={px} cy={py} r="2.5" fill={c} opacity="0.75" />;
              })}
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', justifyContent: 'center' }}>
        {members.map((m, mi) => (
          <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', background: COLORS[mi % COLORS.length], flexShrink: 0 }} />
            <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: T.textSub, whiteSpace: 'nowrap' }}>{m.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScatterPlot({ members, dark }) {
  const T = dark ? DARK : LIGHT;
  const [hovered, setHovered] = useState(null);
  const W = 460, H = 320;
  const mg = { t: 20, r: 24, b: 48, l: 50 };
  const pw = W - mg.l - mg.r;
  const ph = H - mg.t - mg.b;
  const maxTasks = Math.max(...members.map(m => m.totalMeasures + m.totalTodos), 1);
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={W} height={H}>
        <defs>
          <clipPath id="sc-clip"><rect x={0} y={0} width={pw} height={ph} /></clipPath>
        </defs>
        <g transform={`translate(${mg.l},${mg.t})`}>
          <rect x={0} y={0} width={pw} height={ph} fill={dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'} />
          {[0, 25, 50, 75, 100].map(v => (
            <g key={v}>
              <line x1={0} y1={ph - ph*v/100} x2={pw} y2={ph - ph*v/100} stroke={T.border} strokeWidth="0.5" opacity="0.18" strokeDasharray="3 3" />
              <line x1={pw*v/100} y1={0} x2={pw*v/100} y2={ph} stroke={T.border} strokeWidth="0.5" opacity="0.18" strokeDasharray="3 3" />
              <text x={pw*v/100} y={ph+16} textAnchor="middle" fontSize="8" fontFamily='"Space Grotesk",sans-serif' fontWeight="700" fill={T.textMuted}>{v}%</text>
              <text x={-7} y={ph - ph*v/100 + 3} textAnchor="end" fontSize="8" fontFamily='"Space Grotesk",sans-serif' fontWeight="700" fill={T.textMuted}>{v}%</text>
            </g>
          ))}
          <rect x={0} y={0} width={pw} height={ph} fill="none" stroke={T.border} strokeWidth="1" opacity="0.3" />
          <text x={pw/2} y={ph+38} textAnchor="middle" fontSize="9" fontFamily='"Space Grotesk",sans-serif' fontWeight="900" fill={T.textMuted} letterSpacing="0.08em">MD 完成率</text>
          <text x={-ph/2} y={-38} textAnchor="middle" fontSize="9" fontFamily='"Space Grotesk",sans-serif' fontWeight="900" fill={T.textMuted} letterSpacing="0.08em" transform="rotate(-90)">MP 完成率</text>
          <g clipPath="url(#sc-clip)">
            {members.map((m, i) => {
              const x = (m.measurePct / 100) * pw;
              const y = ph - (m.todoPct / 100) * ph;
              const bR = 5 + Math.sqrt((m.totalMeasures + m.totalTodos) / maxTasks) * 18;
              const color = progressColor((m.measurePct + m.todoPct) / 2);
              const isHov = hovered === i;
              return (
                <g key={m.name} style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
                  <circle cx={x} cy={y} r={bR} fill={color} fillOpacity={isHov ? 0.85 : 0.38} stroke={color} strokeWidth={isHov ? 2.5 : 1.5} />
                  {members.length <= 15 && !isHov && (
                    <text x={x} y={y + 3.5} textAnchor="middle" fontSize="7.5" fontFamily='"Space Grotesk",sans-serif' fontWeight="900" fill={T.text} opacity="0.75" style={{ pointerEvents: 'none' }}>
                      {m.name.slice(0, 3)}
                    </text>
                  )}
                </g>
              );
            })}
            {hovered !== null && (() => {
              const m = members[hovered];
              const x = (m.measurePct / 100) * pw;
              const y = ph - (m.todoPct / 100) * ph;
              const bR = 5 + Math.sqrt((m.totalMeasures + m.totalTodos) / maxTasks) * 18;
              const txY = y - bR - 8 < 22 ? y + bR + 20 : y - bR - 8;
              const color = progressColor((m.measurePct + m.todoPct) / 2);
              return (
                <g key="tip" style={{ pointerEvents: 'none' }}>
                  <text x={x} y={txY} textAnchor="middle" fontSize="10" fontFamily='"Space Grotesk",sans-serif' fontWeight="900" fill={T.text}>{m.name}</text>
                  <text x={x} y={txY + 14} textAnchor="middle" fontSize="8.5" fontFamily='"Space Grotesk",sans-serif' fontWeight="700" fill={color}>MD {m.measurePct}% · MP {m.todoPct}%</text>
                </g>
              );
            })()}
          </g>
        </g>
      </svg>
      <div style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted, textAlign: 'center', marginTop: '4px' }}>
        氣泡大小 ＝ 總任務量；游標懸停顯示詳情
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

function TreemapChart({ items, dark, W = 580, H = 300 }) {
  const T = dark ? DARK : LIGHT;
  const [hovered, setHovered] = useState(null);
  const sorted = [...items].filter(i => i.value > 0).sort((a, b) => b.value - a.value);
  const rects  = computeTreemap(sorted, 0, 0, W, H);
  const GAP = 3;
  const hovR = hovered ? rects.find(r => r.label === hovered) : null;
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={W} height={H} style={{ display: 'block' }}>
        {rects.map(r => {
          const isHov = hovered === r.label;
          const rx = r.x + GAP / 2, ry = r.y + GAP / 2;
          const rw = Math.max(0, r.w - GAP), rh = Math.max(0, r.h - GAP);
          return (
            <g key={r.label}
              onMouseEnter={() => setHovered(r.label)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'default' }}
            >
              <rect x={rx} y={ry} width={rw} height={rh}
                fill={r.color} fillOpacity={isHov ? 0.88 : 0.58}
                stroke={isHov ? T.text : T.border}
                strokeWidth={isHov ? 2 : 0.8} strokeOpacity={isHov ? 0.8 : 0.45}
              />
              {rw > 36 && rh > 20 && (
                <text x={rx + 6} y={ry + 14} fontSize="9" fontFamily='"Space Grotesk",sans-serif'
                  fontWeight="900" fill={T.text} style={{ pointerEvents: 'none' }}>
                  {r.label.length * 7.5 > rw - 12
                    ? r.label.slice(0, Math.max(1, Math.floor((rw - 16) / 7.5))) + '\u2026'
                    : r.label}
                </text>
              )}
              {rw > 50 && rh > 36 && (
                <text x={rx + 6} y={ry + 27} fontSize="8" fontFamily='"Space Grotesk",sans-serif'
                  fontWeight="700" fill={T.textMuted} style={{ pointerEvents: 'none' }}>
                  MD {r.md} \u00b7 MP {r.mp}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hovR && (
        <div style={{ fontSize: '10px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900,
          color: hovR.color, marginTop: '6px', textAlign: 'center', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {hovR.label} \u2014 MD {hovR.md} \u00b7 MP {hovR.mp} \u00b7 \u5171 {hovR.value} \u9805
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
    { value: '__top5__', label: '\u524d\u4e94\u540d\u5c0d\u6bd4' },
    ...stats.map(m => ({ value: m.name, label: m.name })),
  ];
  const displayMembers = radarFocus === '__top5__'
    ? top5
    : stats.filter(m => m.name === radarFocus);
  const radarTitle = radarFocus === '__top5__'
    ? '\u8ca0\u8cac\u4eba\u591a\u7dad\u96f7\u9054\u5716 \u2014 \u524d\u4e94\u540d'
    : `\u8ca0\u8cac\u4eba\u591a\u7dad\u96f7\u9054\u5716 \u2014 ${radarFocus}`;
  return (
    <div style={{ background: T.cardBg, border: `3px solid ${T.border}`, boxShadow: `4px 4px 0 ${sh}`, padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <span style={{ fontSize: '10px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: B_YELLOW }}>{radarTitle}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textMuted }}>\u986f\u793a</span>
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

function StackedHBarChart({ members, dark, segments, barH = 18 }) {
  const T = dark ? DARK : LIGHT;
  const sorted = [...members]
    .sort((a, b) => {
      const totA = segments.reduce((s, seg) => s + seg.getVal(a), 0);
      const totB = segments.reduce((s, seg) => s + seg.getVal(b), 0);
      return totB - totA;
    })
    .slice(0, 10);
  const maxTot = Math.max(...sorted.map(m => segments.reduce((s, seg) => s + seg.getVal(m), 0)), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
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
        return (
          <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '72px', fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: T.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'right' }}>
              {m.name}
            </div>
            <div style={{ flex: 1, height: barH, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', border: `1px solid ${T.border}`, overflow: 'hidden', display: 'flex' }}>
              {segments.map(seg => {
                const val = seg.getVal(m);
                const w = maxTot > 0 ? (val / maxTot) * 100 : 0;
                return w > 0 ? <div key={seg.key} style={{ height: '100%', width: `${w}%`, background: seg.color, transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)', flexShrink: 0 }} /> : null;
              })}
            </div>
            <div style={{ width: '24px', fontSize: '11px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color: T.textSub, flexShrink: 0, textAlign: 'right' }}>
              {tot}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DistributionCard({ title, titleColor, donuts, dark, sh, T }) {
  const [activeIdx, setActiveIdx] = useState(null);
  return (
    <div style={{ background: T.cardBg, border: `3px solid ${T.border}`, boxShadow: `4px 4px 0 ${sh}`, padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

  const card = (title, titleColor, children) => (
    <div style={{ background: T.cardBg, border: `3px solid ${T.border}`, boxShadow: `4px 4px 0 ${sh}`, padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
  const tmItems = [
    ...stats.map((m, i) => ({ label: m.name, value: m.totalMeasures + m.totalTodos, md: m.totalMeasures, mp: m.totalTodos, color: TM_COLORS[i % TM_COLORS.length] })),
    ...(unassignedMeasures + unassignedTodos > 0 ? [{ label: '\u672a\u6307\u6d3e', value: unassignedMeasures + unassignedTodos, md: unassignedMeasures, mp: unassignedTodos, color: dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.18)' }] : []),
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
      {/* 矩形樹狀圖 */}
      {showTreemap && card('任務指派總量矩形樹狀圖', B_CYAN,
        <TreemapChart items={tmItems} dark={dark} />
      )}
      {/* 散佈圖 */}
      {showScatter && card('MD × MP 完成率散佈圖', B_CYAN,
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ScatterPlot members={stats} dark={dark} />
        </div>
      )}
    </div>
  );
}

// ─── SORT CONTROLS ────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: 'measurePct',        label: 'MD 完成率' },
  { key: 'todoPct',           label: 'MP 完成率' },
  { key: 'totalMeasures',     label: 'MD 總量' },
  { key: 'totalTodos',        label: 'MP 總量' },
  { key: 'completedMeasures', label: 'MD 完成數' },
  { key: 'doneTodos',         label: 'MP 完成數' },
];
const CHART_VIEW_OPTIONS = [
  { value: 'rate_count',   label: '完成率 / 完成數排行' },
  { value: 'incomp_both',  label: '未完成率 / 未完成數排行' },
  { value: 'treemap',      label: '矩形樹狀圖' },
  { value: 'status',       label: '任務狀態分布' },
  { value: 'assign',       label: '指派分布' },
  { value: 'radar',        label: '雷達圖' },
  { value: 'scatter',      label: '散佈圖' },
];

// ─── OVERVIEW CARDS ───────────────────────────────────────────────────────────
function OverviewRow({ stats, unassignedMeasures = 0, unassignedTodos = 0, dark }) {
  const T = dark ? DARK : LIGHT;
  const sh = dark ? 'rgba(255,255,255,0.15)' : '#000';

  const totalMembers = stats.length;
  const totalMeasures = stats.reduce((s, x) => s + x.totalMeasures, 0);
  const completedMeasures = stats.reduce((s, x) => s + x.completedMeasures, 0);
  const totalTodos = stats.reduce((s, x) => s + x.totalTodos, 0);
  const doneTodos = stats.reduce((s, x) => s + x.doneTodos, 0);
  const overallMeasurePct = totalMeasures ? Math.round((completedMeasures / totalMeasures) * 100) : 0;
  const overallTodoPct = totalTodos ? Math.round((doneTodos / totalTodos) * 100) : 0;

  const items = [
    { label: 'MD定量指標 完成率', value: `${overallMeasurePct}%`, color: progressColor(overallMeasurePct) },
    { label: 'MD定量指標 完成', value: `${completedMeasures} / ${totalMeasures}`, color: B_GREEN },
    { label: '未指派 MD定量指標', value: unassignedMeasures, color: B_ORANGE },
    { label: 'MP檢核指標 完成率', value: `${overallTodoPct}%`, color: progressColor(overallTodoPct) },
    { label: 'MP檢核指標 完成', value: `${doneTodos} / ${totalTodos}`, color: B_CYAN },
    { label: '未指派 MP檢核指標', value: unassignedTodos, color: B_ORANGE },
  ];

  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      {items.map(({ label, value, color }) => (
        <div key={label} style={{
          flex: '1 1 120px', minWidth: '100px',
          background: T.cardBg, border: `3px solid ${T.border}`,
          boxShadow: `4px 4px 0 ${sh}`, padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: '4px',
        }}>
          <span style={{ fontSize: '24px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, color, lineHeight: 1 }}>{value}</span>
          <span style={{ fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textMuted }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function DashboardPanel({ projects = [], dark = false, onBack, onGoHome, onToggleDark }) {
  const [bgConfig] = useState(loadSavedBgConfig);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedAssignees, setSelectedAssignees] = useState(new Set());
  const [sortKey, setSortKey] = useState('measurePct');
  const [sortDir, setSortDir] = useState('desc');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'charts'
  const [chartView, setChartView] = useState('rate_count');

  const T = dark ? DARK : LIGHT;
  const sh = dark ? 'rgba(255,255,255,0.2)' : '#000';

  const toggleProject = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAssignee = (name) => setSelectedAssignees(prev => {
    const next = new Set(prev);
    next.has(name) ? next.delete(name) : next.add(name);
    return next;
  });

  const availableProjects = useMemo(() => {
    if (selectedAssignees.size === 0) return projects;
    return projects.filter(p => {
      for (const g of (p.goals || [])) {
        for (const s of (g.strategies || [])) {
          for (const m of (s.measures || [])) {
            const a = Array.isArray(m.assignees) ? m.assignees : m.assignee ? [m.assignee] : [];
            if (a.some(n => selectedAssignees.has(n))) return true;
            for (const t of (m.todos || [])) {
              const ta = Array.isArray(t.assignees) ? t.assignees : t.assignee ? [t.assignee] : [];
              if (ta.some(n => selectedAssignees.has(n))) return true;
            }
          }
        }
      }
      return false;
    });
  }, [projects, selectedAssignees]);

  const allAssignees = useMemo(() => {
    const targets = selectedIds.size === 0 ? projects : projects.filter(p => selectedIds.has(p.id));
    const names = new Set();
    targets.forEach(p => {
      (p.goals || []).forEach(g => {
        (g.strategies || []).forEach(s => {
          (s.measures || []).forEach(m => {
            const a = Array.isArray(m.assignees) ? m.assignees : m.assignee ? [m.assignee] : [];
            a.forEach(n => n && names.add(n));
            (m.todos || []).forEach(t => {
              const ta = Array.isArray(t.assignees) ? t.assignees : t.assignee ? [t.assignee] : [];
              ta.forEach(n => n && names.add(n));
            });
          });
        });
      });
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [projects, selectedIds]);

  const rawData = useMemo(() => buildStats(projects, selectedIds), [projects, selectedIds]);

  const stats = useMemo(() => {
    let list = rawData.list;
    if (selectedAssignees.size > 0) {
      list = list.filter(s => selectedAssignees.has(s.name));
    }
    return [...list].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rawData, sortKey, sortDir, selectedAssignees]);

  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [showProjectPop, setShowProjectPop] = useState(false);
  const [showAssigneePop, setShowAssigneePop] = useState(false);
  const projectBtnRef = useRef(null);
  const assigneeBtnRef = useRef(null);
  const projectPopRef = useRef(null);
  const assigneePopRef = useRef(null);
  const [projectPopPos, setProjectPopPos] = useState({ top: 0, left: 0, width: 0 });
  const [assigneePopPos, setAssigneePopPos] = useState({ top: 0, left: 0, width: 0 });

  useLayoutEffect(() => {
    if (showProjectPop && projectBtnRef.current) {
      const r = projectBtnRef.current.getBoundingClientRect();
      setProjectPopPos({ top: r.bottom, left: r.left, width: r.width });
    }
  }, [showProjectPop]);

  useLayoutEffect(() => {
    if (showAssigneePop && assigneeBtnRef.current) {
      const r = assigneeBtnRef.current.getBoundingClientRect();
      setAssigneePopPos({ top: r.bottom, left: r.left, width: r.width });
    }
  }, [showAssigneePop]);

  useEffect(() => {
    if (!showProjectPop && !showAssigneePop) return;
    const handler = (e) => {
      if (projectBtnRef.current?.contains(e.target)) return;
      if (assigneeBtnRef.current?.contains(e.target)) return;
      if (projectPopRef.current?.contains(e.target)) return;
      if (assigneePopRef.current?.contains(e.target)) return;
      setShowProjectPop(false);
      setShowAssigneePop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showProjectPop, showAssigneePop]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes db-enter { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .db-card-enter { animation: db-enter 0.35s cubic-bezier(0.16,1,0.3,1) both; }
        .db-filter-wrap { overflow: hidden; transition: max-height 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease, padding 0.3s ease; }
        .db-toggle-btn { transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.15s; }
        .db-toggle-btn:hover { opacity: 1 !important; }
      `}</style>

      {/* Background */}
      <BrutalistBackground dark={dark} bgConfig={bgConfig} />

      {/* Header */}
      <div style={{
        position: 'relative', zIndex: 2,
        background: T.headerBg, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `3px solid ${T.border}`,
        flexShrink: 0,
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px 16px 32px' }}>
          {/* Back button */}
          <button onClick={onBack}
            style={{ background: 'none', border: 'none', color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 0', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.6, transition: 'opacity 0.15s', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            返回
          </button>

          <div style={{ width: '1px', height: '20px', background: T.border, opacity: 0.3, flexShrink: 0 }} />

          {/* Badge + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            <div style={{ background: B_YELLOW, color: '#000', padding: '4px 10px', fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', flexShrink: 0 }}>
              DASHBOARD
            </div>
            <h1 style={{ fontSize: '20px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', color: T.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              統計儀表板
            </h1>
          </div>

          {/* Collapse / expand toggle */}
          <button
            className="db-toggle-btn"
            onClick={() => setHeaderCollapsed(c => !c)}
            title={headerCollapsed ? '展開篩選' : '收起篩選'}
            style={{
              flexShrink: 0, background: headerCollapsed ? B_BLUE : 'transparent',
              border: `2px solid ${headerCollapsed ? B_BLUE : T.border}`,
              color: headerCollapsed ? '#fff' : T.text,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
              style={{ transform: headerCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
              <path d="M18 15l-6-6-6 6"/>
            </svg>
            {headerCollapsed ? '展開' : '收起'}
          </button>

          <div style={{ width: '1px', height: '20px', background: T.border, opacity: 0.3, flexShrink: 0 }} />

          {/* Logo → home */}
          <button
            onClick={onGoHome}
            title="回首頁"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', lineHeight: 0, flexShrink: 0, transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.6'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <img
              src={dark ? '/logo_dark.svg' : '/logo_sun.svg'}
              alt="回首頁"
              style={{ height: '2.2em', width: 'auto', display: 'block', pointerEvents: 'none' }}
              draggable={false}
            />
          </button>
        </div>

        {/* Filter area — two 50/50 popup trigger buttons */}
        <div
          className="db-filter-wrap"
          style={{
            maxHeight: headerCollapsed ? '0px' : '62px',
            opacity: headerCollapsed ? 0 : 1,
            pointerEvents: headerCollapsed ? 'none' : 'auto',
            display: 'flex', alignItems: 'stretch',
            borderTop: `1px solid ${T.border}`,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {/* Left: Project filter button */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', padding: '0 16px' }}>
            <button
              ref={projectBtnRef}
              onClick={() => { setShowAssigneePop(false); setShowProjectPop(v => !v); }}
              style={{
                flex: 1, background: (showProjectPop || selectedIds.size > 0) ? (dark ? 'rgba(66,66,227,0.18)' : 'rgba(66,66,227,0.08)') : 'transparent',
                border: 'none',
                color: selectedIds.size > 0 ? B_BLUE : T.text,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '14px 0', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
                fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'all 0.15s',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              選擇專案
              {selectedIds.size > 0 && (
                <span style={{ background: B_BLUE, color: '#fff', fontSize: '9px', padding: '1px 6px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900 }}>
                  {selectedIds.size}
                </span>
              )}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                style={{ transform: showProjectPop ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', opacity: 0.45 }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          </div>

          {/* Divider — short, doesn't reach top/bottom */}
          <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'stretch', flexShrink: 0 }}>
            <div style={{ width: '1px', height: '28px', background: T.border, opacity: 0.5 }} />
          </div>

          {/* Right: Assignee filter button */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', padding: '0 16px' }}>
            <button
              ref={assigneeBtnRef}
              onClick={() => { setShowProjectPop(false); setShowAssigneePop(v => !v); }}
              style={{
                flex: 1, background: (showAssigneePop || selectedAssignees.size > 0) ? (dark ? 'rgba(255,0,255,0.1)' : 'rgba(255,0,255,0.06)') : 'transparent',
                border: 'none',
                color: selectedAssignees.size > 0 ? B_PINK : T.text,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '14px 0', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
                fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'all 0.15s',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              選擇負責人
              {selectedAssignees.size > 0 && (
                <span style={{ background: B_PINK, color: '#fff', fontSize: '9px', padding: '1px 6px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900 }}>
                  {selectedAssignees.size}
                </span>
              )}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                style={{ transform: showAssigneePop ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', opacity: 0.45 }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="db-filter-wrap" style={{
        maxHeight: headerCollapsed ? '0px' : '44px',
        opacity: headerCollapsed ? 0 : 1,
        pointerEvents: headerCollapsed ? 'none' : 'auto',
        position: 'relative', zIndex: 2,
        background: dark ? 'rgba(20,20,20,0.7)' : 'rgba(240,240,240,0.7)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        borderBottom: `2px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
        padding: headerCollapsed ? '0 32px' : '6px 32px',
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        {/* View mode toggle — left */}
        <div style={{ display: 'flex', border: `2px solid ${T.border}`, overflow: 'hidden', flexShrink: 0 }}>
          {[{ mode: 'cards', title: '負責人卡片',
              icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
             { mode: 'charts', title: '數據圖表',
              icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
          ].map(({ mode, title, icon }) => {
            const active = viewMode === mode;
            return (
              <button key={mode} onClick={() => setViewMode(mode)} title={title}
                style={{
                  padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px',
                  fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  background: active ? T.border : 'transparent',
                  color: active ? (dark ? '#000' : '#fff') : T.text,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {icon}{title}
              </button>
            );
          })}
        </div>
        {/* Right: sort (cards mode) or chart picker (charts mode) */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {viewMode === 'cards' && (<>
            <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textMuted }}>排序</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {SORT_OPTIONS.map(({ key, label }) => (
                <button key={key}
                  onClick={() => {
                    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                    else { setSortKey(key); setSortDir('desc'); }
                  }}
                  style={{
                    padding: '4px 12px', fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    background: sortKey === key ? T.border : 'transparent',
                    color: sortKey === key ? (dark ? '#000' : '#fff') : T.text,
                    border: `2px solid ${T.border}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  {label}
                  {sortKey === key && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                      style={{ transform: sortDir === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                      <path d="M12 5v14m-7-7l7-7 7 7"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>)}
          {viewMode === 'charts' && (<>
            <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textMuted }}>圖表</span>
            <BrutalistSelect
              value={chartView}
              onChange={val => setChartView(val)}
              options={CHART_VIEW_OPTIONS}
              darkMode={dark}
              style={{ minWidth: '200px', fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.08em' }}
            />
          </>)}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px 48px', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Overview stats */}
        {stats.length > 0 && (
          <div className="db-card-enter" style={{ animationDelay: '0s' }}>
            <OverviewRow stats={stats} unassignedMeasures={rawData.unassignedMeasures} unassignedTodos={rawData.unassignedTodos} dark={dark} />
          </div>
        )}

        {/* Charts — only shown in charts mode */}
        {viewMode === 'charts' && stats.length > 0 && (
          <div className="db-card-enter" style={{ animationDelay: '0.1s' }}>
            <ChartsSection stats={stats} dark={dark} unassignedMeasures={rawData.unassignedMeasures} unassignedTodos={rawData.unassignedTodos} chartView={chartView} />
          </div>
        )}

        {/* Member cards grid — only shown in cards mode */}
        {viewMode === 'cards' && (stats.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', opacity: 0.5 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={T.text} strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span style={{ fontSize: '14px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, color: T.textMuted }}>
              目前無負責人資料
            </span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {stats.map((stat, i) => (
              <div key={stat.name} className="db-card-enter" style={{ animationDelay: `${i * 0.04}s` }}>
                <MemberCard stat={stat} dark={dark} rank={i < 3 ? i + 1 : null} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Portal: project pick popup */}
      {showProjectPop && createPortal(
        <div ref={projectPopRef} style={{
          position: 'fixed',
          top: projectPopPos.top,
          left: projectPopPos.left,
          width: Math.max(projectPopPos.width, 320),
          zIndex: 9999,
          background: dark ? '#1c1c1c' : '#ffffff',
          border: `2px solid ${T.border}`,
          boxShadow: `6px 6px 0 ${dark ? '#b7b6b6' : '#000'}`,
          padding: '16px',
          maxHeight: '60vh',
          overflowY: 'auto',
        }}>
          <FilterDropdown
            items={availableProjects.map(p => ({ key: p.id, label: p.title || p.objective || '無標題' }))}
            selectedKeys={selectedIds}
            onToggle={toggleProject}
            onClear={() => setSelectedIds(new Set())}
            accentColor={B_BLUE}
            dark={dark}
            emptyLabel="目前無專案資料"
          />
        </div>,
        document.body
      )}

      {/* Portal: assignee pick popup */}
      {showAssigneePop && createPortal(
        <div ref={assigneePopRef} style={{
          position: 'fixed',
          top: assigneePopPos.top,
          left: assigneePopPos.left,
          width: Math.max(assigneePopPos.width, 300),
          zIndex: 9999,
          background: dark ? '#1c1c1c' : '#ffffff',
          border: `2px solid ${T.border}`,
          boxShadow: `6px 6px 0 ${dark ? '#b7b6b6' : '#000'}`,
          padding: '16px',
          maxHeight: '60vh',
          overflowY: 'auto',
        }}>
          <FilterDropdown
            items={allAssignees.map(n => ({ key: n, label: n }))}
            selectedKeys={selectedAssignees}
            onToggle={toggleAssignee}
            onClear={() => setSelectedAssignees(new Set())}
            accentColor={B_PINK}
            dark={dark}
          />
        </div>,
        document.body
      )}

      {/* Dark mode toggle — bottom right */}
      {onToggleDark && (
        <div style={{ position: 'absolute', bottom: '24px', right: '32px', zIndex: 10 }}>
          <button
            onClick={onToggleDark}
            title="切換主題"
            style={{
              width: '96px', height: '40px', borderRadius: '999px',
              background: dark ? '#222222' : '#e4e4e4',
              border: `2px solid ${dark ? '#b7b6b6' : '#000'}`,
              boxShadow: `4px 4px 0 0 ${dark ? '#b7b6b6' : '#000'}`,
              display: 'flex', alignItems: 'center', position: 'relative',
              cursor: 'pointer', padding: '0', transition: 'all 0.3s ease', overflow: 'hidden',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? '#b7b6b6' : '#000'}`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `4px 4px 0 0 ${dark ? '#b7b6b6' : '#000'}`; }}
            onMouseDown={e => { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = `2px 2px 0 0 ${dark ? '#b7b6b6' : '#000'}`; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? '#b7b6b6' : '#000'}`; }}
          >
            <div style={{ width: '100%', display: 'flex', justifyContent: dark ? 'flex-end' : 'flex-start', padding: dark ? '0 12px 0 0' : '0 0 0 12px', boxSizing: 'border-box' }}>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '12px', letterSpacing: '0.05em', color: dark ? '#fff' : '#464646', transition: 'all 0.3s ease' }}>{dark ? 'DARK' : 'LIGHT'}</span>
            </div>
            <div style={{ position: 'absolute', top: '2px', left: dark ? 'calc(0% - 3px)' : 'calc(100% - 30px)', width: '32px', height: '32px', borderRadius: '50%', background: dark ? '#fff' : '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'left 0.3s cubic-bezier(0.175,0.885,0.32,1.275)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              {dark
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a4a4a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#909090" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              }
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
