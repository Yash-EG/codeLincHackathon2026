// Form -> chat. Watches the session and, when the member picks a tooth, switches
// plan or adds care in any form, drops a contextual note into the co-pilot's feed
// (the chat transcript), wherever they are on the site. Mounted once, in AppShell.

import { useEffect } from 'react'
import { addedNote, planNote, toothNote } from '../lib/copilot'
import { announce } from './uiStore'
import { useSessionStore } from './sessionStore'

export function useCopilotFeed() {
  useEffect(() => {
    const note = (text: string | null) => {
      if (!text) return
      useSessionStore.getState().addChatMessage({
        sender: 'assistant',
        text,
        timestamp: new Date().toISOString(),
        source: 'plan',
        kind: 'context',
      })
      announce(text)
    }

    return useSessionStore.subscribe((state, prev) => {
      if (state.selectedTooth != null && state.selectedTooth !== prev.selectedTooth) {
        note(toothNote(state.selectedTooth, state))
      }
      if (state.plan && prev.plan && state.plan.id !== prev.plan.id) {
        note(planNote(state))
      }
      if (state.procedures.length > prev.procedures.length) {
        const known = new Set(prev.procedures.map((p) => p.id))
        note(addedNote(state.procedures.filter((p) => !known.has(p.id)), state))
      }
    })
  }, [])
}
