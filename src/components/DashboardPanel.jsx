import React, { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { loadSavedBgConfig, genModalShapes, loadSavedModalConfig } from '../bgConfig.js';
import BrutalistBackground from './BrutalistBackground.jsx';
import BrutalistSelect from './BrutalistSelect.jsx';
import { navigate } from '../utils/router.js';
import {
  DonutChart, HBarChart, RadarChart, ScatterPlot, TreemapChart,
  ChartLegend, StackedHBarChart, DistributionCard, OverdueRiskMatrix,
  WorkloadBalanceChart, AssigneeBarChart, RadarSection, ChartsSection,
  SORT_OPTIONS, CHART_VIEW_OPTIONS,
} from './DashboardCharts.jsx';
import CrossProjectDashboard from './CrossProjectDashboard .jsx';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const B_YELLOW = '#c8b800';
const B_GREEN  = '#18c96a';
const B_BLUE   = '#3a5bd9';
const B_PINK   = '#d63fa0';
const B_CYAN   = '#0fb8b8';
const B_ORANGE = '#d4750a';

const DARK  = { bg: '#1a1c1e', border: '#5a5a5a', text: '#e8e8e8', textSub: '#a8a8a8', textMuted: '#707070', cardBg: 'rgba(255,255,255,0.055)', headerBg: 'rgba(22,24,26,0.3)', grid: 'rgba(255,255,255,0.05)' };
const LIGHT = { bg: '#edeef0', border: '#3a3a3a', text: '#1a1a1a', textSub: '#404040', textMuted: '#707070', cardBg: 'rgba(0,0,0,0.035)',          headerBg: 'rgba(237,238,240,0.1)', grid: 'rgba(0,0,0,0.05)' };

// ─── MEMBER MODAL SHAPE RENDERER ─────────────────────────────────────────────
function renderMemberShapes(shapes) {
  return (
    <>
      {shapes.stars.map((s,i)=>(
        <div key={`dm-s${i}`} style={{ position:'absolute',...s.pos, color:s.color, opacity:0.18, pointerEvents:'none', zIndex:0, animation:s.anim }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"><path d="M12 2.5L14.7 8.8L21.5 9.5L16.3 14L17.8 20.7L12 17.2L6.2 20.7L7.7 14L2.5 9.5L9.3 8.8L12 2.5Z"/></svg>
        </div>
      ))}
      {shapes.crosses.map((s,i)=>(
        <div key={`dm-x${i}`} style={{ position:'absolute',...s.pos, color:s.color, opacity:0.18, pointerEvents:'none', zIndex:0, animation:s.anim }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="square"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </div>
      ))}
      {shapes.circles.map((s,i)=>(
        <div key={`dm-c${i}`} style={{ position:'absolute',...s.pos, color:s.color, opacity:0.18, pointerEvents:'none', zIndex:0, animation:s.anim }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/></svg>
        </div>
      ))}
      {shapes.tris.map((s,i)=>(
        <div key={`dm-t${i}`} style={{ position:'absolute',...s.pos, color:s.color, opacity:0.2, pointerEvents:'none', zIndex:0, animation:s.anim }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter"><polygon points="12,2 22,20 2,20"/></svg>
        </div>
      ))}
    </>
  );
}

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
    projectCount: st.projects.size,
    overdueTotal: st.overdueMeasures + st.overdueTodos,
    measurePct: st.totalMeasures ? Math.round((st.completedMeasures / st.totalMeasures) * 100) : 0,
    todoPct:    st.totalTodos    ? Math.round((st.doneTodos    / st.totalTodos)    * 100) : 0,
  })).sort((a, b) => b.measurePct - a.measurePct || a.name.localeCompare(b.name));
  return { list, unassignedMeasures, unassignedTodos };
}


// ─── MEMBER DETAIL MODAL ─────────────────────────────────────────────────────
function MemberDetailModal({ stat, dark, onClose }) {
  const T = dark ? DARK : LIGHT;
  const mColor = progressColor(stat.measurePct);
  const tColor = progressColor(stat.todoPct);
  const overdueTot = stat.overdueMeasures + stat.overdueTodos;
  const totalTasks = stat.totalMeasures + stat.totalTodos;
  const completedTot = stat.completedMeasures + stat.doneTodos;
  const healthPct = (completedTot + overdueTot) > 0
    ? Math.round(completedTot / (completedTot + overdueTot) * 100) : 0;

  const _modalCfg = loadSavedModalConfig('member');
  const _shapes   = genModalShapes('member', _modalCfg, _modalCfg.seed);

  // Mini bar helper
  const Bar = ({ pct, color, h = 8 }) => (
    <div style={{ height: h, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
    </div>
  );

  // Stacked segment bar helper
  const StackBar = ({ segments, total }) => (
    <div style={{ height: 10, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', border: `1px solid ${T.border}`, overflow: 'hidden', display: 'flex' }}>
      {segments.filter(s => s.value > 0).map((s, i) => (
        <div key={i} style={{ height: '100%', width: `${total > 0 ? (s.value / total) * 100 : 0}%`, background: s.color, flexShrink: 0 }} />
      ))}
    </div>
  );

  const mdSegments = [
    { label: '完成', value: stat.completedMeasures, color: B_GREEN },
    { label: '進行中', value: stat.inProgressMeasures, color: B_CYAN },
    { label: '逾期', value: stat.overdueMeasures, color: B_PINK },
    { label: '未開始', value: Math.max(0, stat.totalMeasures - stat.completedMeasures - stat.inProgressMeasures - stat.overdueMeasures), color: dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)' },
  ];
  const mpSegments = [
    { label: '完成', value: stat.doneTodos, color: B_GREEN },
    { label: '逾期', value: stat.overdueTodos, color: B_PINK },
    { label: '未完成', value: Math.max(0, stat.totalTodos - stat.doneTodos - stat.overdueTodos), color: dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)' },
  ];

  const KV = ({ label, value, color }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '70px' }}>
      <span style={{ fontSize: '18px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: color || T.text, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: '8px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
    </div>
  );

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: dark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)', backdropFilter: 'grayscale(100%) blur(4px)', WebkitBackdropFilter: 'grayscale(100%) blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <style>{`
        @keyframes ms-starFloat   { 0%{transform:translate(0,0) rotate(0deg) scale(1)} 25%{transform:translate(20px,-30px) rotate(90deg) scale(1.25)} 50%{transform:translate(-10px,20px) rotate(180deg) scale(0.85)} 75%{transform:translate(30px,10px) rotate(270deg) scale(1.15)} 100%{transform:translate(0,0) rotate(360deg) scale(1)} }
        @keyframes ms-crossFloat  { 0%{transform:translate(0,0) rotate(0deg) scale(1)} 33%{transform:translate(-25px,20px) rotate(120deg) scale(1.2)} 66%{transform:translate(15px,-15px) rotate(240deg) scale(0.8)} 100%{transform:translate(0,0) rotate(360deg) scale(1)} }
        @keyframes ms-circleFloat { 0%{transform:translate(0,0) scale(0.88)} 33%{transform:translate(20px,-25px) scale(2)} 66%{transform:translate(-15px,15px) scale(1.5)} 100%{transform:translate(0,0) scale(0.88)} }
        @keyframes ms-triFloat    { 0%{transform:translate(0,0) rotate(0deg) scale(1)} 50%{transform:translate(-20px,-30px) rotate(180deg) scale(1.2)} 100%{transform:translate(0,0) rotate(360deg) scale(1)} }
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '680px', maxHeight: '88vh', overflow: 'hidden',
          position: 'relative',
          background: T.bg,
          backgroundImage: dark
            ? 'linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)'
            : 'linear-gradient(rgba(0,0,0,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.05) 1px,transparent 1px)',
          backgroundSize: '20px 20px',
          border: `3px solid ${T.border}`,
          boxShadow: `8px 8px 0px ${dark ? '#3B5BDB' : '#4A6CF7'}`,
          display: 'flex', flexDirection: 'column',
        }}>
        {renderMemberShapes(_shapes)}

        {/* Header */}
        <div style={{ position: 'relative', zIndex: 1, padding: '20px 24px 16px', borderBottom: `2px solid ${T.border}`, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '22px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: T.text, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>{stat.name}</div>
            <div style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>
              負責 {stat.projects?.length ?? 0} 個專案 · 共 {totalTasks} 項任務
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: T.text, cursor: 'pointer', fontSize: '20px', padding: '4px', fontWeight: 900, transition: 'color 0.15s', flexShrink: 0, lineHeight: 1 }}
            onMouseEnter={e => { e.currentTarget.style.color = '#c96e6e'; }}
            onMouseLeave={e => { e.currentTarget.style.color = T.text; }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ position: 'relative', zIndex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', flex: 1 }}>

          {/* KPI row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 24px' }}>
            <KV label="MD 完成率" value={`${stat.measurePct}%`} color={mColor} />
            <KV label="MP 完成率" value={`${stat.todoPct}%`}    color={tColor} />
            <KV label="任務健康度" value={`${healthPct}%`}      color={healthPct >= 80 ? B_GREEN : healthPct >= 50 ? B_CYAN : B_PINK} />
            <KV label="MD 完成" value={`${stat.completedMeasures}/${stat.totalMeasures}`} color={B_BLUE} />
            <KV label="MP 完成" value={`${stat.doneTodos}/${stat.totalTodos}`}           color={B_PINK} />
            <KV label="逾期合計" value={overdueTot}  color={overdueTot > 0 ? B_PINK : B_GREEN} />
          </div>

          {/* MD section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: B_BLUE }}>MD 定量指標</span>
              <span style={{ fontSize: '15px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: mColor }}>{stat.measurePct}%</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Bar 1: Progress */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 10px', border: `1px solid ${T.border}`, background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
                <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: T.textSub, letterSpacing: '0.05em' }}>[1] 總體完成進度</span>
                <Bar pct={stat.measurePct} color={mColor} h={8} />
              </div>

              {/* Bar 2: Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 10px', border: `1px solid ${T.border}`, background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
                <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: T.textSub, letterSpacing: '0.05em' }}>[2] 任務狀態分佈</span>
                <StackBar segments={mdSegments} total={stat.totalMeasures} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginTop: '4px' }}>
                  {mdSegments.map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '8px', height: '8px', background: s.color, flexShrink: 0, border: `1px solid ${dark ? '#000' : 'transparent'}` }} />
                      <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted }}>{s.label} </span>
                      <span style={{ fontSize: '11px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: T.textSub }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: `1px dashed ${T.border}`, opacity: 0.4 }} />

          {/* MP section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: B_PINK }}>MP 檢核步驟</span>
              <span style={{ fontSize: '15px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: tColor }}>{stat.todoPct}%</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Bar 1: Progress */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 10px', border: `1px solid ${T.border}`, background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
                <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: T.textSub, letterSpacing: '0.05em' }}>[1] 總體完成進度</span>
                <Bar pct={stat.todoPct} color={tColor} h={8} />
              </div>

              {/* Bar 2: Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 10px', border: `1px solid ${T.border}`, background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
                <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: T.textSub, letterSpacing: '0.05em' }}>[2] 任務狀態分佈</span>
                <StackBar segments={mpSegments} total={stat.totalTodos} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginTop: '4px' }}>
                  {mpSegments.map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '8px', height: '8px', background: s.color, flexShrink: 0, border: `1px solid ${dark ? '#000' : 'transparent'}` }} />
                      <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted }}>{s.label} </span>
                      <span style={{ fontSize: '11px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: T.textSub }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: `1px dashed ${T.border}`, opacity: 0.4 }} />

          {/* Risk & Performance grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Overdue breakdown */}
            <div style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${T.border}`, padding: '14px', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
              <div style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: B_PINK, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>逾期分析</div>
              {[
                { label: 'MD 逾期', value: stat.overdueMeasures, total: stat.totalMeasures },
                { label: 'MP 逾期', value: stat.overdueTodos,    total: stat.totalTodos },
              ].map(row => (
                <div key={row.label} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted }}>{row.label}</span>
                    <span style={{ fontSize: '10px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: row.value > 0 ? B_PINK : B_GREEN }}>
                      {row.value} / {row.total}
                    </span>
                  </div>
                  <Bar pct={row.total > 0 ? (row.value / row.total) * 100 : 0} color={row.value > 0 ? B_PINK : B_GREEN} h={6} />
                </div>
              ))}
              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${T.border}`, opacity: 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted }}>逾期比率</span>
                  <span style={{ fontSize: '11px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: overdueTot > 0 ? B_PINK : B_GREEN }}>
                    {totalTasks > 0 ? Math.round(overdueTot / totalTasks * 100) : 0}%
                  </span>
                </div>
                <div style={{ fontSize: '8.5px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted, opacity: 0.8, marginTop: '5%' }}>
                  逾期比率 = (逾期項目總數) ÷ (任務總數) × 100
                </div>
              </div>
            </div>

            {/* Performance radar mini */}
            <div style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${T.border}`, padding: '14px', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}>
              <div style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: B_CYAN, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>執行指標</div>
              {[
                { label: 'MD 完成率',  value: stat.measurePct,  color: B_BLUE },
                { label: 'MP 完成率',  value: stat.todoPct,     color: B_PINK },
                { label: '任務健康度', value: healthPct,         color: healthPct >= 80 ? B_GREEN : healthPct >= 50 ? B_CYAN : B_PINK },
                { label: '進行中積極度', value: stat.totalMeasures > 0 ? Math.round(stat.inProgressMeasures / stat.totalMeasures * 100) : 0, color: B_YELLOW },
              ].map(row => (
                <div key={row.label} style={{ marginBottom: '7px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '9px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted }}>{row.label}</span>
                    <span style={{ fontSize: '10px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, color: row.color }}>{row.value}%</span>
                  </div>
                  <Bar pct={row.value} color={row.color} h={5} />
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div style={{ fontSize: '8.5px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted, textAlign: 'center', opacity: 0.7 }}>
            進行中積極度 ＝ MD 進行中數 ÷ MD 總量<br />
            任務健康度 ＝ (MD、MP完成數) ÷ (MD、MP完成數 + MD、MP逾期數)
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── MEMBER CARD ─────────────────────────────────────────────────────────────
function MemberCard({ stat, dark, rank }) {
  const T = dark ? DARK : LIGHT;
  const mColor = progressColor(stat.measurePct);
  const tColor = progressColor(stat.todoPct);
  const sh = dark ? 'rgba(255,255,255,0.15)' : '#000';

  const rankColors = { 1: B_YELLOW, 2: '#C0C0C0', 3: '#CD7F32' };
  const rankColor = rankColors[rank] || null;

  const [showModal, setShowModal] = useState(false);
  return (
    <>
    {showModal && <MemberDetailModal stat={stat} dark={dark} onClose={() => setShowModal(false)} />}
    <div
      onClick={() => setShowModal(true)}
      style={{
        background: T.cardBg,
        backdropFilter: 'blur(1px)', WebkitBackdropFilter: 'blur(1px)',
        border: `3px solid ${rankColor || T.border}`,
        boxShadow: rankColor ? `6px 6px 0 ${rankColor}` : `4px 4px 0 ${sh}`,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = rankColor ? `8px 8px 0 ${rankColor}` : `6px 6px 0 ${sh}`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = rankColor ? `6px 6px 0 ${rankColor}` : `4px 4px 0 ${sh}`; }}
    >
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
    {/* Click hint */}
    <div style={{ position: 'absolute', bottom: '8px', right: '12px', fontSize: '8px', fontFamily: '"Space Grotesk",sans-serif', fontWeight: 700, color: T.textMuted, opacity: 0.5, letterSpacing: '0.05em', pointerEvents: 'none' }}>
      點擊查看詳情
    </div>
    </>
  );
}

// ─── FILTER DROPDOWN (shared for projects & assignees) ─────────────────────────
function FilterDropdown({ items, selectedKeys, onToggle, onClear, accentColor, dark, emptyLabel }) {
  const [q, setQ] = useState('');
  const T = dark ? DARK : LIGHT;
  const filtered = items.filter(it => it.label.toLowerCase().includes(q.toLowerCase()));
  const allSelected = selectedKeys.size === 0;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Search with inline clear ✕ (固定於頂部) */}
      <div style={{ padding: '16px 16px 10px', flexShrink: 0, borderBottom: `1px solid ${T.border}40` }}>
        <div style={{ position: 'relative' }}>
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
      </div>
      
      {/* Item list (可捲動區域) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px 16px 16px', overflowY: 'auto', flex: 1 }}>
        {/* 全部選項 */}
        <div
          onClick={onClear}
          onMouseEnter={e => { if (!allSelected) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : `${accentColor}12`; }}
          onMouseLeave={e => { if (!allSelected) e.currentTarget.style.background = 'transparent'; }}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '7px 10px', cursor: 'pointer',
            background: allSelected ? (dark ? `${accentColor}55` : `${accentColor}26`) : 'transparent',
            outline: allSelected ? `1px solid ${accentColor}${dark ? '88' : '66'}` : '1px solid transparent',
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
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : `${accentColor}12`; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '7px 10px', cursor: 'pointer',
                background: active ? (dark ? `${accentColor}55` : `${accentColor}26`) : 'transparent',
                outline: active ? `1px solid ${accentColor}${dark ? '88' : '66'}` : '1px solid transparent',
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
          background: T.cardBg, backdropFilter: 'blur(1px)', WebkitBackdropFilter: 'blur(1px)', border: `2px solid ${T.border}`,
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
export default function DashboardPanel({ projects = [], members = [], dark = false, onBack, onGoHome, onToggleDark, exitingTo, entering, onSelectProject }) {
  const [bgConfig] = useState(loadSavedBgConfig);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedAssignees, setSelectedAssignees] = useState(new Set());
  const [sortKey, setSortKey] = useState('measurePct');
  const [sortDir, setSortDir] = useState('desc');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'charts'
  const [chartView, setChartView] = useState('rate_count');
  const [showCrossDashboard, setShowCrossDashboard] = useState(false);

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
    const unlocked = projects.filter(p => !p.isLocked);
    if (selectedAssignees.size === 0) return unlocked;
    return unlocked.filter(p => {
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
    const unlockedProjects = projects.filter(p => !p.isLocked);
    const targets = selectedIds.size === 0 ? unlockedProjects : unlockedProjects.filter(p => selectedIds.has(p.id));
    const names = new Set();

    // No project selected: show full global member list.
    // Project selected: replace options with assignees found in the selected projects only.
    if (selectedIds.size === 0) {
      (Array.isArray(members) ? members : []).forEach((n) => {
        const name = String(n || '').trim();
        if (name) names.add(name);
      });
    }

    targets.forEach(p => {
      (Array.isArray(p.assignees) ? p.assignees : []).forEach((n) => {
        const name = String(n || '').trim();
        if (name) names.add(name);
      });
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
  }, [projects, selectedIds, members]);

  useEffect(() => {
    setSelectedAssignees(prev => {
      if (prev.size === 0) return prev;
      const allowed = new Set(allAssignees);
      const next = new Set([...prev].filter(name => allowed.has(name)));
      return next.size === prev.size ? prev : next;
    });
  }, [allAssignees]);

  const rawData = useMemo(() => buildStats(projects.filter(p => !p.isLocked), selectedIds), [projects, selectedIds]);

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

  const crossProjects = useMemo(() => {
    return (projects || []).map(p => {
      const goals = Array.isArray(p.goals) ? p.goals : [];
      const strategies = Array.isArray(p.strategies)
        ? p.strategies
        : goals.flatMap(g => (Array.isArray(g?.strategies) ? g.strategies : []));
      const measures = Array.isArray(p.measures)
        ? p.measures
        : strategies.flatMap(s => (Array.isArray(s?.measures) ? s.measures : []));
      const todos = Array.isArray(p.todos)
        ? p.todos
        : measures.flatMap(m => (Array.isArray(m?.todos) ? m.todos : []));

      return {
        ...p,
        name: p.name || p.title || '未命名專案',
        goals,
        strategies,
        measures,
        todos,
        members: Array.isArray(p.members) ? p.members : (Array.isArray(p.assignees) ? p.assignees : []),
      };
    });
  }, [projects]);

  const logoRef = useRef(null);

  useLayoutEffect(() => {
    const updateCache = () => {
      if (!logoRef.current || exitingTo) return;
      const el = logoRef.current;
      const oldT = el.style.transform;
      el.style.transform = 'none';
      const rect = el.getBoundingClientRect();
      window.__OGSM_DASH_LOGO_RECT__   = { top: rect.top,  left: rect.left };
      window.__OGSM_DASH_LOGO_HEIGHT__ = rect.height;
      try {
        sessionStorage.setItem('__OGSM_DASH_LOGO_RECT__',   JSON.stringify({ top: rect.top, left: rect.left }));
        sessionStorage.setItem('__OGSM_DASH_LOGO_HEIGHT__', String(rect.height));
      } catch (_) {}
      el.style.transform = oldT;
    };
    updateCache();
    const timer = setTimeout(updateCache, 100);
    window.addEventListener('resize', updateCache);
    return () => { clearTimeout(timer); window.removeEventListener('resize', updateCache); };
  }, [exitingTo]);

  // 動畫：飛回 HomePage 或 SwitchHome
  useLayoutEffect(() => {
    if (exitingTo && logoRef.current) {
      const el = logoRef.current;
      el.style.transition = "none";
      el.style.transform = "none";
      
      const rect = el.getBoundingClientRect();
      let targetX = 0, targetY = 0, scale = 1;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (exitingTo === 'home') {
        const cachedRect = window.__OGSM_HOME_RECT__ ?? (() => { try { const s = sessionStorage.getItem('__OGSM_HOME_RECT__'); return s ? JSON.parse(s) : null; } catch { return null; } })();
        const cachedSize = window.__OGSM_HOME_SIZE__ ?? (() => { try { const s = sessionStorage.getItem('__OGSM_HOME_SIZE__'); return s ? parseFloat(s) : null; } catch { return null; } })();
        const hpFS = Math.min(100, Math.max(80, vw * 0.1));
        const exactLeft = cachedRect?.left ?? (Math.max(0, (vw - 1400) / 2) + 128);
        const exactTop  = cachedRect?.top  ?? Math.max(0, (vh - 64 - hpFS * 2.55 - 200) / 2);
        
        targetX = exactLeft - rect.left;
        targetY = exactTop - rect.top;
        
        // fontSize ratio estimation: Dashboard logo height ~ 31px vs home logo scale
        // home logo is 3em of `cachedSize` font.
        const homeSize = cachedSize ?? hpFS;
        const currentLogoHeight = rect.height; 
        const targetLogoHeight = homeSize * 3; 
        scale = targetLogoHeight / currentLogoHeight;
      } else if (exitingTo === 'projects') {
        // SwitchHome (Projects) logo is 3em of clamped responsive font size.
        // Left 48, Top 24. Font size: clamp(20px, 3vw, 40px)
        const shFS = Math.min(40, Math.max(20, vw * 0.03));
        const targetLogoHeight = shFS * 3;
        targetX = 48 - rect.left;
        targetY = 24 - rect.top;
        scale = targetLogoHeight / rect.height;
      }

      el.style.transformOrigin = "top left";
      
      requestAnimationFrame(() => {
        // 動畫長度要與 App.jsx 中的 transitionTimer 完全對齊
        el.style.transition = "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.45s ease";
        el.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) scale(${scale})`;
        el.style.zIndex = 9999;
        el.style.position = "relative";
      });
    }
  }, [exitingTo]);

  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [showProjectPop, setShowProjectPop] = useState(false);
  const [showAssigneePop, setShowAssigneePop] = useState(false);
  const [projectBtnHovered, setProjectBtnHovered] = useState(false);
  const [assigneeBtnHovered, setAssigneeBtnHovered] = useState(false);
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

  const wrapperClass = `${entering ? 'db-panel-entering' : ''} ${exitingTo === 'projects' ? 'db-panel-exiting' : exitingTo === 'home' ? 'db-panel-exiting-home' : ''}`;

  return (
    <div className={wrapperClass} style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
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
        background: exitingTo ? 'transparent' : T.headerBg,
        backdropFilter: exitingTo ? 'none' : 'blur(5px)', WebkitBackdropFilter: exitingTo ? 'none' : 'blur(5px)',
        borderBottom: `3px solid ${exitingTo ? 'transparent' : T.border}`,
        flexShrink: 0,
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px 16px 32px' }}>
          {/* Back button */}
          <button className={!exitingTo ? "db-anim" : ""} onClick={onBack}
            style={{ background: 'none', border: 'none', color: T.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 0', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: exitingTo ? 0 : 0.6, transition: 'opacity 0.15s', flexShrink: 0 }}
            onMouseEnter={e => { if (!exitingTo) e.currentTarget.style.opacity = '1' }}
            onMouseLeave={e => { if (!exitingTo) e.currentTarget.style.opacity = '0.6' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            返回
          </button>

          <div className={!exitingTo ? "db-anim" : ""} style={{ width: '1px', height: '20px', background: T.border, opacity: exitingTo ? 0 : 0.3, flexShrink: 0 }} />

          {/* Badge + title */}
          <div className={!exitingTo ? "db-anim" : ""} style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0, opacity: exitingTo ? 0 : 1 }}>
            <div style={{ background: B_YELLOW, color: '#000', padding: '4px 10px', fontSize: '9px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', flexShrink: 0 }}>
              DASHBOARD
            </div>
            <h1 style={{ fontSize: '20px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', color: T.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              統計儀表板
            </h1>
          </div>

          {/* Collapse / expand toggle */}
          <button
            className={`db-toggle-btn ${!exitingTo ? "db-anim" : ""}`}
            onClick={() => setHeaderCollapsed(c => !c)}
            title={headerCollapsed ? '展開篩選' : '收起篩選'}
            style={{
              flexShrink: 0, background: headerCollapsed ? B_BLUE : 'transparent',
              border: `2px solid ${headerCollapsed ? B_BLUE : T.border}`,
              color: headerCollapsed ? '#fff' : T.text,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em',
              opacity: exitingTo ? 0 : 1, transition: 'opacity 0.1s'
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
              style={{ transform: headerCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
              <path d="M18 15l-6-6-6 6"/>
            </svg>
            {headerCollapsed ? '展開' : '收起'}
          </button>

          <button
            className={`db-toggle-btn ${!exitingTo ? "db-anim" : ""}`}
            onClick={() => setShowCrossDashboard(true)}
            title="跨專案總覽"
            style={{
              flexShrink: 0,
              background: 'transparent',
              border: `2px solid ${B_PINK}`,
              color: B_PINK,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 900,
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              opacity: exitingTo ? 0 : 1,
              transition: 'opacity 0.1s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = B_PINK;
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = B_PINK;
            }}
          >
            跨專案
          </button>

          <div className={!exitingTo ? "db-anim" : ""} style={{ width: '1px', height: '20px', background: T.border, opacity: exitingTo ? 0 : 0.3, flexShrink: 0 }} />

          {/* Logo → home */}
          <button
            onClick={onGoHome}
            title="回首頁"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', lineHeight: 0, flexShrink: 0, transition: 'opacity 0.15s' }}
            onMouseEnter={e => { if (!exitingTo) e.currentTarget.style.opacity = '0.6' }}
            onMouseLeave={e => { if (!exitingTo) e.currentTarget.style.opacity = '1' }}
          >
            <img
              ref={logoRef}
              src={dark ? '/logo_dark.svg' : '/logo_sun.svg'}
              alt="回首頁"
              style={{ height: '2.2em', width: 'auto', display: 'block', pointerEvents: 'none' }}
              draggable={false}
            />
          </button>
        </div>

        {/* Filter area — two 50/50 popup trigger buttons */}
        <div
          className={`db-filter-wrap ${!exitingTo ? "db-anim" : ""}`}
          style={{
            maxHeight: headerCollapsed ? '0px' : '62px',
            opacity: exitingTo ? 0 : (headerCollapsed ? 0 : 0.75),
            pointerEvents: headerCollapsed ? 'none' : 'auto',
            display: 'flex', alignItems: 'stretch',
            borderTop: `1px solid ${exitingTo ? 'transparent' : T.border}`,
            overflow: 'hidden',
            flexShrink: 0,
            transition: 'max-height 0.38s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {/* Left: Project filter button */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', padding: '0 16px' }}>
            <button
              ref={projectBtnRef}
              onClick={() => { setShowAssigneePop(false); setShowProjectPop(v => !v); }}
              onMouseEnter={() => setProjectBtnHovered(true)}
              onMouseLeave={() => setProjectBtnHovered(false)}
              style={{
                flex: 1,
                background: (showProjectPop || selectedIds.size > 0)
                  ? (dark ? 'rgba(66,66,227,0.18)' : 'rgba(66,66,227,0.08)')
                  : (projectBtnHovered ? (dark ? 'rgba(90,90,255,0.16)' : 'rgba(66,66,227,0.13)') : 'transparent'),
                border: 'none',
                color: selectedIds.size > 0 ? B_BLUE : (projectBtnHovered ? (dark ? '#afc4f8' : B_BLUE) : T.text),
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '14px 0', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
                fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'background 0.15s, color 0.15s',
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
              onMouseEnter={() => setAssigneeBtnHovered(true)}
              onMouseLeave={() => setAssigneeBtnHovered(false)}
              style={{
                flex: 1,
                background: (showAssigneePop || selectedAssignees.size > 0)
                  ? (dark ? 'rgba(255,0,255,0.1)' : 'rgba(255,0,255,0.06)')
                  : (assigneeBtnHovered ? (dark ? 'rgba(255,90,255,0.12)' : 'rgba(255,0,255,0.12)') : 'transparent'),
                border: 'none',
                color: selectedAssignees.size > 0 ? B_PINK : (assigneeBtnHovered ? (dark ? '#ffb3e9' : B_PINK) : T.text),
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '14px 0', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
                fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'background 0.15s, color 0.15s',
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
      <div className={`db-filter-wrap ${!exitingTo ? "db-anim" : ""}`} style={{
        maxHeight: headerCollapsed ? '0px' : '44px',
        opacity: exitingTo ? 0 : (headerCollapsed ? 0 : 1),
        pointerEvents: headerCollapsed ? 'none' : 'auto',
        position: 'relative', zIndex: 2,
        background: exitingTo ? 'transparent' : (dark ? 'rgba(20,20,20,0.7)' : 'rgba(240,240,240,0.7)'),
        borderBottom: `2px solid ${exitingTo ? 'transparent' : T.border}`,
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
            const lightActiveBg = mode === 'cards' ? B_BLUE : B_CYAN;
            const lightHoverBg = mode === 'cards' ? 'rgba(58,91,217,0.10)' : 'rgba(15,184,184,0.12)';
            return (
              <button key={mode} onClick={() => setViewMode(mode)} title={title}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.14)' : lightHoverBg; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                style={{
                  padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px',
                  fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  background: active ? (dark ? '#e0e0e0' : lightActiveBg) : 'transparent',
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
                  onMouseEnter={e => { if (sortKey !== key) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.12)' : 'rgba(58,91,217,0.10)'; }}
                  onMouseLeave={e => { if (sortKey !== key) e.currentTarget.style.background = 'transparent'; }}
                  style={{
                    padding: '4px 12px', fontSize: '10px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 900,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    background: sortKey === key ? (dark ? '#e0e0e0' : B_BLUE) : 'transparent',
                    color: sortKey === key ? (dark ? '#000' : '#fff') : T.text,
                    border: `2px solid ${sortKey === key && !dark ? B_BLUE : T.border}`,
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
      {/* Rest of the dashboard content - fading out and translating down playfully when exiting */}
      <div className="db-anim" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px 48px', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>

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

        {viewMode === 'charts' && stats.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', opacity: 0.5 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={T.text} strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <span style={{ fontSize: '14px', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700, color: T.textMuted }}>
              目前無數據圖表資料
            </span>
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
          maxHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
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
          maxHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
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

      {showCrossDashboard && (
        <CrossProjectDashboard
          projects={crossProjects}
          dark={dark}
          onClose={() => setShowCrossDashboard(false)}
          onSelectProject={(project) => {
            setShowCrossDashboard(false);
            onSelectProject?.(project);
          }}
        />
      )}
    </div>
  );
}