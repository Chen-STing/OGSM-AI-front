import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { api } from '../services/api.js';

const OVERLAY = (dark) => ({
  position: 'fixed', inset: 0, zIndex: 99999,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: dark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.3)',
});

const MODAL_BOX = (dark) => ({
  position: 'relative', width: '380px', maxWidth: '94vw', padding: '28px',
  background: dark ? '#393939' : '#f8f9fa',
  border: `3px solid ${dark ? '#fff' : '#000'}`,
  boxShadow: `8px 8px 0 0 ${dark ? '#223fce' : '#7389dd'}`,
  backgroundImage: dark
    ? 'linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)'
    : 'linear-gradient(rgba(0,0,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.04) 1px,transparent 1px)',
  backgroundSize: '20px 20px',
  display: 'flex', flexDirection: 'column', gap: '18px',
});

function PwdInput({ value, onChange, placeholder, show, onToggleShow, disabled, inputRef, onKeyDown }) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        onKeyDown={onKeyDown}
        autoComplete="new-password"
        style={{
          width: '100%', padding: '10px 44px 10px 12px',
          border: `2px solid ${value ? '#0000FF' : 'rgba(128,128,128,0.4)'}`,
          background: 'transparent',
          color: 'inherit', fontSize: '14px', fontWeight: 700,
          fontFamily: '"Inter","Noto Sans TC",sans-serif',
          outline: 'none', letterSpacing: show ? '0' : '0.15em',
        }}
      />
      <button
        type="button"
        onClick={onToggleShow}
        disabled={disabled}
        style={{
          position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
          color: 'inherit', opacity: 0.5, display: 'flex', alignItems: 'center',
        }}
        tabIndex={-1}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function ModalHeader({ tag, title, dark }) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontFamily: '"DM Mono",monospace', color: '#5e5eea', fontWeight: 900, letterSpacing: '1px', marginBottom: '4px' }}>{tag}</div>
      <div style={{ fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, fontSize: '20px', color: dark ? '#fff' : '#000', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Lock size={18} />
        {title}
      </div>
    </div>
  );
}

function ModalButtons({ onCancel, onConfirm, confirmLabel, loading, confirmDanger, dark }) {
  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
      <button
        onClick={onCancel}
        disabled={loading}
        style={{ fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 20px', background: 'transparent', color: dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', border: `2px solid ${dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}`, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.1s', opacity: loading ? 0.4 : 1 }}
        onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = dark ? '#fff' : '#000'; e.currentTarget.style.color = dark ? '#fff' : '#000'; } }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'; e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'; }}
      >取消</button>
      <button
        onClick={onConfirm}
        disabled={loading}
        style={{ fontFamily: '"Space Grotesk",sans-serif', fontWeight: 900, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 20px', background: confirmDanger ? '#ff0000' : '#0000FF', color: '#fff', border: `3px solid ${confirmDanger ? '#ff0000' : '#0000FF'}`, boxShadow: `4px 4px 0 0 ${dark ? '#686868' : '#000'}`, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.15s', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
        onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? '#686868' : '#000'}`; } }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `4px 4px 0 0 ${dark ? '#686868' : '#000'}`; }}
        onMouseDown={e => { if (!loading) { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = '2px 2px 0 0 #000'; } }}
        onMouseUp={e => { if (!loading) { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = `6px 6px 0 0 ${dark ? '#686868' : '#000'}`; } }}
      >
        {loading && (
          <span style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
        )}
        {confirmLabel}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── *
 *  SetPasswordModal — 設定 / 更換密碼
 * ─────────────────────────────────────────────────────────── */
export function SetPasswordModal({ visible, project, onClose, onSuccess, darkMode: dark }) {
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const pwdRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setPwd(''); setConfirm(''); setError(''); setLoading(false); setShowPwd(false); setShowConfirm(false);
      setTimeout(() => pwdRef.current?.focus(), 60);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [visible, onClose]);

  const handleSubmit = async () => {
    if (!pwd) { setError('請輸入密碼'); return; }
    if (pwd.length < 6) { setError('密碼長度至少 6 字元'); return; }
    if (pwd !== confirm) { setError('兩次輸入的密碼不一致'); return; }
    setError(''); setLoading(true);
    try {
      const updated = await api.lockProject(project.id, pwd);
      onSuccess(updated);
    } catch {
      setError('操作失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit(); };

  if (!visible) return null;
  const isChange = project?.isLocked;

  return createPortal(
    <div onClick={onClose} style={OVERLAY(dark)}>
      <div onClick={e => e.stopPropagation()} style={MODAL_BOX(dark)}>
        <ModalHeader tag="[ PASSWORD ]" title={isChange ? '更換專案密碼' : '設定專案密碼'} dark={dark} />
        <p style={{ fontSize: '13px', color: dark ? '#ccc' : '#555', lineHeight: 1.6, fontWeight: 500, borderLeft: '3px solid #0000FF', paddingLeft: '12px', margin: 0 }}>
          {isChange ? '設定新密碼後，下次開啟此專案需輸入新密碼。' : '設定後，開啟專案前需輸入密碼驗證。'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: dark ? '#fff' : '#000' }}>
          <PwdInput
            inputRef={pwdRef}
            value={pwd} onChange={e => setPwd(e.target.value)}
            placeholder="請輸入密碼（至少 6 字元）"
            show={showPwd} onToggleShow={() => setShowPwd(v => !v)}
            disabled={loading} onKeyDown={handleKeyDown}
          />
          <PwdInput
            value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="再次輸入密碼"
            show={showConfirm} onToggleShow={() => setShowConfirm(v => !v)}
            disabled={loading} onKeyDown={handleKeyDown}
          />
          {error && <div style={{ fontSize: '12px', color: '#ff0000', fontWeight: 700 }}>{error}</div>}
        </div>
        <ModalButtons onCancel={onClose} onConfirm={handleSubmit} confirmLabel={isChange ? '確認更換' : '確認設定'} loading={loading} dark={dark} />
      </div>
    </div>,
    document.body
  );
}

/* ─────────────────────────────────────────────────────────── *
 *  RemoveLockModal — 移除密碼保護
 * ─────────────────────────────────────────────────────────── */
export function RemoveLockModal({ visible, project, onClose, onSuccess, darkMode: dark }) {
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const pwdRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setPwd(''); setError(''); setLoading(false); setShowPwd(false);
      setTimeout(() => pwdRef.current?.focus(), 60);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [visible, onClose]);

  const handleSubmit = async () => {
    if (!pwd) { setError('請輸入目前密碼'); return; }
    setError(''); setLoading(true);
    try {
      const result = await api.verifyPassword(project.id, pwd);
      if (!result.success) {
        setError(result.message || '密碼錯誤，請重新輸入。');
        setPwd('');
        setTimeout(() => pwdRef.current?.focus(), 60);
        return;
      }
      const updated = await api.removeLock(project.id);
      onSuccess(updated);
    } catch {
      setError('操作失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit(); };

  if (!visible) return null;

  return createPortal(
    <div onClick={onClose} style={OVERLAY(dark)}>
      <div onClick={e => e.stopPropagation()} style={MODAL_BOX(dark)}>
        <ModalHeader tag="[ UNLOCK ]" title="移除密碼保護" dark={dark} />
        <p style={{ fontSize: '13px', color: dark ? '#ccc' : '#555', lineHeight: 1.6, fontWeight: 500, borderLeft: '3px solid #ff0000', paddingLeft: '12px', margin: 0 }}>
          請先輸入目前密碼以驗證身份。
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: dark ? '#fff' : '#000' }}>
          <PwdInput
            inputRef={pwdRef}
            value={pwd} onChange={e => setPwd(e.target.value)}
            placeholder="目前密碼"
            show={showPwd} onToggleShow={() => setShowPwd(v => !v)}
            disabled={loading} onKeyDown={handleKeyDown}
          />
          {error && <div style={{ fontSize: '12px', color: '#ff0000', fontWeight: 700 }}>{error}</div>}
        </div>
        <ModalButtons onCancel={onClose} onConfirm={handleSubmit} confirmLabel="確認移除" loading={loading} confirmDanger dark={dark} />
      </div>
    </div>,
    document.body
  );
}

/* ─────────────────────────────────────────────────────────── *
 *  PasswordGateModal — 驗證密碼開啟專案
 * ─────────────────────────────────────────────────────────── */
export function PasswordGateModal({ visible, project, onClose, onSuccess, darkMode: dark }) {
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const pwdRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setPwd(''); setError(''); setLoading(false); setShowPwd(false);
      setTimeout(() => pwdRef.current?.focus(), 60);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [visible, onClose]);

  const handleSubmit = async () => {
    if (!pwd) { setError('請輸入密碼'); return; }
    setError(''); setLoading(true);
    try {
      const result = await api.verifyPassword(project.id, pwd);
      if (!result.success) {
        setError(result.message || '密碼錯誤，請重新輸入。');
        setPwd('');
        setTimeout(() => pwdRef.current?.focus(), 60);
        return;
      }
      onSuccess();
    } catch {
      setError('操作失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit(); };

  if (!visible) return null;

  return createPortal(
    <div onClick={onClose} style={OVERLAY(dark)}>
      <div onClick={e => e.stopPropagation()} style={MODAL_BOX(dark)}>
        <ModalHeader tag="[ PROTECTED ]" title="此專案已加密保護" dark={dark} />
        <p style={{ fontSize: '13px', color: dark ? '#ccc' : '#555', lineHeight: 1.6, fontWeight: 500, borderLeft: '3px solid #0000FF', paddingLeft: '12px', margin: 0 }}>
          請輸入密碼以開啟專案。
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: dark ? '#fff' : '#000' }}>
          <PwdInput
            inputRef={pwdRef}
            value={pwd} onChange={e => setPwd(e.target.value)}
            placeholder="請輸入密碼"
            show={showPwd} onToggleShow={() => setShowPwd(v => !v)}
            disabled={loading} onKeyDown={handleKeyDown}
          />
          {error && <div style={{ fontSize: '12px', color: '#ff0000', fontWeight: 700 }}>{error}</div>}
        </div>
        <ModalButtons onCancel={onClose} onConfirm={handleSubmit} confirmLabel="確認" loading={loading} dark={dark} />
      </div>
    </div>,
    document.body
  );
}
