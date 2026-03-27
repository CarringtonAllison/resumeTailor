import { create } from 'zustand'

const WITTY = [
  'Teaching your resume to speak fluent corporate...',
  'Convincing the algorithm you\'re a rockstar...',
  'Reticulating career splines...',
  'Bribing the job boards (ethically)...',
  'Polishing your professional veneer...',
  'Cross-referencing buzzwords at maximum velocity...',
  'Summoning the ghost of your best performance review...',
  'Aligning your synergies with the opportunity matrix...',
  'Negotiating with the ATS on your behalf...',
  'Making your experience sound 40% more impactful...',
]

function generateSessionId() {
  return crypto.randomUUID()
}

export const useAppStore = create((set, get) => ({
  sessionId: generateSessionId(),

  // 'idle' | 'uploading' | 'searching' | 'tailoring' | 'ready'
  stage: 'idle',

  resume: null,         // original parsed Resume
  jobs: [],             // list of Job objects
  selectedJobId: null,
  tailoredResumes: {},  // { [jobId]: TailoredResume }

  wittyIndex: 0,
  wittyTimer: null,

  error: null,

  // --- Actions ---
  setResume: (resume) => set({ resume }),
  setJobs: (jobs) => set({ jobs }),
  setError: (error) => set({ error }),

  selectJob: (jobId) => set({ selectedJobId: jobId }),

  setTailored: (jobId, tailored) =>
    set((s) => ({ tailoredResumes: { ...s.tailoredResumes, [jobId]: tailored } })),

  setStage: (stage) => {
    const { wittyTimer } = get()
    if (stage === 'idle' || stage === 'ready') {
      if (wittyTimer) clearInterval(wittyTimer)
      set({ stage, wittyTimer: null, wittyIndex: 0 })
    } else {
      if (!wittyTimer) {
        const timer = setInterval(() => {
          set((s) => ({ wittyIndex: (s.wittyIndex + 1) % WITTY.length }))
        }, 3000)
        set({ stage, wittyTimer: timer })
      } else {
        set({ stage })
      }
    }
  },

  getWittyMessage: () => WITTY[get().wittyIndex],

  currentTailored: () => {
    const { selectedJobId, tailoredResumes } = get()
    return selectedJobId ? tailoredResumes[selectedJobId] ?? null : null
  },
}))
