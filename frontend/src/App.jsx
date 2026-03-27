import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from './store/appStore'
import UploadZone from './components/UploadZone'
import JobList from './components/JobList'
import ResumeTransition from './components/ResumeTransition'
import DownloadBar from './components/DownloadBar'
import LoadingOverlay from './components/LoadingOverlay'

export default function App() {
  const stage = useAppStore((s) => s.stage)
  const error = useAppStore((s) => s.error)
  const hasResume = useAppStore((s) => !!s.resume)

  const showWorkspace = hasResume && (stage === 'ready' || stage === 'tailoring')

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-950">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📄</span>
          <span className="font-bold text-slate-200 tracking-tight">Resume Tailor</span>
        </div>
        <AnimatePresence>
          {error && (
            <motion.p
              className="text-red-400 text-sm bg-red-950/50 border border-red-800 rounded-lg px-3 py-1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </header>

      {/* Main content */}
      <main className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          {!showWorkspace ? (
            <motion.div
              key="upload"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.35 }}
            >
              <UploadZone />
            </motion.div>
          ) : (
            <motion.div
              key="workspace"
              className="absolute inset-0 flex gap-4 p-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <JobList />
              <div className="flex-1 flex flex-col min-h-0 gap-2">
                <ResumeTransition />
                <DownloadBar />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <LoadingOverlay />
    </div>
  )
}
