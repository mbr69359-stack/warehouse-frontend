<template>
  <div>

    <!-- ── 桌面端 ── -->
    <template v-if="!isMobile">
      <el-row :gutter="20" style="margin-bottom:20px;">
        <el-col :span="6" v-for="c in cards" :key="c.label">
          <el-card shadow="hover" style="text-align:center;cursor:pointer;" @click.native="$router.push(c.route)">
            <i :class="c.icon" :style="{fontSize:'36px',color:c.color}"></i>
            <div style="font-size:28px;font-weight:bold;margin:8px 0;">{{ c.value }}</div>
            <div style="color:#909399;">{{ c.label }}</div>
          </el-card>
        </el-col>
      </el-row>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card>
            <div slot="header">快捷入口</div>
            <el-button type="primary" icon="el-icon-download" @click="$router.push('/in-orders/create')">新建入库单</el-button>
            <el-button type="success" icon="el-icon-upload2" style="margin-left:12px;" @click="$router.push('/out-orders/create')">新建出库单</el-button>
            <el-button type="warning" icon="el-icon-document-checked" style="margin-left:12px;" @click="$router.push('/inventory/check')">库存盘点</el-button>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card>
            <div slot="header" style="display:flex;justify-content:space-between;">
              <span>库存预警</span>
              <el-link type="primary" @click="$router.push('/inventory/alerts')">查看全部</el-link>
            </div>
            <el-table :data="alerts.slice(0,5)" size="small">
              <el-table-column prop="productId" label="商品ID" width="80" />
              <el-table-column prop="warehouseId" label="仓库ID" width="80" />
              <el-table-column prop="qty" label="当前库存" />
              <el-table-column prop="alertQty" label="预警值" />
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <!-- ── 移动端 ── -->
    <div v-else class="m-page">

      <!-- 页头 -->
      <div class="m-page-header">
        <h2 class="m-page-title">工作台</h2>
        <p class="m-page-sub">仓库运行状态良好</p>
      </div>

      <!-- 今日概览 -->
      <section class="m-section">
        <div class="m-section-header">
          <span class="m-section-title">今日概览</span>
        </div>
        <!-- 2×2 统计网格 -->
        <div class="m-stat-grid">
          <div class="m-stat-card" @click="$router.push('/in-orders')">
            <div class="m-stat-label">待入库</div>
            <div class="m-stat-value">{{ cards[0].value }}</div>
          </div>
          <div class="m-stat-card" @click="$router.push('/out-orders')">
            <div class="m-stat-label">待出库</div>
            <div class="m-stat-value">{{ cards[1].value }}</div>
          </div>
          <div class="m-stat-card" @click="$router.push('/inventory/check')">
            <div class="m-stat-label">待盘点</div>
            <div class="m-stat-value">{{ cards[3].value }}</div>
          </div>
          <div class="m-stat-card" @click="$router.push('/inventory')">
            <div class="m-stat-label">库存种类</div>
            <div class="m-stat-value">{{ cards[3].value }}</div>
          </div>
        </div>
        <!-- 库存预警 全宽长方形 -->
        <div v-if="cards[2].value > 0" class="m-alert-banner" @click="$router.push('/inventory/alerts')">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="material-symbols-outlined" style="font-size:22px;">warning</span>
            <div>
              <div style="font-size:12px;opacity:.85;">库存预警</div>
              <div style="font-size:22px;font-weight:700;line-height:1.1;">{{ cards[2].value }} <span style="font-size:13px;font-weight:400;">件商品低于预警值</span></div>
            </div>
          </div>
          <span class="material-symbols-outlined" style="font-size:20px;opacity:.7;">chevron_right</span>
        </div>
      </section>

      <!-- 快捷功能 2×2 -->
      <section class="m-section">
        <div class="m-section-title" style="margin-bottom:12px;">快捷功能</div>
        <div class="m-quick-grid2">
          <button class="m-quick-btn2" @click="$router.push('/in-orders/create')">
            <div class="m-quick-icon2 primary">
              <span class="material-symbols-outlined">input</span>
            </div>
            <span class="m-quick-label">新建入库</span>
          </button>
          <button class="m-quick-btn2" @click="$router.push('/out-orders/create')">
            <div class="m-quick-icon2">
              <span class="material-symbols-outlined">output</span>
            </div>
            <span class="m-quick-label">新建出库</span>
          </button>
          <button class="m-quick-btn2" @click="$router.push('/inventory')">
            <div class="m-quick-icon2">
              <span class="material-symbols-outlined">inventory_2</span>
            </div>
            <span class="m-quick-label">库存查询</span>
          </button>
          <button class="m-quick-btn2" @click="$router.push('/inventory/check')">
            <div class="m-quick-icon2">
              <span class="material-symbols-outlined">rule</span>
            </div>
            <span class="m-quick-label">库存盘点</span>
          </button>
        </div>
      </section>

      <!-- 最新任务 -->
      <section class="m-section">
        <div class="m-section-header">
          <span class="m-section-title">最新任务</span>
          <span class="m-section-link" @click="$router.push('/in-orders')">查看全部</span>
        </div>
        <div class="db-task-list">

          <div class="db-task-item" @click="$router.push('/in-orders')">
            <div class="db-task-bar" style="background:#00288e;"></div>
            <div class="db-task-body">
              <div class="db-task-top">
                <span class="db-task-badge" style="background:#e6eeff;color:#00288e;">入库</span>
                <span class="db-task-title">入库任务</span>
              </div>
              <div class="db-task-desc">点击查看待处理入库单</div>
            </div>
            <div class="db-task-right">
              <div class="db-task-count">{{ cards[0].value }}</div>
              <span class="material-symbols-outlined" style="color:#c4c5d5;font-size:20px;">chevron_right</span>
            </div>
          </div>

          <div class="db-task-item" @click="$router.push('/out-orders')">
            <div class="db-task-bar" style="background:#855300;"></div>
            <div class="db-task-body">
              <div class="db-task-top">
                <span class="db-task-badge" style="background:#ffddb8;color:#653e00;">出库</span>
                <span class="db-task-title">出库任务</span>
              </div>
              <div class="db-task-desc">点击查看待处理出库单</div>
            </div>
            <div class="db-task-right">
              <div class="db-task-count">{{ cards[1].value }}</div>
              <span class="material-symbols-outlined" style="color:#c4c5d5;font-size:20px;">chevron_right</span>
            </div>
          </div>

          <div class="db-task-item" @click="$router.push('/inventory')">
            <div class="db-task-bar" style="background:#3755c3;"></div>
            <div class="db-task-body">
              <div class="db-task-top">
                <span class="db-task-badge" style="background:#dde1ff;color:#173bab;">库存</span>
                <span class="db-task-title">库存种类</span>
              </div>
              <div class="db-task-desc">点击查看全部库存</div>
            </div>
            <div class="db-task-right">
              <div class="db-task-count">{{ cards[3].value }}</div>
              <span class="material-symbols-outlined" style="color:#c4c5d5;font-size:20px;">chevron_right</span>
            </div>
          </div>

        </div>
      </section>

    </div>
  </div>
</template>

<script>
import { getAlerts, getInventory } from '../api/inventory'
import { getInOrders } from '../api/inOrder'
import { getOutOrders } from '../api/outOrder'
import mobileMixin from '../mixins/mobile'
export default {
  mixins: [mobileMixin],
  data() {
    return {
      alerts: [],
      cards: [
        { label: '入库单总数', value: 0, icon: 'el-icon-download', color: '#409EFF', route: '/in-orders' },
        { label: '出库单总数', value: 0, icon: 'el-icon-upload2',  color: '#67C23A', route: '/out-orders' },
        { label: '库存预警',   value: 0, icon: 'el-icon-warning',  color: '#E6A23C', route: '/inventory/alerts' },
        { label: '库存种类',   value: 0, icon: 'el-icon-s-grid',   color: '#F56C6C', route: '/inventory' }
      ]
    }
  },
  async created() {
    const [alertRes, inRes, outRes, invRes] = await Promise.all([
      getAlerts().catch(() => ({ data: [] })),
      getInOrders({ current: 1, size: 1 }).catch(() => ({ data: { total: 0 } })),
      getOutOrders({ current: 1, size: 1 }).catch(() => ({ data: { total: 0 } })),
      getInventory({ current: 1, size: 1 }).catch(() => ({ data: { total: 0 } }))
    ])
    this.alerts        = alertRes.data || []
    this.cards[0].value = inRes.data.total  || 0
    this.cards[1].value = outRes.data.total || 0
    this.cards[2].value = this.alerts.length
    this.cards[3].value = invRes.data.total || 0
  }
}
</script>

<style scoped>
.m-alert-banner {
  margin-top: 10px;
  background: #ffdad6;
  border: 1px solid rgba(186,26,26,.2);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #ba1a1a;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.m-alert-banner:active { opacity: .8; }

.m-quick-grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.m-quick-btn2 {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid #c4c5d5;
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background .15s, transform .1s;
}
.m-quick-btn2:active { background: #e6eeff; transform: scale(.97); }
.m-quick-icon2 {
  width: 44px; height: 44px;
  border-radius: 12px;
  background: #e6eeff;
  display: flex; align-items: center; justify-content: center;
  color: #00288e; flex-shrink: 0;
}
.m-quick-icon2 .material-symbols-outlined { font-size: 24px; }
.m-quick-icon2.primary { background: #00288e; color: #fff; }
.m-quick-label {
  font-size: 14px; font-weight: 600; color: #121c2a;
}

/* 最新任务卡片 */
.db-task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.db-task-item {
  background: #fff;
  border: 1px solid #c4c5d5;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: stretch;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: box-shadow .15s, transform .1s;
}
.db-task-item:active { transform: scale(.98); box-shadow: 0 2px 8px rgba(0,0,0,.08); }
.db-task-bar {
  width: 5px;
  flex-shrink: 0;
}
.db-task-body {
  flex: 1;
  padding: 14px 12px;
  min-width: 0;
}
.db-task-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.db-task-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}
.db-task-title {
  font-size: 15px;
  font-weight: 700;
  color: #121c2a;
}
.db-task-desc {
  font-size: 12px;
  color: #757684;
}
.db-task-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 14px 14px 14px 8px;
  gap: 2px;
}
.db-task-count {
  font-size: 22px;
  font-weight: 700;
  color: #00288e;
  line-height: 1;
}
</style>