# 调拨出库改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在新建出库单页面支持调拨出库选择目标仓库，并在产品下拉中显示当前库存数量。

**Architecture:** 后端 OutOrder 实体加 `targetWarehouseId` 字段，前端 Create.vue 选仓库后一次性加载库存 Map，产品下拉拼接库存数量文字，库存为 0 的产品禁用选择。

**Tech Stack:** Vue 2 + Element UI（前端）、Spring Boot + MyBatis Plus（后端）、MySQL 8（数据库）

---

## 文件清单

| 操作 | 文件路径 |
|------|---------|
| 修改 | `D:\AI\warehouse-backend\src\main\resources\sql\init.sql` |
| 修改 | `D:\AI\warehouse-backend\src\main\java\com\warehouse\entity\OutOrder.java` |
| 修改 | `D:\AI\warehouse-backend\src\main\java\com\warehouse\dto\OutOrderDTO.java` |
| 修改 | `D:\AI\warehouse-frontend\src\views\outOrder\Create.vue` |

---

## Task 1: 后端 — 添加 targetWarehouseId 字段

**Files:**
- Modify: `D:\AI\warehouse-backend\src\main\resources\sql\init.sql`
- Modify: `D:\AI\warehouse-backend\src\main\java\com\warehouse\entity\OutOrder.java`
- Modify: `D:\AI\warehouse-backend\src\main\java\com\warehouse\dto\OutOrderDTO.java`

- [ ] **Step 1: 修改 init.sql，在 out_order 表加 target_warehouse_id 列**

找到 `init.sql` 第 121-132 行的 `CREATE TABLE IF NOT EXISTS out_order`，在 `confirm_time` 行后加一行：

```sql
CREATE TABLE IF NOT EXISTS out_order (
    id                  BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_no            VARCHAR(30)  NOT NULL UNIQUE,
    warehouse_id        BIGINT NOT NULL,
    type                VARCHAR(20)  NOT NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    operator_id         BIGINT NOT NULL,
    remark              VARCHAR(500),
    deleted             SMALLINT NOT NULL DEFAULT 0,
    create_time         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirm_time        TIMESTAMP NULL,
    target_warehouse_id BIGINT NULL
);
```

- [ ] **Step 2: 修改 OutOrder.java，加 targetWarehouseId 字段**

在 `confirmTime` 字段后面加一行：

```java
private Long targetWarehouseId;
```

完整文件最终内容：

```java
package com.warehouse.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("out_order")
public class OutOrder {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String orderNo;
    private Long warehouseId;
    private String type;
    private String status;
    private Long operatorId;
    private String remark;
    @TableLogic
    private Integer deleted;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
    private LocalDateTime confirmTime;
    private Long targetWarehouseId;
}
```

- [ ] **Step 3: 修改 OutOrderDTO.java，加 targetWarehouseId 字段**

在 `remark` 字段后面加一行：

```java
private Long targetWarehouseId;
```

完整文件最终内容：

```java
package com.warehouse.dto;

import lombok.Data;
import javax.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

@Data
public class OutOrderDTO {
    @NotNull(message = "仓库不能为空")
    private Long warehouseId;
    @NotNull(message = "出库类型不能为空")
    private String type;
    private String remark;
    private Long targetWarehouseId;
    private List<Item> items;

    @Data
    public static class Item {
        private Long productId;
        private Integer qty;
        private BigDecimal price;
    }
}
```

- [ ] **Step 4: 构建后端**

在 `D:\AI\warehouse-backend` 目录运行：

```bash
mvn clean package -DskipTests
```

预期输出末尾有 `BUILD SUCCESS`，生成 `target/warehouse-0.0.1-SNAPSHOT.jar`

- [ ] **Step 5: 提交后端代码**

```bash
cd D:\AI\warehouse-backend
git add src/main/resources/sql/init.sql
git add src/main/java/com/warehouse/entity/OutOrder.java
git add src/main/java/com/warehouse/dto/OutOrderDTO.java
git commit -m "feat: add targetWarehouseId to OutOrder for transfer orders"
```

---

## Task 2: 部署后端到 VPS

**Files:** 无代码变更，仅部署操作

- [ ] **Step 1: 在生产数据库执行 ALTER TABLE**

SSH 登录 VPS（139.84.247.83），执行 SQL 加列：

```bash
ssh -i D:\AI\vps_key root@139.84.247.83
mysql -u warehouse -pWH_DB_Pass_2026! warehouse -e "ALTER TABLE out_order ADD COLUMN IF NOT EXISTS target_warehouse_id BIGINT NULL;"
```

预期输出：无报错

- [ ] **Step 2: 上传新 jar 包**

本地执行（将新 jar 上传到 VPS）：

```bash
scp -i D:\AI\vps_key D:\AI\warehouse-backend\target\warehouse-0.0.1-SNAPSHOT.jar root@139.84.247.83:/opt/warehouse.jar
```

- [ ] **Step 3: 重启后端服务**

```bash
ssh -i D:\AI\vps_key root@139.84.247.83 "systemctl restart warehouse.service && systemctl status warehouse.service"
```

预期输出：`Active: active (running)`

- [ ] **Step 4: 验证接口正常**

```bash
curl -s https://api.xiaocup.com/api/out-orders -H "Authorization: Bearer <任意有效token>" | head -c 200
```

预期：返回 JSON 数据（不是 500 错误）

---

## Task 3: 前端 — 改造 Create.vue

**Files:**
- Modify: `D:\AI\warehouse-frontend\src\views\outOrder\Create.vue`

- [ ] **Step 1: 完整替换 Create.vue**

将 `D:\AI\warehouse-frontend\src\views\outOrder\Create.vue` 内容替换为：

```vue
<template>
  <el-card>
    <div slot="header" style="display:flex;align-items:center;gap:8px;">
      <el-button icon="el-icon-arrow-left" @click="$router.back()" circle size="mini" />
      <span>新建出库单</span>
    </div>
    <el-form :model="form" :rules="currentRules" ref="form" label-width="100px" style="max-width:600px;">
      <el-form-item label="仓库" prop="warehouseId">
        <el-select v-model="form.warehouseId" placeholder="请选择仓库" style="width:100%;" @change="onWarehouseChange">
          <el-option v-for="w in warehouses" :key="w.id" :label="w.name" :value="w.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="出库类型" prop="type">
        <el-radio-group v-model="form.type" @change="onTypeChange">
          <el-radio label="SALE">销售出库</el-radio>
          <el-radio label="TRANSFER">调拨出库</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="form.type === 'TRANSFER'" label="目标仓库" prop="targetWarehouseId">
        <el-select v-model="form.targetWarehouseId" placeholder="请选择目标仓库" style="width:100%;">
          <el-option
            v-for="w in targetWarehouses"
            :key="w.id"
            :label="w.name"
            :value="w.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
    </el-form>
    <div style="margin:16px 0 8px;font-weight:bold;">出库明细</div>
    <el-tooltip :disabled="!!form.warehouseId" content="请先选择仓库" placement="top">
      <span>
        <el-button
          type="primary"
          size="small"
          icon="el-icon-plus"
          @click="addItem"
          :disabled="!form.warehouseId"
          style="margin-bottom:12px;"
        >添加商品</el-button>
      </span>
    </el-tooltip>
    <el-table :data="form.items" border>
      <el-table-column label="商品" min-width="260">
        <template slot-scope="{row}">
          <el-select v-model="row.productId" placeholder="选择商品" filterable style="width:100%;">
            <el-option
              v-for="p in products"
              :key="p.id"
              :label="productLabel(p)"
              :value="p.id"
              :disabled="(inventoryMap[p.id] || 0) === 0"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="数量" width="120">
        <template slot-scope="{row}"><el-input-number v-model="row.qty" :min="1" size="small" style="width:100%;" /></template>
      </el-table-column>
      <el-table-column label="单价" width="130">
        <template slot-scope="{row}"><el-input-number v-model="row.price" :min="0" :precision="2" size="small" style="width:100%;" /></template>
      </el-table-column>
      <el-table-column label="操作" width="70">
        <template slot-scope="{$index}"><el-button type="danger" size="mini" icon="el-icon-delete" circle @click="form.items.splice($index,1)" /></template>
      </el-table-column>
    </el-table>
    <div style="margin-top:20px;">
      <el-button type="primary" :loading="saving" @click="handleSave">保存草稿</el-button>
      <el-button @click="$router.back()">取消</el-button>
    </div>
  </el-card>
</template>

<script>
import { createOutOrder } from '../../api/outOrder'
import { getWarehouses } from '../../api/warehouse'
import { getProducts } from '../../api/product'
import { getInventory } from '../../api/inventory'

export default {
  data() {
    return {
      saving: false,
      warehouses: [],
      products: [],
      inventoryMap: {},
      form: { warehouseId: null, targetWarehouseId: null, type: 'SALE', remark: '', items: [] },
      baseRules: {
        warehouseId: [{ required: true, message: '请选择仓库' }],
        type: [{ required: true, message: '请选择类型' }]
      },
      transferRules: {
        warehouseId: [{ required: true, message: '请选择仓库' }],
        type: [{ required: true, message: '请选择类型' }],
        targetWarehouseId: [{ required: true, message: '请选择目标仓库', trigger: 'change' }]
      }
    }
  },
  computed: {
    currentRules() {
      return this.form.type === 'TRANSFER' ? this.transferRules : this.baseRules
    },
    targetWarehouses() {
      return this.warehouses.filter(w => w.id !== this.form.warehouseId)
    }
  },
  created() {
    getWarehouses().then(r => { this.warehouses = r.data })
    getProducts({ current: 1, size: 200 }).then(r => { this.products = r.data.records })
  },
  methods: {
    onWarehouseChange(warehouseId) {
      this.form.items = []
      this.form.targetWarehouseId = null
      this.inventoryMap = {}
      if (!warehouseId) return
      getInventory({ warehouseId, size: 500 }).then(r => {
        const map = {}
        const records = r.data.records || r.data || []
        records.forEach(item => { map[item.productId] = item.qty })
        this.inventoryMap = map
      })
    },
    onTypeChange(type) {
      if (type !== 'TRANSFER') {
        this.form.targetWarehouseId = null
      }
    },
    productLabel(p) {
      const stock = this.inventoryMap[p.id] !== undefined ? this.inventoryMap[p.id] : '—'
      return `${p.name}(${p.skuCode}) — 库存:${stock}件`
    },
    addItem() { this.form.items.push({ productId: null, qty: 1, price: 0 }) },
    handleSave() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.saving = true
        try {
          await createOutOrder(this.form)
          this.$message.success('出库单创建成功')
          this.$router.push('/out-orders')
        } finally {
          this.saving = false }
      })
    }
  }
}
</script>
```

- [ ] **Step 2: 验证页面正常显示**

在本地开发服务器中打开出库单新建页面：

```bash
cd D:\AI\warehouse-frontend
npm run serve
```

手动验证以下交互：
1. 选择仓库后，下方"添加商品"按钮变为可点击状态
2. 点击"调拨出库"，出现"目标仓库"下拉，且不含已选源仓库
3. 切回"销售出库"，目标仓库字段消失
4. 点击"添加商品"，产品下拉选项显示 `产品名(SKU) — 库存:N件`
5. 库存为 0 的产品显示为灰色且无法选择
6. 未选仓库时"添加商品"按钮置灰

- [ ] **Step 3: 提交前端代码**

```bash
cd D:\AI\warehouse-frontend
git add src/views/outOrder/Create.vue
git commit -m "feat: show inventory in product dropdown and add target warehouse for transfer orders"
```

---

## Task 4: 部署前端

**Files:** 无代码变更，仅部署操作

- [ ] **Step 1: 构建前端**

```bash
cd D:\AI\warehouse-frontend
npm run build
```

预期：`dist/` 目录生成，无报错

- [ ] **Step 2: 推送代码触发 Vercel 自动部署**

```bash
cd D:\AI\warehouse-frontend
git push origin main
```

Vercel 会自动检测到推送并重新部署，通常 1-2 分钟完成。

- [ ] **Step 3: 验证生产环境**

打开 https://xiaocup.com，进入"新建出库单"，重复 Task 3 Step 2 的手动验证步骤。