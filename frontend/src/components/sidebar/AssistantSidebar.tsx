import type { ReactNode } from 'react'
import { MessageSquare, Receipt, Sparkles } from 'lucide-react'

export type SidebarTab = 'assistant' | 'breakdown'

interface AssistantSidebarProps {
  tab: SidebarTab
  onTabChange: (tab: SidebarTab) => void
  breakdownCount: number
  chat: ReactNode
  breakdown: ReactNode
}

export default function AssistantSidebar({ tab, onTabChange, breakdownCount, chat, breakdown }: AssistantSidebarProps) {
  const tabs: Array<{ id: SidebarTab; label: string; icon: ReactNode; badge?: number }> = [
    { id: 'assistant', label: 'Assistant', icon: <MessageSquare className="size-3.5" aria-hidden="true" /> },
    {
      id: 'breakdown',
      label: 'Cost breakdown',
      icon: <Receipt className="size-3.5" aria-hidden="true" />,
      badge: breakdownCount,
    },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-ink-800 bg-ink-900">
      <div className="border-b border-ink-800 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-50">
            <Sparkles className="size-4 text-accent" aria-hidden="true" />
            Benefits copilot
          </h2>
          <span className="rounded-full border border-ink-700 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-400">
            Bedrock · demo data
          </span>
        </div>

        <div role="tablist" aria-label="Sidebar views" className="mt-3 flex gap-1">
          {tabs.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls={`panel-${t.id}`}
                onClick={() => onTabChange(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-accent ${
                  active ? 'bg-ink-800 text-ink-50 ring-1 ring-ink-700' : 'text-ink-400 hover:text-ink-100'
                }`}
              >
                {t.icon}
                {t.label}
                {t.badge != null && t.badge > 0 && (
                  <span className="rounded-full bg-accent px-1.5 text-[10px] font-semibold leading-4 text-ink-950">
                    {t.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Both panels stay mounted so the chat draft and scroll position survive tab switches. */}
      {tabs.map((t) => (
        <div
          key={t.id}
          id={`panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${t.id}`}
          hidden={tab !== t.id}
          className="min-h-0 flex-1"
        >
          {t.id === 'assistant' ? chat : breakdown}
        </div>
      ))}
    </div>
  )
}
