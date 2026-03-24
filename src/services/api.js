const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // OGSM CRUD
  getAll:   ()         => request('/ogsm'),
  getById:  (id)       => request(`/ogsm/${id}`),
  create:   (body)     => request('/ogsm',      { method: 'POST', body: JSON.stringify(body) }),
  update:   (id, body) => request(`/ogsm/${id}`, { method: 'PUT',  body: JSON.stringify(body) }),
  delete:   (id)       => request(`/ogsm/${id}`, { method: 'DELETE' }),

  // AI 生成整份 OGSM
  generate: (body) => request('/ai/generate', { method: 'POST', body: JSON.stringify(body) }),

  // AI 局部生成（不儲存，直接回傳結果供前端合併）
  generateForGoal:     (body) => request('/ai/generate-for-goal',     { method: 'POST', body: JSON.stringify(body) }),
  generateForStrategy: (body) => request('/ai/generate-for-strategy', { method: 'POST', body: JSON.stringify(body) }),
  generateForMeasure:  (body) => request('/ai/generate-for-measure',  { method: 'POST', body: JSON.stringify(body) }),
}