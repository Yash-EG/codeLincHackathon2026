import { PREREQUISITE_MESSAGE, type Prerequisite } from '../rooms'
import { useSessionStore } from './sessionStore'

/** The message explaining what a room still needs, or null when it's ready. */
export function useMissingPrerequisite(prerequisite: Prerequisite | undefined): string | null {
  const hasPlan = useSessionStore((s) => s.plan != null)
  const hasProcedures = useSessionStore((s) => s.procedures.length > 0)
  if (!prerequisite) return null
  if (!hasPlan) return PREREQUISITE_MESSAGE.plan
  if (prerequisite === 'procedure' && !hasProcedures) return PREREQUISITE_MESSAGE.procedure
  return null
}
