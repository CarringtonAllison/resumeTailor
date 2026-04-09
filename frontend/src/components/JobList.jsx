import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/appStore'
import AddJobUrl from './AddJobUrl'

const PAGE_SIZE = 15

export default function JobList() {
  const jobs = useAppStore((s) => s.jobs)
  const selectedJobId = useAppStore((s) => s.selectedJobId)
  const tailoredResumes = useAppStore((s) => s.tailoredResumes)
  const setModalJob = useAppStore((s) => s.setModalJob)

  const [page, setPage] = useState(0)

  // Reset to first page when jobs list changes (e.g. new job added by URL)
  useEffect(() => { setPage(0) }, [jobs.length])

  const totalPages = Math.ceil(jobs.length / PAGE_SIZE)
  const visibleJobs = jobs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleJobClick = (job) => setModalJob(job)

  return (
    <aside className="w-full md:w-72 shrink-0 flex flex-col gap-2 overflow-y-auto max-h-[40vh] md:max-h-none">
      <div className="flex items-center justify-between mb-1 px-1 shrink-0">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {jobs.length} Jobs Found
        </h2>
        {totalPages > 1 && (
          <span className="text-xs text-slate-500">
            Page {page + 1} of {totalPages}
          </span>
        )}
      </div>

      {/* Add job by URL */}
      <div className="shrink-0 mb-1">
        <AddJobUrl />
      </div>

      {/* Job cards */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
        <AnimatePresence mode="popLayout">
          {visibleJobs.map((job, i) => {
            const isSelected = selectedJobId === job.id
            const isTailored = !!tailoredResumes[job.id]

            return (
              <motion.button
                key={job.id}
                onClick={() => handleJobClick(job)}
                className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
                  isSelected
                    ? 'border-amber-500 bg-amber-950/60 shadow-amber-900/40 shadow-md'
                    : 'border-slate-700 bg-[#241c17] hover:border-slate-500 hover:bg-[#2e2420]'
                }`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 text-sm truncate">{job.title}</p>
                    <p className="text-amber-400 text-xs mt-0.5 truncate">{job.company}</p>
                    {job.location && (
                      <p className="text-slate-500 text-xs mt-0.5 truncate">{job.location}</p>
                    )}
                  </div>
                  {isTailored && (
                    <span className="shrink-0 text-emerald-400 text-base" title="Tailored">✓</span>
                  )}
                </div>
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-between gap-1 pt-2 border-t border-slate-800">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex-1 rounded-lg py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#2e2420] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>

          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-6 h-6 rounded text-xs font-medium transition-colors ${
                  i === page
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-[#2e2420]'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="flex-1 rounded-lg py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-[#2e2420] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-right"
          >
            Next →
          </button>
        </div>
      )}
    </aside>
  )
}
