const TZ = 'Africa/Nairobi'

export function todayKe() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

export function daysAgoKe(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toLocaleDateString('en-CA', { timeZone: TZ })
}

export function monthsAgoKe(n) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.toLocaleDateString('en-CA', { timeZone: TZ })
}

export function firstDayOfMonthKe() {
  const ke = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
  return `${ke.getFullYear()}-${String(ke.getMonth() + 1).padStart(2, '0')}-01`
}