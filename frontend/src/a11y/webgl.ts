let supported: boolean | undefined

/** True when the browser can create a WebGL context. Checked once, then cached. */
export function hasWebGL(): boolean {
  if (supported !== undefined) return supported
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    supported = gl != null
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    supported = false
  }
  return supported
}
