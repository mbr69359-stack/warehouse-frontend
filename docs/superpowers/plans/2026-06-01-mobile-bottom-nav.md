# 手机端适配（底部导航栏）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改动桌面端体验的前提下，为移动端（≤768px）增加底部导航栏并隐藏侧边栏。

**Architecture:** 使用 CSS media query 检测移动端，在 `Layout/index.vue` 中条件渲染侧边栏与底部导航。桌面端保持原有 el-aside 侧边栏，移动端隐藏侧边栏、顶部不再显示 toggle 按钮、底部固定 5 个 tab。路由匹配逻辑写在 Layout/index.vue 的 computed 中。

**Tech Stack:** Vue 2, Element UI, Vue Router, CSS media queries

---

## 文件变更清单

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/components/Layout/index.vue` | 修改 | 核心布局：条件渲染侧边栏 + 底部导航 |
| `src/components/Layout/Header.vue` | 修改 | 移动端隐藏 toggle 折叠按钮 |
| `src/assets/mobile.css` | 新建 | 全局移动端样式修复（表格、表单等） |
| `src/main.js` | 修改 | 引入 mobile.css |

---

## Task 1: 修改 Layout/index.vue — 添加底部导航栏

**Files:**
- Modify: `src/components/Layout/index.vue`

底部导航的 5 个 tab 及其路由映射：

| Tab | 图标 | 激活路由前缀 |
|-----|------|-------------|
| 首页 | el-icon-s-home | /dashboard |
| 库存 | el-icon-s-grid | /inventory |
| 出入库 | el-icon-sort | /in-orders, /out-orders |
| 报表 | el-icon-data-analysis | /report |
| 我的 | el-icon-user | （展示用户名 + 退出） |

- [ ] **Step 1: 替换 `src/components/Layout/index.vue` 全部内容**

```vue
<template>
  <el-container style="height:100vh;">
    <!-- 桌面端侧边栏（移动端隐藏） -->
    <el-aside
      v-if="!isMobile"
      :width="collapsed ? '64px' : '220px'"
      style="background:#304156;transition:width .3s;overflow:hidden;"
    >
      <div class="logo" @click="$router.push('/dashboard')">
        <i class="el-icon-s-grid" style="color:#409EFF;font-size:22px;"></i>
        <span v-show="!collapsed" style="color:#fff;margin-left:8px;font-weight:bold;white-space:nowrap;">仓库管理系统</span>
      </div>
      <Sidebar :collapsed="collapsed" />
    </el-aside>

    <el-container style="overflow:hidden;">
      <!-- 顶部 Header -->
      <el-header style="background:#fff;border-bottom:1px solid #e6e6e6;padding:0 20px;display:flex;align-items:center;">
        <Header :is-mobile="isMobile" @toggle="collapsed=!collapsed" />
      </el-header>

      <!-- 主内容区 -->
      <el-main :style="mainStyle">
        <router-view />
      </el-main>

      <!-- 移动端底部导航 -->
      <div v-if="isMobile" class="mobile-bottom-nav">
        <div
          v-for="tab in navTabs"
          :key="tab.key"
          class="mobile-nav-item"
          :class="{ active: isTabActive(tab) }"
          @click="handleNavClick(tab)"
        >
          <i :class="tab.icon"></i>
          <span>{{ tab.label }}</span>
        </div>
      </div>
    </el-container>
  </el-container>
</template>

<script>
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'
import { logout } from '../../api/auth'

export default {
  components: { Sidebar, Header },
  data() {
    return {
      collapsed: false,
      windowWidth: window.innerWidth,
      navTabs: [
        { key: 'dashboard', label: '首页', icon: 'el-icon-s-home', routes: ['/dashboard'] },
        { key: 'inventory', label: '库存', icon: 'el-icon-s-grid', routes: ['/inventory'] },
        { key: 'orders', label: '出入库', icon: 'el-icon-sort', routes: ['/in-orders', '/out-orders'] },
        { key: 'report', label: '报表', icon: 'el-icon-data-analysis', routes: ['/report'] },
        { key: 'mine', label: '我的', icon: 'el-icon-user', routes: [] }
      ]
    }
  },
  computed: {
    isMobile() {
      return this.windowWidth <= 768
    },
    mainStyle() {
      return {
        background: '#f0f2f5',
        padding: '20px',
        overflowY: 'auto',
        paddingBottom: this.isMobile ? '72px' : '20px'
      }
    }
  },
  mounted() {
    window.addEventListener('resize', this.onResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize)
  },
  methods: {
    onResize() {
      this.windowWidth = window.innerWidth
    },
    isTabActive(tab) {
      if (tab.key === 'mine') return false
      const path = this.$route.path
      return tab.routes.some(r => path === r || path.startsWith(r + '/'))
    },
    handleNavClick(tab) {
      if (tab.key === 'mine') {
        this.$confirm('确定要退出登录吗？', '提示', {
          confirmButtonText: '退出',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(async () => {
          await logout().catch(() => {})
          this.$store.commit('LOGOUT')
          this.$router.push('/login')
        }).catch(() => {})
        return
      }
      const target = tab.routes[0]
      if (this.$route.path !== target) {
        this.$router.push(target)
      }
    }
  }
}
</script>

<style scoped>
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-bottom: 1px solid #3a4a5c;
  padding: 0 12px;
}

.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: #fff;
  border-top: 1px solid #e8e8e8;
  display: flex;
  z-index: 1000;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
}

.mobile-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  cursor: pointer;
  color: #aaa;
  font-size: 10px;
  transition: color 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.mobile-nav-item i {
  font-size: 20px;
}

.mobile-nav-item.active {
  color: #409EFF;
}
</style>
```

- [ ] **Step 2: 手动验证桌面端正常**

在浏览器打开 http://localhost:8080，确认侧边栏、顶部 Header 与原来完全一样。

- [ ] **Step 3: 手动验证移动端底部导航**

在浏览器 DevTools 切换到手机模式（宽度 375px），确认：
- 侧边栏消失
- 底部出现 5 个 tab
- 点击 tab 正常跳转
- 当前页对应 tab 高亮蓝色

---

## Task 2: 修改 Header.vue — 移动端隐藏 toggle 按钮

**Files:**
- Modify: `src/components/Layout/Header.vue`

- [ ] **Step 1: 替换 `src/components/Layout/Header.vue` 全部内容**

```vue
<template>
  <div style="width:100%;display:flex;align-items:center;justify-content:space-between;">
    <i
      v-if="!isMobile"
      class="el-icon-s-fold"
      style="font-size:20px;cursor:pointer;color:#606266;"
      @click="$emit('toggle')"
    ></i>
    <span v-if="isMobile" style="font-size:15px;font-weight:bold;color:#333;">仓库管理系统</span>
    <el-dropdown @command="handleCommand">
      <span style="cursor:pointer;color:#606266;">
        <i class="el-icon-user-solid"></i> {{ username }}
        <i class="el-icon-arrow-down" style="margin-left:4px;"></i>
      </span>
      <el-dropdown-menu slot="dropdown">
        <el-dropdown-item command="logout" icon="el-icon-switch-button">退出登录</el-dropdown-item>
      </el-dropdown-menu>
    </el-dropdown>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { logout } from '../../api/auth'
export default {
  props: {
    isMobile: { type: Boolean, default: false }
  },
  computed: { ...mapGetters(['username']) },
  methods: {
    async handleCommand(cmd) {
      if (cmd === 'logout') {
        await logout().catch(() => {})
        this.$store.commit('LOGOUT')
        this.$router.push('/login')
      }
    }
  }
}
</script>
```

- [ ] **Step 2: 手动验证**

桌面端（>768px）：左侧有折叠按钮，右侧用户名。
移动端（≤768px）：左侧显示"仓库管理系统"文字，无折叠按钮，右侧用户名。

---

## Task 3: 新建全局移动端 CSS 修复

**Files:**
- Create: `src/assets/mobile.css`
- Modify: `src/main.js`

移动端 Element UI 的表格会溢出屏幕，需要让表格横向可滚动，并让表单 label 换行。

- [ ] **Step 1: 新建 `src/assets/mobile.css`**

```css
@media (max-width: 768px) {
  /* 表格横向滚动 */
  .el-table {
    overflow-x: auto;
  }
  .el-table__body-wrapper {
    overflow-x: auto;
  }

  /* 表单 label 改为上方显示 */
  .el-form--label-left .el-form-item,
  .el-form--label-right .el-form-item {
    display: flex;
    flex-direction: column;
  }
  .el-form-item__label {
    text-align: left !important;
    width: auto !important;
    float: none !important;
    padding-bottom: 4px;
  }
  .el-form-item__content {
    margin-left: 0 !important;
  }

  /* 对话框全屏 */
  .el-dialog {
    width: 95% !important;
    margin: 8px auto !important;
  }

  /* 按钮组换行 */
  .el-button + .el-button {
    margin-left: 0;
    margin-top: 8px;
  }

  /* 分页简化 */
  .el-pagination .el-pagination__sizes,
  .el-pagination .el-pagination__jump {
    display: none;
  }
}
```

- [ ] **Step 2: 在 `src/main.js` 引入 mobile.css**

在 main.js 末尾已有的 import 下方添加一行：

```js
import './assets/mobile.css'
```

- [ ] **Step 3: 手动验证**

移动端打开库存列表页，确认：
- 表格可以左右滑动，不溢出
- 分页控件简化（无"每页条数"选择）

---

## Task 4: 提交代码

- [ ] **Step 1: 提交**

```bash
git add src/components/Layout/index.vue src/components/Layout/Header.vue src/assets/mobile.css src/main.js
git commit -m "feat: mobile bottom navigation bar (≤768px)"
```

- [ ] **Step 2: 推送到 GitHub**

```bash
git push
```

Vercel 会自动触发重新部署，约 1-2 分钟后在 https://warehouse-frontend-rose.vercel.app 可用手机验证。

---

## 自检

| 需求 | 对应 Task |
|------|----------|
| 移动端底部显示 5 个 tab | Task 1 |
| 点击 tab 跳转到对应页面 | Task 1 |
| 当前页 tab 高亮 | Task 1 |
| 移动端隐藏侧边栏 | Task 1 |
| 桌面端完全不受影响 | Task 1 + 2 |
| 移动端顶部无折叠按钮 | Task 2 |
| 表格不溢出屏幕 | Task 3 |
| "我的" tab 可退出登录 | Task 1 |
