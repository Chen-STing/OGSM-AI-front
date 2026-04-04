import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import BrutalistBackground from './BrutalistBackground.jsx';
import { loadSavedBgConfig } from '../bgConfig.js';

const ACCENT_BLUE   = '#4444cc';
const ACCENT_GREEN  = '#21c209';

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildPopBase(dark) {
  return {
    position: 'fixed',
    zIndex: 99999,
    border: `3px solid ${dark ? '#fff' : '#000'}`,
    background: dark ? '#2e2e2e' : '#f0f0f0',
    backgroundImage: dark
      ? 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)'
      : 'linear-gradient(rgba(0,0,0,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.09) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    boxShadow: `5px 5px 0 0 ${dark ? 'rgba(255,255,255,0.3)' : '#000'}`,
  };
}

function triggerBtnStyle(active, hovered, dark) {
  return {
    background: active ? ACCENT_BLUE : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"),
    color: active ? '#fff' : (dark ? '#fff' : '#000'),
    border: `2px solid ${active ? ACCENT_BLUE : 'transparent'}`,
    backdropFilter: "blur(4px)",
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
    transform: hovered ? 'scale(1.15)' : 'scale(1)',
  };
}

/** Collect all unique assignee names from todos across all projects */
function getAllTodoAssignees(projects) {
  const people = new Set();
  projects.forEach(p => {
    if (!Array.isArray(p.goals)) return;
    p.goals.forEach(g =>
      (g.strategies || []).forEach(s =>
        (s.measures || []).forEach(m =>
          (m.todos || []).forEach(t =>
            (t.assignees || []).forEach(a => { if (a) people.add(a); })
          )
        )
      )
    );
  });
  return [...people].sort();
}

/** Collect every date string that has at least one todo (optionally filtered by member set) */
function getAllTodoDates(projects, memberSet) {
  const dates = new Set();
  projects.forEach(p => {
    if (!Array.isArray(p.goals)) return;
    p.goals.forEach(g =>
      (g.strategies || []).forEach(s =>
        (s.measures || []).forEach(m =>
          (m.todos || []).forEach(t => {
            if (!t.deadline) return;
            if (memberSet && memberSet.size > 0) {
              if (!(t.assignees || []).some(a => memberSet.has(a))) return;
            }
            dates.add(t.deadline);
          })
        )
      )
    );
  });
  return dates;
}

/** Flatten todos for a specific date (optionally filtered by member set) */
function flattenTodosForDate(projects, date, memberSet) {
  return projects.flatMap(p => {
    if (!Array.isArray(p.goals)) return [];
    return p.goals.flatMap((g, gi) =>
      (g.strategies || []).flatMap((s, si) =>
        (s.measures || []).flatMap((m, mi) =>
          (m.todos || []).reduce((acc, t, realTi) => {
            if (t.deadline !== date) return acc;
            if (memberSet && memberSet.size > 0) {
              if (!(t.assignees || []).some(a => memberSet.has(a))) return acc;
            }
            acc.push({
              ...t,
              projectTitle: p.title || p.objective || '無標題',
              measureKpi: m.kpi || '',
              mdNum: `D${gi + 1}.${si + 1}.${mi + 1}`,
              mpNum: `P${gi + 1}.${si + 1}.${mi + 1}.${realTi + 1}`,
              _path: { projectId: p.id, gi, si, mi, ti: realTi },
            });
            return acc;
          }, [])
        )
      )
    );
  });
}

/** Mini calendar grid — Monday first */
function MiniCalendar({ year, month, selectedDate, todoDates, today, dark, onSelectDate, onPrevMonth, onNextMonth }) {
  const pad = n => String(n).padStart(2, '0');

  const firstDow    = new Date(year, month, 1).getDay();       // 0=Sun
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;      // Mon-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells  = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const day = i - startOffset + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  const monthLabel = new Date(year, month, 1)
    .toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' });

  const navBtn = (icon, onClick) => (
    <button
      onClick={onClick}
      style={{
        width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: `2px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
        color: dark ? '#fff' : '#000', cursor: 'pointer', flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = ACCENT_BLUE; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = ACCENT_BLUE; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = dark ? '#fff' : '#000'; e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'; }}
    >
      {icon}
    </button>
  );

  return (
    <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px 16px', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}>
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        {navBtn(
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6"/></svg>,
          onPrevMonth
        )}
        <span style={{ fontSize: '13px', fontWeight: 900, color: dark ? '#fff' : '#000', letterSpacing: '0.04em' }}>
          {monthLabel}
        </span>
        {navBtn(
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6"/></svg>,
          onNextMonth
        )}
      </div>

      {/* Day-of-week headers + day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {['一','二','三','四','五','六','日'].map((d, i) => (
          <div key={d} style={{
            textAlign: 'center', fontSize: '10px', fontWeight: 900,
            color: i === 6
              ? (dark ? 'rgba(255,80,80,0.8)' : 'rgba(200,0,0,0.7)')
              : (dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'),
            paddingBottom: '4px',
          }}>
            {d}
          </div>
        ))}

        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr    = `${year}-${pad(month + 1)}-${pad(day)}`;
          const isSelected = dateStr === selectedDate;
          const isToday    = dateStr === today;
          const hasTodo    = todoDates.has(dateStr);
          const isSun      = (i % 7) === 6;

          return (
            <div
              key={i}
              onClick={() => onSelectDate(dateStr)}
              style={{
                position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                aspectRatio: '1', cursor: 'pointer',
                background: isSelected ? ACCENT_BLUE : 'transparent',
                outline: isToday && !isSelected ? `2px solid ${ACCENT_GREEN}` : 'none',
                outlineOffset: '-2px',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{
                fontSize: '12px',
                fontWeight: isToday || isSelected ? 900 : 600,
                lineHeight: 1,
                color: isSelected
                  ? '#fff'
                  : isSun
                    ? (dark ? 'rgba(255,100,100,0.9)' : 'rgba(180,0,0,0.8)')
                    : (dark ? '#fff' : '#000'),
              }}>
                {day}
              </span>
              {hasTodo && (
                <span style={{
                  position: 'absolute', bottom: '2px',
                  width: '4px', height: '4px', borderRadius: '50%',
                  background: isSelected ? '#fff' : ACCENT_BLUE,
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Today shortcut */}
      <button
        onClick={() => onSelectDate(today)}
        style={{
          fontSize: '11px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '6px 0', border: `2px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
          background: 'transparent', color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
          cursor: 'pointer', width: '100%',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = ACCENT_GREEN; e.currentTarget.style.color = '#000'; e.currentTarget.style.borderColor = ACCENT_GREEN; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'; e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'; }}
      >
        今日
      </button>
    </div>
  );
}

export default function MpCalendarPanel({ projects, dark, onUpdateProject }) {
  const today = getTodayStr();

  const [show, setShow]       = useState(false);
  const [date, setDate]       = useState(today);
  const [hovered, setHovered] = useState(false);

  const [calYear, setCalYear]   = useState(() => parseInt(today.slice(0, 4), 10));
  const [calMonth, setCalMonth] = useState(() => parseInt(today.slice(5, 7), 10) - 1);

  const [memberFilter, setMemberFilter] = useState(new Set());
  const [memberDropOpen, setMemberDropOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const dropRef = useRef(null);

  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [doneFilter, setDoneFilter] = useState('undone'); // 'all' | 'done' | 'undone'

  const [bgConfig, setBgConfig] = useState(() => loadSavedBgConfig());

  useEffect(() => {
    const h = () => setBgConfig(loadSavedBgConfig());
    window.addEventListener('brutalistBgChanged', h);
    return () => window.removeEventListener('brutalistBgChanged', h);
  }, []);

  useEffect(() => {
    if (!memberDropOpen) return;
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setMemberDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [memberDropOpen]);

  useEffect(() => {
    if (!show) return;
    const h = (e) => { if (e.key === 'Escape') setShow(false); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [show]);

  const handleSelectDate = (d) => {
    setDate(d);
    setCalYear(parseInt(d.slice(0, 4), 10));
    setCalMonth(parseInt(d.slice(5, 7), 10) - 1);
  };

  const toggleGroup = (title) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  };

  const handleToggleDone = (t) => {
    if (!onUpdateProject || !t._path) return;
    const { projectId, gi, si, mi, ti } = t._path;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const todayStr = getTodayStr();

    const updated = {
      ...project,
      goals: project.goals.map((g, gIdx) =>
        gIdx !== gi ? g : {
          ...g,
          strategies: g.strategies.map((s, sIdx) =>
            sIdx !== si ? s : {
              ...s,
              measures: s.measures.map((m, mIdx) => {
                if (mIdx !== mi) return m;
                const newTodos = m.todos.map((td, tIdx) =>
                  tIdx !== ti ? td : { ...td, done: !td.done }
                );
                const doneCount = newTodos.filter(td => td.done).length;
                const progress = newTodos.length
                  ? Math.round((doneCount / newTodos.length) * 100)
                  : 0;
                const isOverdue = m.deadline && m.deadline < todayStr;
                let status;
                if (newTodos.length > 0 && doneCount === newTodos.length) status = 'Completed';
                else if (isOverdue) status = 'Overdue';
                else if (doneCount > 0) status = 'InProgress';
                else status = 'NotStarted';
                return { ...m, todos: newTodos, progress, status };
              }),
            }
          ),
        }
      ),
    };
    onUpdateProject(updated);
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const allAssignees = getAllTodoAssignees(projects);
  const todoDates = getAllTodoDates(projects, memberFilter);
  const mpTodos   = flattenTodosForDate(projects, date, memberFilter);
  const filteredTodos = doneFilter === 'done'
    ? mpTodos.filter(t => t.done)
    : doneFilter === 'undone'
      ? mpTodos.filter(t => !t.done)
      : mpTodos;
  const grouped   = filteredTodos.reduce((acc, t) => {
    if (!acc[t.projectTitle]) acc[t.projectTitle] = [];
    acc[t.projectTitle].push(t);
    return acc;
  }, {});
  const doneCount = mpTodos.filter(t => t.done).length;

  const popBase = buildPopBase(dark);

  const formattedDate = new Date(date + 'T00:00:00')
    .toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setShow(v => !v)}
        style={triggerBtnStyle(show, hovered, dark)}
        title="行事曆．MP 檢核步驟追蹤"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>

      {show && createPortal(
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShow(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 99998,
              background: dark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(2px)',
            }}
          />

          {/* Modal */}
          <div
            style={{
              ...popBase,
              position: 'fixed',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 99999,
              width: '740px',
              maxWidth: 'calc(100vw - 32px)',
              height: '80vh',
              maxHeight: 'calc(100vh - 48px)',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
              background: 'transparent',
              backgroundImage: 'none',
            }}
          >
            <BrutalistBackground dark={dark} bgConfig={bgConfig} />

            {/* ── Header bar ── */}
            <div style={{
              position: 'relative', zIndex: 2,
              padding: '10px 16px',
              borderBottom: `2px solid ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: dark ? 'rgba(17,17,17,0.6)' : 'rgba(248,248,248,0.8)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              flexShrink: 0,
            }}>
              <span style={{
                fontSize: '12px', fontWeight: 900, letterSpacing: '0.1em',
                textTransform: 'uppercase', background: 'transparent', color: dark ? '#ffff00' : '#000', padding: '2px 6px',
              }}>
                行事曆 · MP 檢核步驟追蹤
              </span>
              <button
                onClick={() => setShow(false)}
                style={{
                  width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)', padding: 0,
                }}
                onMouseEnter={e => e.currentTarget.style.color = dark ? '#fff' : '#000'}
                onMouseLeave={e => e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* ── Two-column body ── */}
            <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', overflow: 'hidden' }}>

              {/* Left: Member filter + Calendar */}
              <div style={{
                flexShrink: 0,
                borderRight: `2px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}>
                {/* Member filter dropdown */}
                {allAssignees.length > 0 && (
                  <div
                    ref={dropRef}
                    style={{ position: 'relative', padding: '10px 16px 0', flexShrink: 0 }}
                  >
                    <button
                      onClick={() => setMemberDropOpen(v => !v)}
                      style={{
                        width: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 10px', cursor: 'pointer',
                        background: memberFilter.size > 0 ? ACCENT_BLUE : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                        border: `2px solid ${memberFilter.size > 0 ? ACCENT_BLUE : (dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')}`,
                        color: memberFilter.size > 0 ? '#fff' : (dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'),
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.05em' }}>
                        {memberFilter.size === 0 ? '全部負責人' : `${memberFilter.size} 位負責人`}
                      </span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                        style={{ transform: memberDropOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0 }}>
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>

                    {memberDropOpen && (
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 2px)', left: '16px', right: '16px',
                        zIndex: 100001,
                        background: dark ? '#1e1e1e' : '#f8f8f8',
                        border: `2px solid ${dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'}`,
                        boxShadow: `3px 3px 0 ${dark ? 'rgba(255,255,255,0.12)' : '#000'}`,
                        padding: '4px 0',
                      }}>
                        {/* Search box */}
                        <div style={{ position: 'relative', padding: '6px 8px', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                            style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', pointerEvents: 'none' }}>
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                          </svg>
                          <input
                            type="text"
                            value={memberSearch}
                            onChange={e => setMemberSearch(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            placeholder="搜尋負責人…"
                            style={{
                              width: '100%', padding: '4px 22px 4px 22px', boxSizing: 'border-box',
                              background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                              border: `1px solid ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
                              color: dark ? '#fff' : '#000',
                              fontSize: '11px', fontWeight: 700, fontFamily: 'inherit',
                              outline: 'none', borderRadius: 0,
                            }}
                          />
                          {memberSearch && (
                            <button
                              onClick={e => { e.stopPropagation(); setMemberSearch(''); }}
                              style={{
                                position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
                              }}
                              onMouseEnter={e => e.currentTarget.style.color = dark ? '#fff' : '#000'}
                              onMouseLeave={e => e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'}
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Scrollable list */}
                        <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                        {/* Clear all */}
                        <div
                          onClick={() => setMemberFilter(new Set())}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
                            cursor: 'pointer',
                            borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={{
                            width: '12px', height: '12px', flexShrink: 0,
                            border: `2px solid ${dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {memberFilter.size === 0 && <span style={{ width: '6px', height: '6px', background: dark ? '#fff' : '#000' }} />}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: dark ? '#fff' : '#000' }}>全部</span>
                        </div>

                        {allAssignees.filter(n => n.toLowerCase().includes(memberSearch.toLowerCase())).map(name => {
                          const checked = memberFilter.has(name);
                          return (
                            <div
                              key={name}
                              onClick={() => setMemberFilter(prev => {
                                const next = new Set(prev);
                                checked ? next.delete(name) : next.add(name);
                                return next;
                              })}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
                                cursor: 'pointer',
                                background: checked ? (dark ? 'rgba(0,0,255,0.18)' : 'rgba(0,0,255,0.06)') : 'transparent',
                              }}
                              onMouseEnter={e => { if (!checked) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'; }}
                              onMouseLeave={e => e.currentTarget.style.background = checked ? (dark ? 'rgba(0,0,255,0.18)' : 'rgba(0,0,255,0.06)') : 'transparent'}
                            >
                              <span style={{
                                width: '12px', height: '12px', flexShrink: 0,
                                border: `2px solid ${checked ? ACCENT_BLUE : (dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)')}`,
                                background: checked ? ACCENT_BLUE : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {checked && (
                                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                )}
                              </span>
                              <span style={{
                                fontSize: '11px', fontWeight: 700, color: dark ? '#fff' : '#000',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {name}
                              </span>
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <MiniCalendar
                  year={calYear}
                  month={calMonth}
                  selectedDate={date}
                  todoDates={todoDates}
                  today={today}
                  dark={dark}
                  onSelectDate={handleSelectDate}
                  onPrevMonth={prevMonth}
                  onNextMonth={nextMonth}
                />
              </div>

              {/* Right: Todo list */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                {/* Selected date label + status filter */}
                <div style={{
                  flexShrink: 0,
                  display: 'flex', flexDirection: 'column',
                }}>
                  <span style={{
                    fontSize: '13px', fontWeight: 900,
                    color: dark ? '#fff' : '#000',
                    padding: '10px 0 8px 16px',
                    display: 'block',
                  }}>
                    {formattedDate}
                  </span>
                  {/* Done filter toggle */}
                  <div style={{
                    display: 'flex',
                    borderTop: `2px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    borderBottom: `2px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    backdropFilter: 'blur(2px)',
                    WebkitBackdropFilter: 'blur(2px)',
                  }}>
                    {[['all','全部'],['undone','未完成'],['done','已完成']].map(([val, label], idx) => {
                      const active = doneFilter === val;
                      return (
                        <button
                          key={val}
                          onClick={() => setDoneFilter(val)}
                          style={{
                            flex: 1,
                            fontSize: '11px', fontWeight: 900, letterSpacing: '0.04em',
                            padding: '6px 0',
                            border: 'none',
                            borderLeft: idx > 0 ? `2px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` : 'none',
                            background: active ? ACCENT_BLUE : 'transparent',
                            color: active ? '#fff' : (dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)'),
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { if (!active) { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'; e.currentTarget.style.color = dark ? '#fff' : '#000'; } }}
                          onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)'; } }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Items */}
                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 0' }}>
                  {mpTodos.length === 0 ? (
                    <div style={{
                      padding: '48px 16px', textAlign: 'center',
                      color: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                      fontSize: '13px', fontWeight: 700,
                    }}>
                      此日期無 MP 檢核步驟事項
                    </div>
                  ) : Object.keys(grouped).length === 0 ? (
                    <div style={{
                      padding: '48px 16px', textAlign: 'center',
                      color: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                      fontSize: '13px', fontWeight: 700,
                    }}>
                      無符合篩選的事項
                    </div>
                  ) : (
                    Object.entries(grouped).map(([projectTitle, todos]) => {
                      const collapsed = collapsedGroups.has(projectTitle);
                      return (
                      <div key={projectTitle} style={{ marginBottom: '4px' }}>
                        {/* Group header — click to collapse/expand */}
                        <div
                          onClick={() => toggleGroup(projectTitle)}
                          style={{
                            padding: '6px 16px 4px', fontSize: '10px', fontWeight: 900,
                            letterSpacing: '0.08em', textTransform: 'uppercase',
                            color: dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                            borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px',
                            userSelect: 'none',
                            background: dark ? 'rgba(20,20,20,0.72)' : 'rgba(200,200,200,0.72)'
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)'}
                          onMouseLeave={e => e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                            {projectTitle}
                          </span>
                          <svg
                            width="9" height="9" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="3"
                            style={{ flexShrink: 0, transition: 'transform 0.15s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                          >
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        </div>

                        {/* Todo items — hidden when collapsed */}
                        {!collapsed && todos.map(t => {
                          const canToggle = !!onUpdateProject && !!t._path;
                          return (
                          <div key={t.id} style={{ borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
                            {/* Main row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
                              {/* Checkbox */}
                              <div
                                onClick={() => handleToggleDone(t)}
                                style={{
                                  flexShrink: 0,
                                  width: '16px', height: '16px',
                                  border: `2px solid ${t.done ? ACCENT_BLUE : (dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)')}`,
                                  background: t.done ? ACCENT_BLUE : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  cursor: canToggle ? 'pointer' : 'default',
                                  transition: 'all 0.15s',
                                }}
                              >
                                {t.done && (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                )}
                              </div>

                              {/* P编号 badge */}
                              <span style={{
                                flexShrink: 0,
                                fontSize: '10px', fontWeight: 900, fontFamily: 'monospace',
                                color: '#fff',
                                background: t.done ? (dark ? 'rgba(68,68,204,0.45)' : 'rgba(68,68,204,0.35)') : ACCENT_BLUE,
                                padding: '1px 5px',
                                letterSpacing: '0.04em',
                                opacity: t.done ? 0.6 : 1,
                              }}>
                                {t.mpNum}
                              </span>

                              {/* Text */}
                              <span style={{
                                flex: 1, minWidth: 0,
                                fontSize: '13px', fontWeight: 700,
                                color: t.done
                                  ? (dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)')
                                  : (dark ? '#fff' : '#000'),
                                textDecoration: t.done ? 'line-through' : 'none',
                                wordBreak: 'break-word',
                              }}>
                                {t.text || '（無標題）'}
                              </span>
                            </div>

                            {/* Detail sub-row: D编号, KPI, assignees */}
                            {(t.mdNum || t.measureKpi || (t.assignees || []).length > 0) && (
                              <div style={{ padding: '0 16px 8px 50px', display: 'flex', flexDirection: 'column', gap: '4px', opacity: t.done ? 0.5 : 1 }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '10px', fontWeight: 700 }}>
                                  <span style={{ color: dark ? '#fff' : '#000', fontFamily: 'monospace' }}>{t.mdNum}</span>
                                  {t.measureKpi && (
                                    <>
                                      <span style={{ opacity: 0.4, color: dark ? '#fff' : '#000' }}>·</span>
                                      <span style={{ color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>{t.measureKpi}</span>
                                    </>
                                  )}
                                </div>
                                {(t.assignees || []).length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {t.assignees.map(a => (
                                      <span key={a} style={{
                                        fontSize: '10px', fontWeight: 700,
                                        padding: '1px 6px',
                                        border: `1px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
                                        color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                                      }}>
                                        {a}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
