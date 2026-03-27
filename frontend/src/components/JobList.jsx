import { motion } from 'framer-motion'
import { useAppStore } from '../store/appStore'
import { tailorResume } from '../lib/api'

export default function JobList() {
  const { sessionId, jobs, selectedJobId, tailoredResumes, setStage, setError, setTailored, selectJob } = useAppStore()

  const handleJobClick = async (job) => {
    if (selectedJobId === job.id && tailoredResumes[job.id]) return  // already selected + loaded

    selectJob(job.id)

    if (tailoredResumes[job.id]) return  // cached — just switch view

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

  return (
    <aside className="w-72 shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 px-1">
        {jobs.length} Jobs Found
      </h2>
      {jobs.map((job, i) => {
        const isSelected = selectedJobId === job.id
        const isTailored = !!tailoredResumes[job.id]

        return (
          <motion.button
            key={job.id}
            onClick={() => handleJobClick(job)}
            className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
              isSelected
                ? 'border-indigo-500 bg-indigo-950/60 shadow-indigo-900/40 shadow-md'
                : 'border-slate-700 bg-slate-900 hover:border-slate-500 hover:bg-slate-800'
            }`}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-200 text-sm truncate">{job.title}</p>
                <p className="text-indigo-400 text-xs mt-0.5 truncate">{job.company}</p>
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
    </aside>
  )
}
