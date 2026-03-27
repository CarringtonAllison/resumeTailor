import { AnimatePresence, motion } from 'framer-motion'
import ResumePanel from './ResumePanel'
import { useAppStore } from '../store/appStore'

export default function ResumeTransition() {
  const resume = useAppStore((s) => s.resume)
  const selectedJobId = useAppStore((s) => s.selectedJobId)
  const tailoredResumes = useAppStore((s) => s.tailoredResumes)

  const tailored = selectedJobId ? tailoredResumes[selectedJobId] ?? null : null
  const displayResume = tailored ? tailored.resume : resume

  // Key changes when the displayed resume changes, triggering animation
  const panelKey = tailored ? `tailored-${selectedJobId}` : 'original'

  return (
    <div className="flex-1 min-h-0 relative">
      {/* Label */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tailored ? 'tailored-label' : 'original-label'}
          className="absolute top-0 left-0 right-0 z-10 flex justify-center"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {tailored ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950 border border-emerald-700 px-3 py-0.5 text-xs text-emerald-400 font-medium mb-2">
              ✦ Tailored for {tailored.company} — {tailored.job_title}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 border border-slate-700 px-3 py-0.5 text-xs text-slate-400 font-medium mb-2">
              Original Resume
            </span>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Resume panel with slide transition */}
      <div className="h-full pt-8 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={panelKey}
            className="h-full"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            <ResumePanel
              resume={displayResume}
              highlighted={!!tailored}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
