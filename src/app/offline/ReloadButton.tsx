'use client'

export default function ReloadButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="px-6 py-2.5 rounded-lg bg-jf-primary hover:bg-jf-primary-hover text-white text-sm font-semibold transition-colors"
    >
      Reload
    </button>
  )
}
