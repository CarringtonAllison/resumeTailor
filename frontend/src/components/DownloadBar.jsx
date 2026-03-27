import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/appStore'
import { downloadUrl } from '../lib/api'
import { slugify } from '../lib/utils'

export default function DownloadBar() {
  const sessionId = useAppStore((s) => s.sessionId)
  const selectedJobId = useAppStore((s) => s.selectedJobId)
  const tailoredResumes = useAppStore((s) => s.tailoredResumes)

  const tailored = selectedJobId ? tailoredResumes[selectedJobId] ?? null : null

  const getUrl = (ext) => {
    if (!tailored) return '#'
    const company = slugify(tailored.company)
    const title = slugify(tailored.job_title)
    return downloadUrl(sessionId, `${company}_${title}_resume.${ext}`)
  }

  return (
    <AnimatePresence>
      {tailored && (
        <motion.div
          className="flex items-center justify-center gap-3 py-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.35 }}
        >
          <a
            href={getUrl('docx')}
            download
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-sm font-semibold text-white transition-colors"
          >
            ⬇ Download DOCX
          </a>
          <a
            href={getUrl('pdf')}
            download
            className="inline-flex items-center gap-2 rounded-lg bg-slate-700 hover:bg-slate-600 px-5 py-2 text-sm font-semibold text-white transition-colors"
          >
            ⬇ Download PDF
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
