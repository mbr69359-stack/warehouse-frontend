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
