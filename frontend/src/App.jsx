import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from './store/appStore'
import Navbar from './components/Navbar'
import UploadZone from './components/UploadZone'
import JobRoleSelector from './components/JobRoleSelector'
import JobList from './components/JobList'
import ResumeTransition from './components/ResumeTransition'
import DownloadBar from './components/DownloadBar'
import JobModal from './components/JobModal'
import LoadingOverlay from './components/LoadingOverlay'

export default function App() {
  const stage = useAppStore((s) => s.stage)
  const hasResume = useAppStore((s) => !!s.resume)

  const showReviewing = hasResume && stage === 'reviewing'
  const showWorkspace = hasResume && (stage === 'ready' || stage === 'tailoring')

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#1a1412]">
      <Navbar />

      {/* Main content */}
      <main className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          {showWorkspace ? (
            <motion.div
              key="workspace"
              className="absolute inset-0 flex flex-col md:flex-row gap-4 p-3 sm:p-4"
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
          ) : showReviewing ? (
            <motion.div
              key="reviewing"
              className="absolute inset-0"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35 }}
            >
              <JobRoleSelector />
            </motion.div>
          ) : (
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
          )}
        </AnimatePresence>
      </main>

      <JobModal />
      <LoadingOverlay />
    </div>
  )
}
