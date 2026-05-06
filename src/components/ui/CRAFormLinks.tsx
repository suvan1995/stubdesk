import { CRA_FORM_LINKS, type CRAFormKey } from '@/lib/craLinks'

interface Props {
  formKey: CRAFormKey
  compact?: boolean   // true = just icon buttons, false = full banner
}

export default function CRAFormLinks({ formKey, compact = false }: Props) {
  const links = CRA_FORM_LINKS[formKey]

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">CRA:</span>
        <a
          href={links.formPage}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 hover:underline"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
          Blank Form
        </a>
        <span className="text-gray-200">|</span>
        <a
          href={links.guidePage}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:underline"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          CRA Guide
        </a>
        <span className="text-gray-200">|</span>
        <a
          href={links.webForms}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:underline"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          File Online
        </a>
      </div>
    )
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4">
      <div className="flex items-start gap-3">
        {/* Canada flag emoji as icon */}
        <span className="text-2xl mt-0.5">🇨🇦</span>
        <div className="flex-1">
          <div className="font-semibold text-red-800 text-sm mb-1">
            Official CRA Form — {links.label}
          </div>
          <p className="text-xs text-red-700 mb-3 leading-relaxed">
            Download the official blank fillable PDF from CRA, then use the values from StubDesk to fill it in.
            File electronically via CRA Web Forms or My Business Account.
          </p>
          <div className="flex gap-3 flex-wrap">
            <a
              href={links.formPage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg text-xs font-bold hover:bg-red-800 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download Blank CRA Form
            </a>
            <a
              href={links.webForms}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              File Online via CRA
            </a>
            <a
              href={links.guidePage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              CRA Instructions
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
