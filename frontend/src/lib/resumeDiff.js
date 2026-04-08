/**
 * Computes a structural diff between an original and tailored resume.
 * Both arguments should be plain Resume objects (unwrap TailoredResume.resume before calling).
 *
 * Returns:
 *   summaryChanged   — boolean, true if summary text differs
 *   newSkills        — Set<string> of skills present in tailored but not in original
 *   changedBullets   — Map<"company|title", Set<bulletIndex>> of changed bullet positions
 */
export function computeDiff(originalResume, tailoredResume) {
  if (!originalResume || !tailoredResume) {
    return { summaryChanged: false, newSkills: new Set(), changedBullets: new Map() }
  }

  // Summary
  const summaryChanged = (originalResume.summary ?? '') !== (tailoredResume.summary ?? '')

  // Skills — mark skills in tailored that don't appear in original
  const origSkillSet = new Set(originalResume.skills ?? [])
  const newSkills = new Set(
    (tailoredResume.skills ?? []).filter((s) => !origSkillSet.has(s))
  )

  // Experience bullets — per role matched by company + title
  const changedBullets = new Map()
  for (const role of (tailoredResume.experience ?? [])) {
    const key = `${role.company}|${role.title}`
    const origRole = (originalResume.experience ?? []).find(
      (r) => r.company === role.company && r.title === role.title
    )

    if (!origRole) {
      // Entire role is new — mark all bullets changed
      const indices = new Set((role.bullets ?? []).map((_, i) => i))
      if (indices.size > 0) changedBullets.set(key, indices)
      continue
    }

    const origBulletSet = new Set(origRole.bullets ?? [])
    const changedIndices = new Set()
    for (let i = 0; i < (role.bullets ?? []).length; i++) {
      if (!origBulletSet.has(role.bullets[i])) changedIndices.add(i)
    }
    if (changedIndices.size > 0) changedBullets.set(key, changedIndices)
  }

  return { summaryChanged, newSkills, changedBullets }
}
