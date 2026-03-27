export default function ResumePanel({ resume, highlighted = false }) {
  if (!resume) return null
  const { contact, summary, skills, experience, education, extras } = resume

  return (
    <div
      className={`h-full overflow-y-auto rounded-xl border p-6 text-sm leading-relaxed transition-all duration-500 ${
        highlighted
          ? 'border-amber-400/60 bg-slate-900 shadow-amber-400/10 shadow-lg'
          : 'border-slate-700 bg-slate-900'
      }`}
    >
      {/* Contact */}
      <div className="mb-5 text-center">
        <h2 className="text-2xl font-bold text-slate-100">{contact.name}</h2>
        <p className="mt-1 text-slate-400 text-xs">
          {[contact.email, contact.phone, contact.location, contact.linkedin, contact.website]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      <hr className="border-slate-700 mb-4" />

      {/* Summary */}
      {summary && (
        <Section title="Summary">
          <p className="text-slate-300">{summary}</p>
        </Section>
      )}

      {/* Skills */}
      {skills?.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s, i) => (
              <span
                key={i}
                className="rounded-full bg-indigo-950 border border-indigo-800 px-2.5 py-0.5 text-xs text-indigo-300"
              >
                {s}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Experience */}
      {experience?.length > 0 && (
        <Section title="Experience">
          {experience.map((role, i) => (
            <div key={i} className="mb-4">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-slate-200">
                  {role.title} — {role.company}
                </span>
                <span className="text-xs text-slate-500 ml-2 shrink-0">{role.dates}</span>
              </div>
              <ul className="mt-1.5 space-y-1">
                {role.bullets.map((b, j) => (
                  <li key={j} className="flex gap-2 text-slate-400">
                    <span className="text-indigo-500 mt-0.5">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Section>
      )}

      {/* Education */}
      {education?.length > 0 && (
        <Section title="Education">
          {education.map((edu, i) => (
            <div key={i} className="mb-2">
              <span className="font-semibold text-slate-200">
                {edu.degree} in {edu.field}
              </span>
              {' — '}
              <span className="text-slate-400">{edu.institution}</span>
              <span className="text-xs text-slate-500 ml-2">{edu.dates}</span>
              {edu.gpa && <span className="text-xs text-slate-500 ml-2">GPA: {edu.gpa}</span>}
            </div>
          ))}
        </Section>
      )}

      {/* Extras */}
      {extras?.map((extra, i) =>
        extra.items?.length > 0 ? (
          <Section key={i} title={extra.category}>
            <ul className="space-y-1">
              {extra.items.map((item, j) => (
                <li key={j} className="flex gap-2 text-slate-400">
                  <span className="text-indigo-500">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">
        {title}
      </h3>
      {children}
    </div>
  )
}
