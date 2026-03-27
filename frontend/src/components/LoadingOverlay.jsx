import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/appStore'

const STAGE_LABELS = {
  uploading: 'Reading your resume...',
  searching: 'Hunting for the right jobs...',
  tailoring: 'Tailoring your resume...',
}

export default function LoadingOverlay() {
  const stage = useAppStore((s) => s.stage)
  const wittyMessage = useAppStore((s) => s.getWittyMessage())
  const isActive = ['uploading', 'searching', 'tailoring'].includes(stage)

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Blurred gradient background */}
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

          {/* Animated gradient orb */}
          <motion.div
            className="absolute w-96 h-96 rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, #6366f1 0%, #8b5cf6 50%, transparent 70%)',
            }}
            animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center gap-6 text-center px-8">
            {/* Spinner */}
            <motion.div
              className="w-14 h-14 rounded-full border-4 border-slate-700 border-t-indigo-500"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />

            <div>
              <p className="text-slate-300 text-lg font-medium">
                {STAGE_LABELS[stage]}
              </p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={wittyMessage}
                  className="text-slate-500 text-sm mt-2 italic"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.4 }}
                >
                  {wittyMessage}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
