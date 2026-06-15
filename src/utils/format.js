// 金额格式化：保留两位小数，空值按 0 处理。
export function money(v) {
  return Number(v || 0).toFixed(2)
}
