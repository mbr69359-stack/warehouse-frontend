<template>
  <el-container style="height:100vh;">
    <el-aside :width="collapsed?'64px':'220px'" style="background:#304156;transition:width .3s;overflow:hidden;">
      <div class="logo" @click="$router.push('/dashboard')">
        <i class="el-icon-s-grid" style="color:#409EFF;font-size:22px;"></i>
        <span v-show="!collapsed" style="color:#fff;margin-left:8px;font-weight:bold;white-space:nowrap;">仓库管理系统</span>
      </div>
      <Sidebar :collapsed="collapsed" />
    </el-aside>
    <el-container>
      <el-header style="background:#fff;border-bottom:1px solid #e6e6e6;padding:0 20px;display:flex;align-items:center;">
        <Header @toggle="collapsed=!collapsed" />
      </el-header>
      <el-main style="background:#f0f2f5;padding:20px;overflow:auto;">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script>
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'
export default {
  components: { Sidebar, Header },
  data() { return { collapsed: false } }
}
</script>

<style scoped>
.logo { height:60px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-bottom:1px solid #3a4a5c;padding:0 12px; }
</style>
