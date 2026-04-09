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

  // 'idle' | 'uploading' | 'reviewing' | 'searching' | 'tailoring' | 'ready'
  stage: 'idle',

  resume: null,         // original parsed Resume
  jobs: [],             // list of Job objects
  selectedJobId: null,
  tailoredResumes: {},  // { [jobId]: TailoredResume }

  wittyIndex: 0,
  wittyTimer: null,

  error: null,
  modalJob: null,        // Job object being previewed in modal, or null

  // Location filter
  location: '',
  locationType: 'both',  // 'local' | 'remote' | 'both'

  // --- Actions ---
  setResume: (resume) => set({ resume }),
  setJobs: (jobs) => set({ jobs }),
  prependJob: (job) => set((s) => ({ jobs: [job, ...s.jobs] })),
  setError: (error) => set({ error }),
  setModalJob: (job) => set({ modalJob: job }),
  setLocation: (location) => set({ location }),
  setLocationType: (locationType) => set({ locationType }),

  updateJob: (jobId, updatedJob) =>
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === jobId ? updatedJob : j)),
      modalJob: s.modalJob?.id === jobId ? updatedJob : s.modalJob,
    })),

  selectJob: (jobId) => set({ selectedJobId: jobId }),

  setTailored: (jobId, tailored) =>
    set((s) => ({ tailoredResumes: { ...s.tailoredResumes, [jobId]: tailored } })),

  setStage: (stage) => {
    const { wittyTimer } = get()
    if (stage === 'idle' || stage === 'reviewing' || stage === 'ready') {
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

  // Reset to home — start completely over
  resetApp: () => {
    const { wittyTimer } = get()
    if (wittyTimer) clearInterval(wittyTimer)
    set({
      sessionId: generateSessionId(),
      stage: 'idle',
      resume: null,
      jobs: [],
      selectedJobId: null,
      tailoredResumes: {},
      error: null,
      modalJob: null,
      location: '',
      locationType: 'both',
      wittyTimer: null,
      wittyIndex: 0,
    })
  },

  // Keep resume, go back to role selection for a new search
  newSearch: () => {
    const { wittyTimer } = get()
    if (wittyTimer) clearInterval(wittyTimer)
    set({
      stage: 'reviewing',
      jobs: [],
      selectedJobId: null,
      error: null,
      modalJob: null,
      wittyTimer: null,
      wittyIndex: 0,
    })
  },
}))
