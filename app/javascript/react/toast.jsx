import React from "react"

export function Toast({ message, tone = "neutral", href, hrefText, onClose }) {
  if (!message) return null

  const border =
    tone === "error"
      ? "border-royale-defeat"
      : tone === "success"
        ? "border-royale-victory"
        : "border-supercell-gray"
  const bg =
    tone === "error"
      ? "bg-red-50"
      : tone === "success"
        ? "bg-blue-50"
        : "bg-white"
  const text =
    tone === "error"
      ? "text-royale-defeat"
      : tone === "success"
        ? "text-royale-victory"
        : "text-supercell-dark"

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div
        className={`pointer-events-auto w-full max-w-xl rounded-xl border-2 ${border} ${bg} p-4 shadow-royale-lg`}
        style={{
          fontFamily: "'Clash', sans-serif",
        }}
      >
        <div className="flex items-start gap-3">
          <div className={`min-w-0 flex-1 break-words text-sm font-semibold ${text}`}>
            {message}{" "}
            {href ? (
              <a className="underline" href={href} target="_blank" rel="noreferrer">
                {hrefText || href}
              </a>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded border border-transparent px-2 py-1 text-sm text-supercell-medium hover:border-supercell-gray hover:bg-white"
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


