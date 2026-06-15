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

// 把后端时间戳（如 2026-06-04T23:42:00）显示为 2026-06-04 23:42。
// 纯字符串处理，不按时区重算，避免偏移；空值返回 ''。
export function formatDateTime(v) {
  if (!v) return ''
  return String(v).replace('T', ' ').slice(0, 16)
}