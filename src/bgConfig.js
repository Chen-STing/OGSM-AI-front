// ─── bgConfig.js ─────────────────────────────────────────────────────────────
// Pure data & helpers — no React, safe to import anywhere.

export const PALETTE = [
  '#0d0dd0ff', '#FF00FF', '#bcbc31', '#00FF00',
  '#ff7300', '#02fcfc', '#fd0000', '#00d4fa', '#FFFF00',
]

// ─── BrutalistBackground original shapes ──────────────────────────────────────
export const ORIGINAL_STARS = [
  { top: '25%',  left: '-40px', color: '#0d0dd0ff', size: 230, duration: '20s', anim: 'starRotateScale1' },
  { bottom: '25%', right: '-80px', color: '#FF00FF', size: 450, duration: '25s', anim: 'starRotateScale2' },
]
export const ORIGINAL_CIRCLES = [
  { top: '11%', left: '80%', color: '#ff7300',  size: 80,  duration: '14s' },
  { top: '75%', left: '10%', color: '#bcbc31',  size: 140, duration: '20s' },
  { top: '85%', left: '60%', color: '#02fcfc',  size: 60,  duration: '16s' },
]
export const ORIGINAL_TRIS = [
  { top: '35%', left: '17%', color: '#00FF00',   size: 65, duration: '18s' },
  { top: '65%', left: '80%', color: '#0d0dd0ff', size: 80, duration: '22s' },
  { top: '41%', left: '53%', color: '#fd0000',   size: 40, duration: '25s' },
  { top: '6%',  left: '46%', color: '__DARK__',  size: 60, duration: '15s' },
]
export const ORIGINAL_CROSSES = [
  { top: '10%', left: '20%', color: '#00d4fa',  size: 40, duration: '15s' },
  { top: '80%', left: '25%', color: '#FF00FF',  size: 60, duration: '22s' },
  { top: '40%', left: '81%', color: '#bcbc31',  size: 50, duration: '18s' },
  { top: '7%',  left: '67%', color: '#00FF00',  size: 35, duration: '25s' },
  { top: '60%', left: '45%', color: '__DARK__', size: 30, duration: '20s' },
]
export const DEFAULT_CONFIG = {
  watermarkText: 'STRATEGIC FOCUS',
  starCount:   ORIGINAL_STARS.length,
  circleCount: ORIGINAL_CIRCLES.length,
  crossCount:  ORIGINAL_CROSSES.length,
  triCount:    ORIGINAL_TRIS.length,
}

// ─── Modal shape original data (per modal) ────────────────────────────────────
export const MODAL_SS_KEYS = {
  generate: 'brutalist-modal-generate',
  member:   'brutalist-modal-member',
  aiconfirm:'brutalist-modal-aiconfirm',
}

export const MODAL_DEFAULT_CONFIGS = {
  generate: { starCount: 1, circleCount: 1, crossCount: 1, triCount: 1 },
  member:   { starCount: 1, circleCount: 1, crossCount: 1, triCount: 1 },
  aiconfirm:{ starCount: 1, circleCount: 1, crossCount: 1, triCount: 1 },
}

export const MODAL_ORIGINAL_SHAPES = {
  generate: {
    stars:   [{ pos: { bottom: '-60px', left: '-60px' }, color: '#00FF00', size: 240, anim: 'gm-starFloat 20s infinite ease-in-out' }],
    crosses: [{ pos: { top: '15%', right: '7%' },       color: '#FF00FF', size: 100, anim: 'gm-crossFloat 16s infinite ease-in-out' }],
    circles: [{ pos: { bottom: '30%', right: '35%' },   color: '#0000FF', size: 70,  anim: 'gm-circleFloat 10s infinite ease-in-out' }],
    tris:    [{ pos: { top: '15%', left: '1%' },        color: '#FFFF00', size: 110, anim: 'gm-triFloat 18s infinite ease-in-out' }],
  },
  member: {
    stars:   [{ pos: { bottom: '-60px', left: '-60px' }, color: '#ff3300', size: 210, anim: 'ms-starFloat 20s infinite ease-in-out' }],
    crosses: [{ pos: { top: '7%', right: '7%' },         color: '#00ff0d', size: 100, anim: 'ms-crossFloat 16s infinite ease-in-out' }],
    circles: [{ pos: { bottom: '30%', right: '35%' },    color: '#0000FF', size: 90,  anim: 'ms-circleFloat 22s infinite ease-in-out' }],
    tris:    [{ pos: { top: '13%', left: '5%' },         color: '#ff00aa', size: 110, anim: 'ms-triFloat 25s infinite ease-in-out' }],
  },
  aiconfirm: {
    stars:   [{ pos: { bottom: '-60px', left: '-60px' }, color: '#00ccff', size: 200, anim: 'acd-starFloat 20s infinite ease-in-out' }],
    crosses: [{ pos: { top: '15%', right: '7%' },        color: '#ff0000', size: 70,  anim: 'acd-crossFloat 16s infinite ease-in-out' }],
    circles: [{ pos: { bottom: '32%', right: '37%' },    color: '#00ff2a', size: 80,  anim: 'acd-circleFloat 22s infinite ease-in-out' }],
    tris:    [{ pos: { top: '15%', left: '1%' },         color: '#d400ff', size: 110, anim: 'acd-triFloat 25s infinite ease-in-out' }],
  },
}

// ─── Seeded random ────────────────────────────────────────────────────────────
function seededRand(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

export function genItems(count, seed, sizeMin, sizeMax) {
  const r = seededRand(seed)
  return Array.from({ length: count }, (_, i) => ({
    id:       i,
    top:      `${Math.floor(r() * 96)}%`,
    left:     `${Math.floor(r() * 96)}%`,
    size:     Math.floor(r() * (sizeMax - sizeMin) + sizeMin),
    color:    PALETTE[Math.floor(r() * PALETTE.length)],
    duration: `${(r() * 12 + 10).toFixed(1)}s`,
  }))
}

const MODAL_SEEDS = {
  generate:  { star: 0xAA11BB22, cross: 0xCC33DD44, circle: 0xEE55FF66, tri: 0x11223344 },
  member:    { star: 0x55667788, cross: 0x99AABBCC, circle: 0xDDEEFF00, tri: 0x12345678 },
  aiconfirm: { star: 0xABCDEF01, cross: 0x23456789, circle: 0x3C4D5E6F, tri: 0x7890ABCD },
}

const MODAL_ANIM_PREFIXES = {
  generate:  { star: 'gm-starFloat',  cross: 'gm-crossFloat',  circle: 'gm-circleFloat',  tri: 'gm-triFloat'  },
  member:    { star: 'ms-starFloat',  cross: 'ms-crossFloat',  circle: 'ms-circleFloat',  tri: 'ms-triFloat'  },
  aiconfirm: { star: 'acd-starFloat', cross: 'acd-crossFloat', circle: 'acd-circleFloat', tri: 'acd-triFloat' },
}

function modalRandItems(count, seed, sizeMin, sizeMax, prefix) {
  const r = seededRand(seed)
  return Array.from({ length: Math.min(count, 3) }, () => ({
    pos:   { top: `${Math.floor(r() * 90)}%`, left: `${Math.floor(r() * 90)}%` },
    color: PALETTE[Math.floor(r() * PALETTE.length)],
    size:  Math.floor(r() * (sizeMax - sizeMin) + sizeMin),
    anim:  `${prefix} ${(r() * 12 + 10).toFixed(1)}s infinite ease-in-out`,
  }))
}

export function genModalShapes(modalKey, config, userSeed) {
  const seeds = MODAL_SEEDS[modalKey]
  const orig  = MODAL_ORIGINAL_SHAPES[modalKey]
  const def   = MODAL_DEFAULT_CONFIGS[modalKey]
  const anims = MODAL_ANIM_PREFIXES[modalKey]

  const resolve = (origKey, countKey, shapeSeed, sizeMin, sizeMax, animName) => {
    const count = config[countKey]
    if (count === 0) return []
    if (!userSeed && count === def[countKey]) return orig[origKey]
    const seed = userSeed ? ((userSeed ^ shapeSeed) >>> 0) : shapeSeed
    return modalRandItems(count, seed, sizeMin, sizeMax, animName)
  }

  return {
    stars:   resolve('stars',   'starCount',   seeds.star,   80, 180, anims.star),
    crosses: resolve('crosses', 'crossCount',  seeds.cross,  30, 80,  anims.cross),
    circles: resolve('circles', 'circleCount', seeds.circle, 40, 100, anims.circle),
    tris:    resolve('tris',    'triCount',    seeds.tri,    50, 120, anims.tri),
  }
}

// ─── sessionStorage ───────────────────────────────────────────────────────────
const SS_KEY = 'brutalist-bg-config'
export const SS_EXP_KEY = 'brutalist-exp-settings'
export const DEFAULT_EXP = { clickEffect: true, customCursor: true }

export function loadSavedExpSettings() { 
  try {
    const raw = sessionStorage.getItem(SS_EXP_KEY)
    if (!raw) return { ...DEFAULT_EXP }
    const p = JSON.parse(raw)
    if (typeof p === 'object' && p !== null) return { ...DEFAULT_EXP, ...p }
  } catch {}
  return { ...DEFAULT_EXP }
}

export function ssLoad(key) {
  try {
    const raw = sessionStorage.getItem(key ?? SS_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (typeof p === 'object' && p !== null) return p
  } catch {}
  return null
}

export function ssSave(cfg, key) { 
  try { 
    sessionStorage.setItem(key ?? SS_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new Event('brutalistBgChanged'));
  } catch {} 
}

export function ssClear(key) { 
  try { 
    sessionStorage.removeItem(key ?? SS_KEY);
    window.dispatchEvent(new Event('brutalistBgChanged'));
  } catch {} 
}

export function loadSavedBgConfig()    { return ssLoad(SS_KEY) ?? { ...DEFAULT_CONFIG } }
export function loadSavedModalConfig(modalKey) {
  return ssLoad(MODAL_SS_KEYS[modalKey]) ?? { ...MODAL_DEFAULT_CONFIGS[modalKey] }
}