import React from "react"

export function Toast({ message, tone = "neutral", href, hrefText, onClose }) {
  if (!message) return null

  const border =
    tone === "error" ? "border-red-200" : tone === "success" ? "border-emerald-200" : "border-gray-200"
  const bg = tone === "error" ? "bg-red-50" : tone === "success" ? "bg-emerald-50" : "bg-white"
  const text = tone === "error" ? "text-red-800" : tone === "success" ? "text-emerald-900" : "text-gray-900"

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className={`pointer-events-auto w-full max-w-xl rounded-xl border ${border} ${bg} p-4 shadow-lg`}>
        <div className="flex items-start gap-3">
          <div className={`min-w-0 flex-1 break-words text-sm ${text}`}>
            {message}{" "}
            {href ? (
              <a className="underline" href={href} target="_blank" rel="noreferrer">
                {hrefText || href}
              </a>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded border border-transparent px-2 py-1 text-sm text-gray-600 hover:border-gray-200 hover:bg-white"
            onClick={onClose}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}


