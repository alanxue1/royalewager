import React, { useEffect, useState } from "react"

import { Toast } from "./toast"

export function ToastHost() {
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail || {}
      setToast({
        message: detail.message || "",
        tone: detail.tone || "neutral",
        href: detail.href || "",
        hrefText: detail.hrefText || "",
      })
    }

    window.addEventListener("royale:toast", handler)
    return () => window.removeEventListener("royale:toast", handler)
  }, [])

  if (!toast?.message) return null

  return (
    <Toast
      message={toast.message}
      tone={toast.tone}
      href={toast.href}
      hrefText={toast.hrefText}
      onClose={() => setToast(null)}
    />
  )
}


