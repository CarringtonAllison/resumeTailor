import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { uploadResume, searchJobs } from '../lib/api'
import { useAppStore } from '../store/appStore'

export default function UploadZone() {
  const { sessionId, setResume, setJobs, setStage, setError } = useAppStore()
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback(async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf', 'docx'].includes(ext)) {
      setError('Only PDF and DOCX files are supported.')
      return
    }
    setError(null)

    try {
      setStage('uploading')
      const resume = await uploadResume(sessionId, file)
      setResume(resume)

      setStage('searching')
      const jobs = await searchJobs(sessionId)
      setJobs(jobs)

      setStage('ready')
    } catch (e) {
      setError(e.message)
      setStage('idle')
    }
  }, [sessionId, setResume, setJobs, setStage, setError])

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-3">
          Resume Tailor
        </h1>
        <p className="text-slate-400 text-lg">
          Upload your resume. We'll find jobs and tailor it for each one.
        </p>
      </div>

      <motion.label
        htmlFor="resume-upload"
        className={`relative w-full max-w-lg cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
          dragging
            ? 'border-indigo-400 bg-indigo-950/40'
            : 'border-slate-600 bg-slate-900/50 hover:border-indigo-500 hover:bg-slate-900'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="text-5xl mb-4">📄</div>
        <p className="text-slate-300 font-medium text-lg">
          Drag & drop your resume here
        </p>
        <p className="text-slate-500 mt-1 text-sm">or click to browse</p>
        <p className="text-slate-600 mt-3 text-xs">PDF or DOCX</p>
        <input
          id="resume-upload"
          type="file"
          accept=".pdf,.docx"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </motion.label>
    </div>
  )
}
