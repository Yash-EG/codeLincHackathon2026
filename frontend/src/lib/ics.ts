// Minimal iCalendar (.ics) export for year-end reminders: all-day events only.

export interface CalendarReminder {
  id: string
  /** ISO date, YYYY-MM-DD */
  date: string
  title: string
  description: string
}

const escapeText = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`)

const compactDate = (isoDate: string) => isoDate.replaceAll('-', '')

export function buildIcs(reminders: CalendarReminder[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const events = reminders.flatMap((r) => [
    'BEGIN:VEVENT',
    `UID:${r.id}@molarity.local`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compactDate(r.date)}`,
    `SUMMARY:${escapeText(r.title)}`,
    `DESCRIPTION:${escapeText(r.description)}`,
    'END:VEVENT',
  ])
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Molarity//Dental Benefits Optimizer//EN', ...events, 'END:VCALENDAR'].join(
    '\r\n',
  )
}

export function downloadIcs(filename: string, reminders: CalendarReminder[]) {
  const url = URL.createObjectURL(new Blob([buildIcs(reminders)], { type: 'text/calendar' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
