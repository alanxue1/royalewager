import React, { useEffect, useState, useRef } from "react"

export function NumberTicker({ value, startValue = 0, duration = 2000, className = "" }) {
  const [displayValue, setDisplayValue] = useState(startValue)
  const animationFrameRef = useRef(null)
  const startTimeRef = useRef(null)

  useEffect(() => {
    const startTime = Date.now()
    startTimeRef.current = startTime
    const start = startValue
    const end = value
    const range = end - start

    if (range === 0) {
      setDisplayValue(value)
      return
    }

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3)

      const current = start + range * eased
      setDisplayValue(current)

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(end)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [value, startValue, duration])

  // Format with 3 decimal places
  const formatted = displayValue.toFixed(3)

  return <span className={className}>{formatted}</span>
}

