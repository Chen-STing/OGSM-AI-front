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

async function requestWith404Fallback(primaryPath, fallbackPath, options = {}) {
  const doFetch = async (path) => {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    })
    return res
  }

  let res = await doFetch(primaryPath)
  if (res.status === 404 && fallbackPath) {
    res = await doFetch(fallbackPath)
  }

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

  // AI 生成（含文件 / 圖片）— multipart/form-data
  generateWithDocs: async ({ objective, deadline, additionalContext, assignees, files }) => {
    const form = new FormData()
    form.append('objective', objective)
    if (deadline)           form.append('deadline', deadline)
    if (additionalContext)  form.append('additionalContext', additionalContext)
    if (assignees?.length)  form.append('assignees', assignees.join(','))
    files.forEach(f => form.append('files', f))
    // ⚠️ 不手動設定 Content-Type，讓瀏覽器自動帶 boundary
    const res = await fetch('/api/ai/generate-with-docs', { method: 'POST', body: form })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(err.message || `HTTP ${res.status}`)
    }
    return res.json()
  },

  // AI 批次匯入 OGSM — multipart/form-data
  importOgsm: async ({ files, additionalContext }) => {
    const form = new FormData()
    files.forEach(f => form.append('files', f))
    if (additionalContext) form.append('additionalContext', additionalContext)
    const res = await fetch('/api/ai/import', { method: 'POST', body: form })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      console.error('[importOgsm] 400 response body:', err)
      throw new Error(err.message || err.error || err.detail || JSON.stringify(err) || `HTTP ${res.status}`)
    }
    return res.json()
  },

  // AI 局部生成（不儲存，直接回傳結果供前端合併）
  generateForGoal:     (body) => request('/ai/generate-for-goal',     { method: 'POST', body: JSON.stringify(body) }),
  generateForStrategy: (body) => request('/ai/generate-for-strategy', { method: 'POST', body: JSON.stringify(body) }),
  generateForMeasure:  (body) => request('/ai/generate-for-measure',  { method: 'POST', body: JSON.stringify(body) }),

  // 負責人成員
  getMembers:    ()      => request('/members'),
  saveMembers:   (names) => request('/members', { method: 'PUT', body: JSON.stringify(names) }),

  // 專案密碼保護
  lockProject:    (id, password) => request(`/ogsm/${id}/lock`,        { method: 'POST', body: JSON.stringify({ password }) }),
  verifyPassword: (id, password) => request(`/ogsm/${id}/unlock`,      { method: 'POST', body: JSON.stringify({ password }) }),
  removeLock:     (id)           => request(`/ogsm/${id}/remove-lock`, { method: 'POST' }),

  // 版本歷史
  getVersionHistory: (projectId) =>
    requestWith404Fallback(
      `/ogsm/${encodeURIComponent(projectId)}/versions`,
      `/projects/${encodeURIComponent(projectId)}/versions`
    ),
  saveVersion: (projectId, snapshot, message) =>
    requestWith404Fallback(
      `/ogsm/${encodeURIComponent(projectId)}/versions`,
      `/projects/${encodeURIComponent(projectId)}/versions`,
      {
        method: 'POST',
        body: JSON.stringify({ snapshot, message }),
      }
    ),
  restoreVersion: (projectId, versionId) =>
    requestWith404Fallback(
      `/ogsm/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(versionId)}/restore`,
      `/projects/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(versionId)}/restore`,
      {
        method: 'POST',
      }
    ),
  // 更新版本備註
  updateVersion: (projectId, versionId, message) =>
    requestWith404Fallback(
      `/ogsm/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(versionId)}`,
      `/projects/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(versionId)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ message }),
      }
    ),

  // 刪除版本
  deleteVersion: (projectId, versionId) =>
    requestWith404Fallback(
      `/ogsm/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(versionId)}`,
      `/projects/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(versionId)}`,
      {
        method: 'DELETE',
      }
    ),
}