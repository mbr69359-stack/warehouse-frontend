<template>
  <div>
    <div v-if="isMobile" class="m-page m-empty" style="padding-top:60px;">
      <span class="material-symbols-outlined" style="font-size:56px;color:#c4c5d5;">{{ mobileIcon }}</span>
      <p style="font-size:16px;font-weight:600;color:#444653;margin:12px 0 4px;">{{ mobileTitle || title }}</p>
      <p style="font-size:13px;color:#757684;">{{ mobileHint }}</p>
    </div>
    <el-card v-else :class="cardClass" v-loading="loading">
      <div slot="header" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <span style="font-weight:600;">{{ title }}</span>
        <slot name="toolbar" />
      </div>
      <slot />
    </el-card>
  </div>
</template>

<script>
// 报表页公共外壳：移动端占位 + 桌面卡片 + 头部工具条。
// 各报表把筛选/按钮放进 #toolbar 插槽，表格/图表放进默认插槽，内容与逻辑仍在各页。
import mobileMixin from '../../mixins/mobile'
export default {
  name: 'ReportShell',
  mixins: [mobileMixin],
  props: {
    mobileIcon: { type: String, required: true },           // 移动占位图标
    title: { type: String, required: true },                 // 卡片头部标题
    mobileTitle: { type: String, default: '' },              // 移动占位标题（默认同 title）
    mobileHint: { type: String, default: '请在电脑端查看' },  // 移动占位副文案
    cardClass: { type: String, default: '' },                // 卡片自定义 class
    loading: { type: Boolean, default: false }               // 卡片 loading
  }
}
</script>
