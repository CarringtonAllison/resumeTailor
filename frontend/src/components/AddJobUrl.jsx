import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { addJobByUrl } from '../lib/api'

export default function AddJobUrl() {
  const sessionId = useAppStore((s) => s.sessionId)
  const stage = useAppStore((s) => s.stage)
  const prependJob = useAppStore((s) => s.prependJob)
  const setStage = useAppStore((s) => s.setStage)
  const setModalJob = useAppStore((s) => s.setModalJob)
  const setError = useAppStore((s) => s.setError)

  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setLocalError] = useState('')

  const isValid = url.trim().startsWith('http')

  async function handleSubmit() {
    if (!isValid || loading) return
    setLocalError('')
    setLoading(true)

    try {
      const job = await addJobByUrl(sessionId, url.trim())
      prependJob(job)
      setUrl('')

      if (stage === 'reviewing') {
        setStage('ready')
      } else {
        setModalJob(job)
      }
    } catch (e) {
      setLocalError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setLocalError('') }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Paste a job URL..."
          disabled={loading}
          className="flex-1 rounded-lg border border-slate-600 bg-[#2e2420] px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none transition-colors disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="rounded-lg bg-[#3a2f28] hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-slate-200 transition-colors whitespace-nowrap"
        >
          {loading ? 'Adding...' : 'Add'}
        </button>
      </div>
      {error && (
        <p className="text-red-400 text-xs mt-1.5">{error}</p>
      )}
    </div>
  )
}
