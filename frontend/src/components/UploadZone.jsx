import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { uploadResume } from '../lib/api'
import { useAppStore } from '../store/appStore'

export default function UploadZone() {
  const { sessionId, setResume, setStage, setError } = useAppStore()
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
      setStage('reviewing')
    } catch (e) {
      setError(e.message)
      setStage('idle')
    }
  }, [sessionId, setResume, setStage, setError])

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 sm:gap-8 px-4 sm:px-8">
      <div className="text-center">
        <h1 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent mb-3">
          Resume Tailor
        </h1>
        <p className="text-slate-400 text-lg">
          Upload your resume. We'll find jobs and tailor it for each one.
        </p>
      </div>

      <motion.label
        htmlFor="resume-upload"
        className={`relative w-full max-w-lg cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-colors ${
          dragging
            ? 'border-amber-400 bg-amber-950/40'
            : 'border-slate-600 bg-[#241c17]/50 hover:border-amber-500 hover:bg-[#241c17]'
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
