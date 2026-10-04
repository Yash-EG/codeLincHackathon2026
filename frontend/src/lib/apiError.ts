// Turning a failed backend call into a sentence a person can act on. Every
// /api client uses this, so "the backend is down", "the database is off" and
// "Bedrock credentials are missing" each read as themselves instead of a bare
// status code.

/**
 * The backend's own message when it sent one (its ErrorResponse JSON), else a
 * sentence from the status. A bare 5xx with no JSON body comes from a proxy or
 * gateway: in dev, Vite answers 500 when the backend isn't running.
 */
export async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: unknown }
    if (typeof body.message === 'string' && body.message.trim()) return body.message
  } catch {
    // Not JSON: fall through to the status.
  }
  return res.status >= 500
    ? `The backend didn't answer (HTTP ${res.status}). Check that it's running.`
    : `The server answered ${res.status}.`
}

/** fetch for /api calls: a network failure becomes a readable error; an abort passes through untouched. */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new Error("The backend couldn't be reached. Check that it's running.")
  }
}
