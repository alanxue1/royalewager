// Entry point for the build script in your package.json
import "./controllers"
import "./react/mount"

// Polyfill for Buffer in browser environments, needed by some Solana/Privy dependencies.
// This ensures Buffer.from() calls don't fail.
import { Buffer } from "buffer"
if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer
}
