import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/appStore'
import { suggestRoles, searchJobs } from '../lib/api'
import ResumePanel from './ResumePanel'

export default function JobRoleSelector() {
  const sessionId = useAppStore((s) => s.sessionId)
  const resume = useAppStore((s) => s.resume)
  const setJobs = useAppStore((s) => s.setJobs)
  const setStage = useAppStore((s) => s.setStage)
  const setError = useAppStore((s) => s.setError)
  const resetApp = useAppStore((s) => s.resetApp)
  const location = useAppStore((s) => s.location)
  const locationType = useAppStore((s) => s.locationType)
  const setLocation = useAppStore((s) => s.setLocation)
  const setLocationType = useAppStore((s) => s.setLocationType)

  const [suggestions, setSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)
  const [selectedRoles, setSelectedRoles] = useState([])
  const [customInput, setCustomInput] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    suggestRoles(sessionId)
      .then((data) => setSuggestions(data.roles || []))
      .catch(() => setSuggestions([]))
      .finally(() => setLoadingSuggestions(false))
  }, [sessionId])

  function toggleRole(role) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  function addCustomRole() {
    const trimmed = customInput.trim()
    if (!trimmed || selectedRoles.includes(trimmed)) {
      setCustomInput('')
      return
    }
    setSelectedRoles((prev) => [...prev, trimmed])
    setCustomInput('')
    inputRef.current?.focus()
  }

  function removeRole(role) {
    setSelectedRoles((prev) => prev.filter((r) => r !== role))
  }

  async function handleSearch() {
    if (selectedRoles.length === 0) return
    setError(null)

    const query = selectedRoles.map((r) => `"${r}"`).join(' OR ')

    try {
      setStage('searching')
      const jobs = await searchJobs(sessionId, {
        query,
        maxJobs: 20,
        location: location || null,
        locationType: locationType || null,
      })
      setJobs(jobs)
      setStage('ready')
    } catch (e) {
      setError(e.message)
      setStage('reviewing')
    }
  }

  function searchButtonLabel() {
    if (selectedRoles.length === 0) return 'Select at least one role to search'
    const count = `${selectedRoles.length} Role${selectedRoles.length > 1 ? 's' : ''}`
    if (locationType === 'remote') return `Search Jobs for ${count} (Remote)`
    if (location && locationType === 'local') return `Search Jobs for ${count} in ${location}`
    if (location && locationType === 'both') return `Search Jobs for ${count} in ${location} + Remote`
    return `Search Jobs for ${count}`
  }

  return (
    <div className="absolute inset-0 flex flex-col md:flex-row gap-4 p-4">
      {/* Left — Resume preview (hidden on mobile, shown on md+) */}
      <div className="hidden md:flex md:w-[45%] shrink-0 flex-col min-h-0">
        <div className="flex items-center justify-between h-8 px-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Your Resume
          </span>
          <button
            onClick={resetApp}
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            Upload Different Resume
          </button>
        </div>
        <div className="flex-1 min-h-0 mt-2">
          <ResumePanel resume={resume} />
        </div>
      </div>

      {/* Right — Role selection */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header row — matches left panel height */}
        <div className="flex items-center justify-between h-8 px-1 md:px-0">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Job Preferences
          </span>
          {/* Mobile-only: show upload different link */}
          <button
            onClick={resetApp}
            className="md:hidden text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            Change Resume
          </button>
        </div>
        <motion.div
          className="flex-1 flex flex-col rounded-xl border border-slate-700 bg-[#241c17] p-4 sm:p-6 overflow-y-auto mt-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-slate-100 mb-1">What roles are you targeting?</h2>
            <p className="text-slate-400 text-sm">
              Select from the suggestions below or type in your own. You can pick multiple.
            </p>
          </div>

          {/* Suggested roles */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Suggested for you
            </p>
            {loadingSuggestions ? (
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 w-32 rounded-full bg-[#2e2420] animate-pulse"
                    style={{ animationDelay: `${i * 0.08}s` }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((role) => {
                  const selected = selectedRoles.includes(role)
                  return (
                    <motion.button
                      key={role}
                      onClick={() => toggleRole(role)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                        selected
                          ? 'bg-amber-600 border-amber-500 text-white'
                          : 'bg-[#2e2420] border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-300'
                      }`}
                      whileTap={{ scale: 0.96 }}
                    >
                      {selected && <span className="mr-1.5">✓</span>}
                      {role}
                    </motion.button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Custom role input */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Or enter a role
            </p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomRole()}
                placeholder="e.g. Senior Product Manager"
                className="flex-1 rounded-lg border border-slate-600 bg-[#2e2420] px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none transition-colors"
              />
              <button
                onClick={addCustomRole}
                disabled={!customInput.trim()}
                className="rounded-lg bg-[#3a2f28] hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-slate-200 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Selected roles */}
          <AnimatePresence>
            {selectedRoles.length > 0 && (
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Searching for ({selectedRoles.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedRoles.map((role) => (
                    <motion.span
                      key={role}
                      className="flex items-center gap-1.5 rounded-full bg-amber-950 border border-amber-700 pl-3 pr-2 py-1 text-sm text-amber-300"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      layout
                    >
                      {role}
                      <button
                        onClick={() => removeRole(role)}
                        className="text-amber-500 hover:text-amber-200 transition-colors leading-none"
                        aria-label={`Remove ${role}`}
                      >
                        ×
                      </button>
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Location filter */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Location
            </p>

            {/* Three-way toggle */}
            <div className="flex rounded-lg border border-slate-600 overflow-hidden mb-3">
              {[
                { value: 'local', label: 'Local' },
                { value: 'remote', label: 'Remote' },
                { value: 'both', label: 'Both' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setLocationType(value)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    locationType === value
                      ? 'bg-amber-600 text-white'
                      : 'bg-[#2e2420] text-slate-400 hover:text-slate-200 hover:bg-[#3a2f28]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Location text input — hidden when Remote only */}
            {locationType !== 'remote' && (
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. San Francisco, CA"
                className="w-full rounded-lg border border-slate-600 bg-[#2e2420] px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none transition-colors"
              />
            )}
          </div>

          {/* Search button */}
          <div className="pt-4 border-t border-slate-800">
            <motion.button
              onClick={handleSearch}
              disabled={selectedRoles.length === 0}
              className="w-full rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed py-3 text-sm font-semibold text-white transition-colors"
              whileTap={{ scale: 0.98 }}
            >
              {searchButtonLabel()}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
