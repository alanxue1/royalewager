import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["text"]
  static values = {
    phrases: Array,
    intervalMs: { type: Number, default: 2000 },
  }

  connect() {
    this.idx = 0
    this._tick = this.tick.bind(this)

    const phrases = this.phrasesValue ?? []
    if (phrases.length === 0) return

    // Ensure we start at whatever is currently rendered, if it matches.
    const current = (this.textTarget?.textContent ?? "").trim()
    const foundIdx = phrases.findIndex((p) => String(p).trim() === current)
    this.idx = foundIdx >= 0 ? foundIdx : 0

    this.timer = window.setInterval(this._tick, this.intervalMsValue)
  }

  disconnect() {
    if (this.timer) window.clearInterval(this.timer)
    this.timer = null
  }

  tick() {
    const phrases = this.phrasesValue ?? []
    if (phrases.length <= 1) return

    this.idx = (this.idx + 1) % phrases.length
    const next = String(phrases[this.idx] ?? "")

    // Fade out, swap text, fade in.
    this.textTarget.classList.add("opacity-0")
    window.setTimeout(() => {
      this.textTarget.textContent = next
      this.textTarget.classList.remove("opacity-0")
    }, 160)
  }
}


