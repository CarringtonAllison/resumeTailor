import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../store/appStore'
import { tailorResume, enrichJob } from '../lib/api'

export default function JobModal() {
  const modalJob = useAppStore((s) => s.modalJob)
  const setModalJob = useAppStore((s) => s.setModalJob)
  const tailoredResumes = useAppStore((s) => s.tailoredResumes)
  const sessionId = useAppStore((s) => s.sessionId)
  const selectJob = useAppStore((s) => s.selectJob)
  const setTailored = useAppStore((s) => s.setTailored)
  const setStage = useAppStore((s) => s.setStage)
  const setError = useAppStore((s) => s.setError)
  const updateJob = useAppStore((s) => s.updateJob)

  const [enriching, setEnriching] = useState(false)

  const isAlreadyTailored = modalJob ? !!tailoredResumes[modalJob.id] : false

  // Escape key closes modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setModalJob(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [setModalJob])

  // Auto-enrich when modal opens for an un-enriched job
  useEffect(() => {
    if (!modalJob || modalJob.enriched) {
      setEnriching(false)
      return
    }

    let cancelled = false
    setEnriching(true)

    enrichJob(sessionId, modalJob.id)
      .then((enrichedJob) => {
        if (!cancelled) {
          updateJob(modalJob.id, enrichedJob)
          setEnriching(false)
        }
      })
      .catch((err) => {
        console.error('Job enrichment failed:', err.message)
        if (!cancelled) setEnriching(false)
      })

    return () => { cancelled = true }
  }, [modalJob?.id])

  async function handleTailor() {
    const job = modalJob
    setModalJob(null)
    selectJob(job.id)

    if (tailoredResumes[job.id]) return

    try {
      setStage('tailoring')
      setError(null)
      const result = await tailorResume(sessionId, job.id)
      setTailored(job.id, result)
      setStage('ready')
    } catch (e) {
      setError(e.message)
      setStage('ready')
    }
  }

  function handleViewResume() {
    selectJob(modalJob.id)
    setModalJob(null)
  }

  return (
    <AnimatePresence>
      {modalJob && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#1a1412]/75 backdrop-blur-sm"
            onClick={() => setModalJob(null)}
          />

          {/* Card */}
          <motion.div
            className="relative z-10 w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-[#241c17] flex flex-col overflow-hidden shadow-2xl shadow-slate-950/80"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="shrink-0 flex items-start justify-between gap-3 sm:gap-4 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-slate-800">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-slate-100 leading-snug">{modalJob.title}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-amber-400 font-medium">{modalJob.company}</span>
                  {modalJob.location && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-500 text-sm">{modalJob.location}</span>
                    </>
                  )}
                  {modalJob.url && (
                    <>
                      <span className="text-slate-600">·</span>
                      <a
                        href={modalJob.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                      >
                        View Posting ↗
                      </a>
                    </>
                  )}
                </div>
                {modalJob.salary && (
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950 border border-emerald-700 px-3 py-1 text-sm font-medium text-emerald-300">
                      💰 {modalJob.salary}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setModalJob(null)}
                className="shrink-0 text-slate-500 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-[#2e2420]"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
              {/* Loading skeleton while enriching */}
              {enriching && !modalJob.enriched && (
                <div className="space-y-5 animate-pulse">
                  <div>
                    <div className="h-3 w-20 bg-[#3a2f28] rounded mb-3" />
                    <div className="h-12 bg-[#2e2420] rounded" />
                  </div>
                  <div>
                    <div className="h-3 w-24 bg-[#3a2f28] rounded mb-3" />
                    <div className="flex flex-wrap gap-1.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-6 rounded-full bg-[#2e2420]" style={{ width: `${60 + i * 12}px` }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="h-3 w-28 bg-[#3a2f28] rounded mb-3" />
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-4 bg-[#2e2420] rounded mb-2" style={{ width: `${85 - i * 10}%` }} />
                    ))}
                  </div>
                  <div>
                    <div className="h-3 w-24 bg-[#3a2f28] rounded mb-3" />
                    {[1, 2].map((i) => (
                      <div key={i} className="h-4 bg-[#2e2420] rounded mb-2" style={{ width: `${80 - i * 15}%` }} />
                    ))}
                  </div>
                  <p className="text-slate-500 text-xs">Loading full job details...</p>
                </div>
              )}

              {/* Structured enriched sections */}
              {modalJob.enriched && (
                <>
                  {modalJob.about && (
                    <section>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">About</h3>
                      <p className="text-slate-300 text-sm leading-relaxed">{modalJob.about}</p>
                    </section>
                  )}

                  {modalJob.required_skills?.length > 0 && (
                    <section>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Required Skills</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {modalJob.required_skills.map((skill, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-amber-950 border border-amber-800 px-2.5 py-0.5 text-xs text-amber-300"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  {modalJob.responsibilities?.length > 0 && (
                    <section>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Responsibilities</h3>
                      <ul className="space-y-1.5">
                        {modalJob.responsibilities.map((item, i) => (
                          <li key={i} className="flex gap-2 text-sm text-slate-300">
                            <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {modalJob.qualifications?.length > 0 && (
                    <section>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Qualifications</h3>
                      <ul className="space-y-1.5">
                        {modalJob.qualifications.map((item, i) => (
                          <li key={i} className="flex gap-2 text-sm text-slate-300">
                            <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {modalJob.benefits?.length > 0 && (
                    <section>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Benefits</h3>
                      <ul className="space-y-1.5">
                        {modalJob.benefits.map((item, i) => (
                          <li key={i} className="flex gap-2 text-sm text-slate-300">
                            <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Fallback: if no structured sections populated, show raw description */}
                  {!modalJob.about && !modalJob.required_skills?.length && !modalJob.responsibilities?.length && !modalJob.qualifications?.length && modalJob.description && (
                    <section>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</h3>
                      <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{modalJob.description}</p>
                    </section>
                  )}
                </>
              )}

              {/* Pre-enrichment: show Tavily snippet */}
              {!modalJob.enriched && !enriching && modalJob.description && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</h3>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{modalJob.description}</p>
                </section>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 flex items-center justify-end gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-800 bg-[#241c17]/80">
              <button
                onClick={() => setModalJob(null)}
                className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-[#2e2420] transition-colors"
              >
                Close
              </button>
              {isAlreadyTailored ? (
                <button
                  onClick={handleViewResume}
                  className="flex items-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-colors"
                >
                  <span>✓</span>
                  View Resume
                </button>
              ) : (
                <button
                  onClick={handleTailor}
                  disabled={enriching || !modalJob.enriched}
                  className="rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 text-sm font-semibold text-white transition-colors"
                >
                  {enriching ? 'Loading Details...' : 'Tailor My Resume'}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
