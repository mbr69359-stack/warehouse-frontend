<template>
  <el-menu :default-active="$route.path" background-color="#304156" text-color="#bfcbd9"
    active-text-color="#409EFF" :collapse="collapsed" router>
    <el-menu-item index="/dashboard"><i class="el-icon-s-home"></i><span slot="title">首页</span></el-menu-item>

    <el-submenu index="product">
      <template slot="title"><i class="el-icon-goods"></i><span>商品管理</span></template>
      <el-menu-item index="/products">商品列表</el-menu-item>
      <el-menu-item index="/categories">商品分类</el-menu-item>
    </el-submenu>

    <el-menu-item index="/warehouses"><i class="el-icon-office-building"></i><span slot="title">仓库管理</span></el-menu-item>
    <el-menu-item index="/suppliers"><i class="el-icon-s-cooperation"></i><span slot="title">供应商管理</span></el-menu-item>

    <el-submenu index="in-order">
      <template slot="title"><i class="el-icon-download"></i><span>入库管理</span></template>
      <el-menu-item index="/in-orders">入库单列表</el-menu-item>
      <el-menu-item index="/in-orders/create">新建入库单</el-menu-item>
    </el-submenu>

    <el-submenu index="out-order">
      <template slot="title"><i class="el-icon-upload2"></i><span>出库管理</span></template>
      <el-menu-item index="/out-orders">出库单列表</el-menu-item>
      <el-menu-item index="/out-orders/create">新建出库单</el-menu-item>
    </el-submenu>

    <el-submenu index="inventory">
      <template slot="title"><i class="el-icon-s-grid"></i><span>库存管理</span></template>
      <el-menu-item index="/inventory">库存查询</el-menu-item>
      <el-menu-item index="/inventory/alerts">库存预警</el-menu-item>
      <el-menu-item index="/inventory/check">库存盘点</el-menu-item>
    </el-submenu>

    <el-submenu index="report">
      <template slot="title"><i class="el-icon-data-analysis"></i><span>报表统计</span></template>
      <el-menu-item index="/report/in">入库报表</el-menu-item>
      <el-menu-item index="/report/out">出库报表</el-menu-item>
      <el-menu-item index="/report/inventory">库存报表</el-menu-item>
    </el-submenu>

    <el-submenu index="sys" v-if="isAdmin">
      <template slot="title"><i class="el-icon-setting"></i><span>系统设置</span></template>
      <el-menu-item index="/sys/users">用户管理</el-menu-item>
      <el-menu-item index="/sys/roles">角色管理</el-menu-item>
    </el-submenu>
  </el-menu>
</template>

<script>
import { mapGetters } from 'vuex'
export default {
  props: { collapsed: Boolean },
  computed: { ...mapGetters(['isAdmin']) }
}
</script>
