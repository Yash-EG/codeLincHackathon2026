import { useEffect } from 'react'
import { DEMO_MEMBER_ID, useSessionStore } from '../store/sessionStore'
import { fetchMembers } from './membersApi'

/**
 * Everyone starts on a sample plan so the site works offline. When the member database is
 * reachable, swap that untouched default for the demo employee's real plan, so the plan shown
 * everywhere (header, max bar, Reception, Consult) is the one the estimates are priced against.
 * A plan someone chose on purpose (another employee, a sample, their own numbers) is never replaced.
 */
export function useDefaultMember() {
  const planSource = useSessionStore((s) => s.planSource)

  useEffect(() => {
    if (planSource !== 'default') return
    const ctrl = new AbortController()
    fetchMembers(ctrl.signal)
      .then((members) => {
        if (useSessionStore.getState().planSource !== 'default') return
        const member = members.find((m) => m.id === DEMO_MEMBER_ID) ?? members[0]
        if (member) useSessionStore.getState().checkInMember(member)
      })
      .catch(() => {
        // No backend, or no database: the sample plan stays, and Reception explains why.
      })
    return () => ctrl.abort()
  }, [planSource])
}
