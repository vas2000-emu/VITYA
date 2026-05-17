'use client'

// Three.js 0.184 logs deprecation warnings for shadow-map and Timer
// internals that drei / fiber reach into. We don't set these values
// ourselves, so fixing at the source isn't possible from this repo.
// Filter the matching messages from console.warn once, on the client.
const SUPPRESS_PATTERNS = ['PCFSoftShadowMap has been deprecated', 'THREE.Timer']

let installed = false

export function silenceThreeWarnings() {
  if (installed || typeof window === 'undefined') return
  installed = true
  const original = console.warn
  console.warn = (...args: unknown[]) => {
    const first = typeof args[0] === 'string' ? args[0] : ''
    if (SUPPRESS_PATTERNS.some((p) => first.includes(p))) return
    original.apply(console, args as Parameters<typeof console.warn>)
  }
}
