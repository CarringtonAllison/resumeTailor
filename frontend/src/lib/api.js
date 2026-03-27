const BASE = '/api'

async function handleResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(body.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function uploadResume(sessionId, file) {
  const form = new FormData()
  form.append('session_id', sessionId)
  form.append('file', file)
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form })
  return handleResponse(res)
}

export async function searchJobs(sessionId, { query, maxJobs } = {}) {
  const res = await fetch(`${BASE}/jobs/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: query || null, max_jobs: maxJobs || null }),
  })
  return handleResponse(res)
}

export async function tailorResume(sessionId, jobId) {
  const res = await fetch(`${BASE}/tailor/${sessionId}/${jobId}`, { method: 'POST' })
  return handleResponse(res)
}

export function downloadUrl(sessionId, filename) {
  return `${BASE}/download/${sessionId}/${filename}`
}
