import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { addJobByUrl, addJobByText } from '../lib/api'

export default function AddJobUrl() {
  const sessionId = useAppStore((s) => s.sessionId)
  const stage = useAppStore((s) => s.stage)
  const prependJob = useAppStore((s) => s.prependJob)
  const setStage = useAppStore((s) => s.setStage)
  const setModalJob = useAppStore((s) => s.setModalJob)

  const [mode, setMode] = useState('url') // 'url' | 'paste'
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setLocalError] = useState('')

  const isUrlValid = url.trim().startsWith('http')
  const isTextValid = text.trim().length >= 50
  const canSubmit = mode === 'url' ? isUrlValid : isTextValid

  function onSuccess(job) {
    prependJob(job)
    setUrl('')
    setText('')
    setLocalError('')
    if (stage === 'reviewing') {
      setStage('ready')
    } else {
      setModalJob(job)
    }
  }

  async function handleUrlSubmit() {
    if (!isUrlValid || loading) return
    setLocalError('')
    setLoading(true)

    try {
      const job = await addJobByUrl(sessionId, url.trim())
      onSuccess(job)
    } catch (e) {
      setLocalError(e.message)
      // Auto-switch to paste mode on scrape failure so user can paste description
      if (e.message?.includes('blocks automated access') || e.message?.includes('search results page')) {
        setMode('paste')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleTextSubmit() {
    if (!isTextValid || loading) return
    setLocalError('')
    setLoading(true)

    try {
      const job = await addJobByText(sessionId, text.trim(), url.trim() || '')
      onSuccess(job)
    } catch (e) {
      setLocalError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = mode === 'url' ? handleUrlSubmit : handleTextSubmit

  return (
    <div>
      {mode === 'url' ? (
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setLocalError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Paste a job posting URL..."
            disabled={loading}
            className="flex-1 rounded-lg border border-slate-600 bg-[#2e2420] px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="rounded-lg bg-[#3a2f28] hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-slate-200 transition-colors whitespace-nowrap"
          >
            {loading ? 'Adding...' : 'Add'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setLocalError('') }}
            placeholder="Paste the full job description here..."
            disabled={loading}
            rows={4}
            className="w-full rounded-lg border border-slate-600 bg-[#2e2420] px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none transition-colors disabled:opacity-50 resize-y"
          />
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="w-full rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed py-2 text-sm font-medium text-white transition-colors"
          >
            {loading ? 'Parsing...' : 'Add Job'}
          </button>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-xs mt-1.5">{error}</p>
      )}

      <button
        onClick={() => { setMode(mode === 'url' ? 'paste' : 'url'); setLocalError('') }}
        className="text-xs text-slate-500 hover:text-amber-400 transition-colors mt-1.5"
      >
        {mode === 'url' ? 'Paste job description instead' : 'Add by URL instead'}
      </button>
    </div>
  )
}
