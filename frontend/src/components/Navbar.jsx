import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../store/appStore'
import { downloadUrl } from '../lib/api'
import { slugify } from '../lib/utils'

function QuillIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h2l13.5-13.5a1.5 1.5 0 0 0-2.12-2.12L3 19v2z" />
      <path d="M14.5 5.5l2.12 2.12" />
      <path d="M12 8L19.5 2 22 4.5 15 12" />
    </svg>
  )
}

export default function Navbar() {
  const error = useAppStore((s) => s.error)
  const sessionId = useAppStore((s) => s.sessionId)
  const tailoredResumes = useAppStore((s) => s.tailoredResumes)
  const selectJob = useAppStore((s) => s.selectJob)
  const stage = useAppStore((s) => s.stage)
  const hasResume = useAppStore((s) => !!s.resume)
  const resetApp = useAppStore((s) => s.resetApp)
  const newSearch = useAppStore((s) => s.newSearch)

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const tailoredList = Object.values(tailoredResumes)
  const tailoredCount = tailoredList.length

  useEffect(() => {
    function handleMouseDown(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  function getDownloadUrl(tailored, ext) {
    const company = slugify(tailored.company)
    const title = slugify(tailored.job_title)
    return downloadUrl(sessionId, `${company}_${title}_resume.${ext}`)
  }

  const stageLabel = {
    idle: null,
    uploading: 'Parsing resume...',
    reviewing: 'Select your roles',
    searching: 'Finding jobs...',
    tailoring: 'Tailoring resume...',
    ready: null,
  }[stage]

  return (
    <header className="relative z-50 shrink-0 grid grid-cols-3 items-center px-3 sm:px-6 py-3 sm:py-3.5 border-b border-slate-800/80 bg-[#1a1412]/50 backdrop-blur-sm">
      {/* Logo — clickable, resets to home */}
      <button
        onClick={resetApp}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        title="Start over"
      >
        <QuillIcon className="w-6 h-6 text-amber-500" />
        <span
          className="hidden sm:inline text-xl font-extrabold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent tracking-tight"
          style={{ fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif' }}
        >
          Resume Tailor
        </span>
      </button>

      {/* Center — tagline or error or stage label */}
      <div className="hidden sm:flex justify-center">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.p
              key="error"
              className="text-red-400 text-sm bg-red-950/50 border border-red-800 rounded-lg px-3 py-1 flex items-center gap-1.5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <span className="text-red-500">⚠</span>
              {error}
            </motion.p>
          ) : stageLabel ? (
            <motion.p
              key="stage"
              className="text-sm text-amber-400/70 font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {stageLabel}
            </motion.p>
          ) : (
            <motion.p
              key="tagline"
              className="text-sm text-slate-500 tracking-wide"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif' }}
            >
              Upload. Discover. Tailor.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Right — actions */}
      <div className="flex items-center justify-end gap-2">
        {/* New Search — visible when in workspace */}
        <AnimatePresence>
          {hasResume && (stage === 'ready' || stage === 'tailoring') && (
            <motion.button
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
              onClick={newSearch}
              className="rounded-lg border border-slate-700 bg-[#2e2420]/60 px-3 py-1.5 text-sm text-slate-300 hover:bg-[#3a2f28]/60 hover:text-slate-100 transition-colors"
            >
              New Search
            </motion.button>
          )}
        </AnimatePresence>

      <div className="relative" ref={dropdownRef}>
        <AnimatePresence>
          {tailoredCount > 0 && (
            <motion.button
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-[#2e2420]/60 px-3 py-1.5 text-sm text-slate-300 hover:bg-[#3a2f28]/60 hover:text-slate-100 transition-colors"
            >
              My Resumes
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-600 text-xs font-bold text-white">
                {tailoredCount}
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] sm:w-80 max-w-80 rounded-xl border border-slate-700 bg-[#241c17] shadow-xl shadow-slate-950/60 z-50 overflow-hidden"
            >
              <div className="px-4 py-2.5 border-b border-slate-800">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tailored Resumes</p>
              </div>
              <ul>
                {tailoredList.map((tailored) => (
                  <li
                    key={tailored.job_id}
                    className="border-b border-slate-800 last:border-0"
                  >
                    <div className="flex items-start justify-between gap-2 px-4 py-3">
                      <button
                        onClick={() => {
                          selectJob(tailored.job_id)
                          setDropdownOpen(false)
                        }}
                        className="text-left flex-1 min-w-0"
                      >
                        <p className="text-sm font-medium text-slate-200 truncate">{tailored.job_title}</p>
                        <p className="text-xs text-amber-400 truncate">{tailored.company}</p>
                      </button>
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        <a
                          href={getDownloadUrl(tailored, 'docx')}
                          download
                          onClick={() => setDropdownOpen(false)}
                          className="rounded px-1.5 py-0.5 text-xs font-medium bg-amber-950 border border-amber-800 text-amber-300 hover:bg-amber-900 transition-colors"
                        >
                          DOCX
                        </a>
                        <a
                          href={getDownloadUrl(tailored, 'pdf')}
                          download
                          onClick={() => setDropdownOpen(false)}
                          className="rounded px-1.5 py-0.5 text-xs font-medium bg-[#2e2420] border border-slate-700 text-slate-300 hover:bg-[#3a2f28] transition-colors"
                        >
                          PDF
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </header>
  )
}
