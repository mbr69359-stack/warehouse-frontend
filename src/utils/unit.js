/**
 * 按箱显示换算：先取整箱再求余。
 * 不足一箱只显示个数（47 → "47个"）；整箱无零散显示 "N箱"；否则 "N箱零M个"。
 * qtyPerBox 缺失或 <=0 时不换算，原样按个返回。
 * 返回 { value, text, converted }：value 为图表用的数值（箱模式下为小数箱），text 为展示文本。
 */
export function formatBoxQty(qty, qtyPerBox) {
  qty = Number(qty) || 0
  const qpb = Number(qtyPerBox) || 0
  if (qpb <= 0) return { value: qty, text: `${qty}个`, converted: false }
  const abs = Math.abs(qty)
  const sign = qty < 0 ? '-' : ''
  const boxes = Math.floor(abs / qpb)
  const rem = abs % qpb
  const text = boxes > 0
    ? (rem > 0 ? `${sign}${boxes}箱零${rem}个` : `${sign}${boxes}箱`)
    : `${sign}${rem}个`
  return { value: Number((qty / qpb).toFixed(2)), text, converted: true }
}

/**
 * 单行重量(kg)。qtyIsBox 为 true 时 qty 按"箱"计：qty × weightPerBox；
 * 否则 qty 按"个"计，需 qtyPerBox 换算单个重量：qty × weightPerBox ÷ qtyPerBox。
 * 缺少必要箱规（weightPerBox，或按个计时的 qtyPerBox）无法计算，返回 null。
 */
export function lineWeightKg(qty, weightPerBox, qtyPerBox, qtyIsBox) {
  qty = Number(qty) || 0
  const wpb = Number(weightPerBox) || 0
  if (wpb <= 0) return null
  if (qtyIsBox) return qty * wpb
  const qpb = Number(qtyPerBox) || 0
  if (qpb <= 0) return null
  return qty * wpb / qpb
}

/** 重量展示文本：null → '—'，否则保留1位小数 + kg */
export function formatWeight(kg) {
  return kg == null ? '—' : `${kg.toFixed(1)} kg`
}
