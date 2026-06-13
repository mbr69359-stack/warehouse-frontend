// 入库单 / 出库单打印小票生成。
// 入库与出库详情页此前各有一份几乎逐字相同的打印 HTML，差异仅：
// 单据字样(docLabel)、类型字段标签(typeFieldLabel)、类型显示文字(typeText)、
// 计划数量取值字段。调用方把这些差异与已算好的行数据传入即可。
//
// 参数：
//   docLabel       单据名，如「入库单」「出库单」（用于标题与 H2）
//   typeFieldLabel 类型字段标签，如「入库类型」「出库类型」
//   typeText       类型显示文字（调用方用各自的 typeMap 解析后传入）
//   statusText     状态显示文字
//   warehouseName  仓库名
//   qtyIsBox       是否按箱（影响表头单位后缀与总箱数行）
//   order          原始单据对象，读取 orderNo / createTime / confirmTime / remark
//   totals         合计对象 { boxes, pieces, weight, amount }
//   rows           行数组，每行 { name, sku, planQty, actualQty, price:Number, weightKg:Number|null, subtotal:Number }
export function printOrderDocument({
  docLabel, typeFieldLabel, typeText, statusText, warehouseName, qtyIsBox, order, totals, rows
}) {
  const boxSuffix = qtyIsBox ? '(箱)' : ''
  const rowsHtml = rows.map(r => `<tr>
          <td>${r.name}${r.sku ? '<br><small style="color:#888">' + r.sku + '</small>' : ''}</td>
          <td style="text-align:center">${r.planQty}</td>
          <td style="text-align:center">${r.actualQty ?? '—'}</td>
          <td style="text-align:right">KSh ${Number(r.price || 0).toFixed(2)}</td>
          <td style="text-align:right">${r.weightKg != null ? r.weightKg.toFixed(1) + ' kg' : '—'}</td>
          <td style="text-align:right">KSh ${Number(r.subtotal || 0).toFixed(2)}</td>
        </tr>`).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>${docLabel} ${order.orderNo}</title>
        <style>
          body { font-family: "Microsoft YaHei", sans-serif; padding: 32px; color: #222; }
          h2 { margin: 0 0 4px; font-size: 20px; }
          .meta { display: flex; gap: 40px; margin: 16px 0; font-size: 13px; color: #555; }
          .meta span { display: flex; flex-direction: column; }
          .meta b { font-size: 14px; color: #222; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
          th { background: #f5f5f5; padding: 8px 10px; border: 1px solid #ddd; text-align: left; }
          td { padding: 8px 10px; border: 1px solid #ddd; }
          .total { text-align: right; margin-top: 12px; font-size: 15px; font-weight: bold; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #888; }
          @media print { @page { margin: 15mm; } }
        </style></head><body>
        <h2>${docLabel}</h2>
        <div style="font-size:13px;color:#555;">单号：<b style="color:#222">${order.orderNo}</b>
          &nbsp;&nbsp;状态：<b style="color:#222">${statusText}</b></div>
        <div class="meta">
          <span>仓库<b>${warehouseName}</b></span>
          <span>${typeFieldLabel}<b>${typeText}</b></span>
          <span>创建时间<b>${order.createTime || '—'}</b></span>
          <span>确认时间<b>${order.confirmTime || '—'}</b></span>
        </div>
        <table>
          <thead><tr><th>商品</th><th style="text-align:center">计划数量${boxSuffix}</th><th style="text-align:center">实际数量${boxSuffix}</th><th style="text-align:right">单价</th><th style="text-align:right">重量</th><th style="text-align:right">小计</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="total">${qtyIsBox ? '总箱数：' + totals.boxes + ' 箱&nbsp;&nbsp;' : ''}总件数：${totals.pieces != null ? totals.pieces + ' 个' : '—'}&nbsp;&nbsp;总重量：${totals.weight != null ? totals.weight.toFixed(1) + ' kg' : '—'}&nbsp;&nbsp;合计金额：KSh ${totals.amount.toFixed(2)}</div>
        <div class="footer">
          <span>备注：${order.remark || '无'}</span>
          <span>打印时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Africa/Nairobi' })}</span>
        </div>
        <script>window.onload=()=>{window.print();}<\/script>
      </body></html>`

  const w = window.open('', '_blank', 'width=800,height=600')
  w.document.write(html)
  w.document.close()
}
