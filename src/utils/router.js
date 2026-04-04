// ── Client-side Routing Utilities ───────────────────────────────────────────

export function parseRoute(pathname = window.location.pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/') return { page: 'home' };
  if (clean === '/management') return { page: 'projects' };
  if (clean === '/dashboard') return { page: 'dashboard' };
  const match = clean.match(/^\/management\/(.+)$/);
  if (match) return { page: 'editor', id: decodeURIComponent(match[1]) };
  return { page: 'home' };
}

export function navigate(path, replace = false) {
  if (replace) window.history.replaceState(null, '', path);
  else window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
