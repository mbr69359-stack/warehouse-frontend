# 客户管理功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增客户档案 CRUD、出库单关联客户、明细行单价录入（含上次参考价）、客户历史订单详情页。

**Architecture:** 后端完全复用 Supplier 分层模式（Entity → Mapper → Service → Controller），CustomerMapper 承载两条自定义 SQL 查询（last-price / total-amount）。前端新增 customer/List.vue 和 customer/Detail.vue，修改 outOrder/Create.vue 加客户选择下拉和参考价逻辑，outOrder/Detail.vue 和 List.vue 显示客户名。

**Tech Stack:** Spring Boot + MyBatis-Plus + Lombok（后端）；Vue 2 + Element-UI（前端）

---

## 文件清单

### 后端新增
| 文件 | 职责 |
|------|------|
| `entity/Customer.java` | customer 表映射 |
| `mapper/CustomerMapper.java` | BaseMapper + 2条自定义查询 |
| `dto/CustomerDTO.java` | 新建/更新入参 |
| `vo/CustomerOrdersVO.java` | 客户历史订单接口返回体 |
| `service/CustomerService.java` | 接口定义 |
| `service/impl/CustomerServiceImpl.java` | 业务实现 |
| `controller/CustomerController.java` | REST 端点 |
| `src/main/resources/sql/migrate_customer.sql` | DB 迁移脚本 |

### 后端修改
| 文件 | 改动 |
|------|------|
| `entity/OutOrder.java` | 加 customerId、非持久化 customerName |
| `dto/OutOrderDTO.java` | 加 customerId |
| `service/impl/OutOrderServiceImpl.java` | create 写 customerId；getById/page 填 customerName |

### 前端新增
| 文件 | 职责 |
|------|------|
| `src/api/customer.js` | 所有客户接口封装 |
| `src/views/customer/List.vue` | 客户列表 + CRUD 弹窗 |
| `src/views/customer/Detail.vue` | 客户详情 + 历史订单 + 总消费额 |

### 前端修改
| 文件 | 改动 |
|------|------|
| `src/router/index.js` | 加 /customers 和 /customers/:id |
| `src/components/Layout/Sidebar.vue` | 加"客户管理"菜单项 |
| `src/views/outOrder/Create.vue` | 加客户选择 + 参考价逻辑 |
| `src/views/outOrder/Detail.vue` | 加客户名显示 |
| `src/views/outOrder/List.vue` | 加客户名列 |

---

## Task 1: 数据库迁移脚本

**Files:**
- Create: `D:\AI\warehouse-backend\src\main\resources\sql\migrate_customer.sql`

- [ ] **Step 1: 创建迁移脚本**

```sql
-- migrate_customer.sql
ALTER TABLE out_order ADD COLUMN IF NOT EXISTS customer_id BIGINT NULL AFTER warehouse_id;

CREATE TABLE IF NOT EXISTS customer (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  contact     VARCHAR(50),
  phone       VARCHAR(20),
  address     VARCHAR(200),
  remark      VARCHAR(500),
  status      INT DEFAULT 1,
  deleted     INT DEFAULT 0,
  create_time DATETIME,
  update_time DATETIME
);
```

- [ ] **Step 2: 在生产数据库执行**

用 Git Bash（SSH）或直接在 VPS 执行：
```bash
mysql -u warehouse -p'WH_DB_Pass_2026!' warehouse < /path/to/migrate_customer.sql
```

或在 VPS 上直接执行 SQL：
```bash
ssh -i D:\AI\vps_key root@139.84.247.83
mysql -u warehouse -p'WH_DB_Pass_2026!' warehouse -e "
ALTER TABLE out_order ADD COLUMN IF NOT EXISTS customer_id BIGINT NULL AFTER warehouse_id;
CREATE TABLE IF NOT EXISTS customer (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL, contact VARCHAR(50), phone VARCHAR(20),
  address VARCHAR(200), remark VARCHAR(500), status INT DEFAULT 1,
  deleted INT DEFAULT 0, create_time DATETIME, update_time DATETIME
);"
```

- [ ] **Step 3: 确认表结构**

```bash
mysql -u warehouse -p'WH_DB_Pass_2026!' warehouse -e "SHOW COLUMNS FROM customer; SHOW COLUMNS FROM out_order LIKE 'customer_id';"
```

Expected: customer 表有 10 列，out_order 有 customer_id 列。

---

## Task 2: Customer 实体层（Entity + Mapper + DTO + VO）

**Files:**
- Create: `src/main/java/com/warehouse/entity/Customer.java`
- Create: `src/main/java/com/warehouse/mapper/CustomerMapper.java`
- Create: `src/main/java/com/warehouse/dto/CustomerDTO.java`
- Create: `src/main/java/com/warehouse/vo/CustomerOrdersVO.java`

- [ ] **Step 1: 创建 Customer.java**

```java
package com.warehouse.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("customer")
public class Customer {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String contact;
    private String phone;
    private String address;
    private String remark;
    private Integer status;
    @TableLogic
    private Integer deleted;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}
```

- [ ] **Step 2: 创建 CustomerMapper.java**

```java
package com.warehouse.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.warehouse.entity.Customer;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import java.math.BigDecimal;

@Mapper
public interface CustomerMapper extends BaseMapper<Customer> {

    @Select("SELECT oi.price FROM out_order_item oi " +
            "JOIN out_order o ON oi.order_id = o.id " +
            "WHERE o.customer_id = #{customerId} AND oi.product_id = #{productId} " +
            "AND o.deleted = 0 ORDER BY o.create_time DESC LIMIT 1")
    BigDecimal selectLastPrice(@Param("customerId") Long customerId,
                               @Param("productId") Long productId);

    @Select("SELECT COALESCE(SUM(oi.actual_qty * oi.price), 0) " +
            "FROM out_order_item oi JOIN out_order o ON oi.order_id = o.id " +
            "WHERE o.customer_id = #{customerId} AND o.status = 'CONFIRMED' AND o.deleted = 0")
    BigDecimal selectTotalAmount(@Param("customerId") Long customerId);
}
```

- [ ] **Step 3: 创建 CustomerDTO.java**

```java
package com.warehouse.dto;

import lombok.Data;
import javax.validation.constraints.NotBlank;

@Data
public class CustomerDTO {
    private Long id;
    @NotBlank(message = "客户名称不能为空")
    private String name;
    private String contact;
    private String phone;
    private String address;
    private String remark;
    private Integer status;
}
```

- [ ] **Step 4: 创建 CustomerOrdersVO.java**

```java
package com.warehouse.vo;

import com.warehouse.entity.Customer;
import com.warehouse.entity.OutOrder;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class CustomerOrdersVO {
    private Customer customer;
    private BigDecimal totalAmount;
    private List<OutOrder> orders;
}
```

- [ ] **Step 5: 编译验证**

```bash
cd D:\AI\warehouse-backend
mvn compile -q
```

Expected: BUILD SUCCESS，无报错。

- [ ] **Step 6: 提交**

```bash
cd D:\AI\warehouse-backend
git add src/main/java/com/warehouse/entity/Customer.java
git add src/main/java/com/warehouse/mapper/CustomerMapper.java
git add src/main/java/com/warehouse/dto/CustomerDTO.java
git add src/main/java/com/warehouse/vo/CustomerOrdersVO.java
git add src/main/resources/sql/migrate_customer.sql
git commit -m "feat: add Customer entity, mapper, DTO, VO and migration SQL"
```

---

## Task 3: CustomerService + CustomerServiceImpl

**Files:**
- Create: `src/main/java/com/warehouse/service/CustomerService.java`
- Create: `src/main/java/com/warehouse/service/impl/CustomerServiceImpl.java`

- [ ] **Step 1: 创建 CustomerService.java（接口）**

```java
package com.warehouse.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.warehouse.dto.CustomerDTO;
import com.warehouse.entity.Customer;
import com.warehouse.vo.CustomerOrdersVO;
import java.math.BigDecimal;

public interface CustomerService {
    Page<Customer> page(int current, int size, String name);
    void create(CustomerDTO dto);
    void update(CustomerDTO dto);
    void delete(Long id);
    BigDecimal getLastPrice(Long customerId, Long productId);
    CustomerOrdersVO getOrders(Long customerId);
}
```

- [ ] **Step 2: 创建 CustomerServiceImpl.java**

```java
package com.warehouse.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.warehouse.common.BusinessException;
import com.warehouse.dto.CustomerDTO;
import com.warehouse.entity.Customer;
import com.warehouse.entity.OutOrder;
import com.warehouse.mapper.CustomerMapper;
import com.warehouse.mapper.OutOrderMapper;
import com.warehouse.service.CustomerService;
import com.warehouse.vo.CustomerOrdersVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerServiceImpl implements CustomerService {

    private final CustomerMapper customerMapper;
    private final OutOrderMapper outOrderMapper;

    @Override
    public Page<Customer> page(int current, int size, String name) {
        LambdaQueryWrapper<Customer> q = new LambdaQueryWrapper<Customer>()
                .like(StringUtils.hasText(name), Customer::getName, name)
                .orderByDesc(Customer::getCreateTime);
        return customerMapper.selectPage(new Page<>(current, size), q);
    }

    @Override
    public void create(CustomerDTO dto) {
        Customer c = new Customer();
        c.setName(dto.getName());
        c.setContact(dto.getContact());
        c.setPhone(dto.getPhone());
        c.setAddress(dto.getAddress());
        c.setRemark(dto.getRemark());
        c.setStatus(dto.getStatus() != null ? dto.getStatus() : 1);
        customerMapper.insert(c);
    }

    @Override
    public void update(CustomerDTO dto) {
        Customer c = customerMapper.selectById(dto.getId());
        if (c == null) throw new BusinessException("客户不存在");
        c.setName(dto.getName());
        c.setContact(dto.getContact());
        c.setPhone(dto.getPhone());
        c.setAddress(dto.getAddress());
        c.setRemark(dto.getRemark());
        if (dto.getStatus() != null) c.setStatus(dto.getStatus());
        customerMapper.updateById(c);
    }

    @Override
    public void delete(Long id) {
        customerMapper.deleteById(id);
    }

    @Override
    public BigDecimal getLastPrice(Long customerId, Long productId) {
        return customerMapper.selectLastPrice(customerId, productId);
    }

    @Override
    public CustomerOrdersVO getOrders(Long customerId) {
        List<OutOrder> orders = outOrderMapper.selectList(
                new LambdaQueryWrapper<OutOrder>()
                        .eq(OutOrder::getCustomerId, customerId)
                        .orderByDesc(OutOrder::getCreateTime));
        BigDecimal totalAmount = customerMapper.selectTotalAmount(customerId);
        Customer self = customerMapper.selectById(customerId);
        if (self != null) {
            orders.forEach(o -> o.setCustomerName(self.getName()));
        }
        CustomerOrdersVO vo = new CustomerOrdersVO();
        vo.setCustomer(self);
        vo.setTotalAmount(totalAmount != null ? totalAmount : BigDecimal.ZERO);
        vo.setOrders(orders);
        return vo;
    }
}
```

- [ ] **Step 3: 编译验证**

```bash
cd D:\AI\warehouse-backend
mvn compile -q
```

Expected: BUILD SUCCESS。

- [ ] **Step 4: 提交**

```bash
git add src/main/java/com/warehouse/service/CustomerService.java
git add src/main/java/com/warehouse/service/impl/CustomerServiceImpl.java
git commit -m "feat: add CustomerService with CRUD, last-price and orders query"
```

---

## Task 4: CustomerController

**Files:**
- Create: `src/main/java/com/warehouse/controller/CustomerController.java`

- [ ] **Step 1: 创建 CustomerController.java**

```java
package com.warehouse.controller;

import com.warehouse.common.PageResult;
import com.warehouse.common.Result;
import com.warehouse.dto.CustomerDTO;
import com.warehouse.entity.Customer;
import com.warehouse.service.CustomerService;
import com.warehouse.vo.CustomerOrdersVO;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@Validated
@RestController
@RequestMapping("/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    public Result<PageResult<Customer>> page(
            @RequestParam(defaultValue = "1") int current,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String name) {
        return Result.success(PageResult.of(customerService.page(current, size, name)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Result<Void> create(@RequestBody @Validated CustomerDTO dto) {
        customerService.create(dto);
        return Result.success();
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Result<Void> update(@PathVariable Long id, @RequestBody CustomerDTO dto) {
        dto.setId(id);
        customerService.update(dto);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Result<Void> delete(@PathVariable Long id) {
        customerService.delete(id);
        return Result.success();
    }

    @GetMapping("/{id}/last-price")
    public Result<BigDecimal> lastPrice(@PathVariable Long id,
                                        @RequestParam Long productId) {
        return Result.success(customerService.getLastPrice(id, productId));
    }

    @GetMapping("/{id}/orders")
    public Result<CustomerOrdersVO> orders(@PathVariable Long id) {
        return Result.success(customerService.getOrders(id));
    }
}
```

- [ ] **Step 2: 编译验证**

```bash
cd D:\AI\warehouse-backend
mvn compile -q
```

Expected: BUILD SUCCESS。

- [ ] **Step 3: 提交**

```bash
git add src/main/java/com/warehouse/controller/CustomerController.java
git commit -m "feat: add CustomerController with CRUD, last-price and orders endpoints"
```

---

## Task 5: OutOrder 关联 customerId

**Files:**
- Modify: `src/main/java/com/warehouse/entity/OutOrder.java`
- Modify: `src/main/java/com/warehouse/dto/OutOrderDTO.java`
- Modify: `src/main/java/com/warehouse/service/impl/OutOrderServiceImpl.java`

- [ ] **Step 1: 修改 OutOrder.java，加两个字段**

在 `exchangeNo` 字段后追加：

```java
    private Long customerId;

    @TableField(exist = false)
    private String customerName;
```

完整文件结果：
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
    private Long customerId;
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
    private String exchangeNo;

    @TableField(exist = false)
    private String customerName;
}
```

- [ ] **Step 2: 修改 OutOrderDTO.java，加 customerId**

在 `remark` 字段后追加：
```java
    private Long customerId;
```

- [ ] **Step 3: 修改 OutOrderServiceImpl.java**

**3a — 注入 CustomerMapper（在类字段列表最后追加）：**
```java
    private final CustomerMapper customerMapper;
```

**3b — create() 方法中，在 `order.setTargetWarehouseId(dto.getTargetWarehouseId());` 后追加：**
```java
        order.setCustomerId(dto.getCustomerId());
```

**3c — getById() 方法，填充 customerName（替换整个方法）：**
```java
    @Override
    public OutOrder getById(Long id) {
        OutOrder order = outOrderMapper.selectById(id);
        if (order == null) throw new BusinessException("出库单不存在");
        if (order.getCustomerId() != null) {
            Customer c = customerMapper.selectById(order.getCustomerId());
            if (c != null) order.setCustomerName(c.getName());
        }
        return order;
    }
```

**3d — page() 方法，批量填充 customerName（在 `return outOrderMapper.selectPage(...)` 之前插入，或直接替换整个方法）：**
```java
    @Override
    public Page<OutOrder> page(int current, int size, String status, Long warehouseId, String startDate, String endDate) {
        LocalDateTime start = startDate != null ? LocalDate.parse(startDate).atStartOfDay() : null;
        LocalDateTime end = endDate != null ? LocalDate.parse(endDate).atTime(23, 59, 59) : null;
        LambdaQueryWrapper<OutOrder> q = new LambdaQueryWrapper<OutOrder>()
                .eq(status != null, OutOrder::getStatus, status)
                .eq(warehouseId != null, OutOrder::getWarehouseId, warehouseId)
                .ge(start != null, OutOrder::getCreateTime, start)
                .le(end != null, OutOrder::getCreateTime, end)
                .orderByDesc(OutOrder::getCreateTime);
        Page<OutOrder> result = outOrderMapper.selectPage(new Page<>(current, size), q);
        List<Long> cids = result.getRecords().stream()
                .filter(o -> o.getCustomerId() != null)
                .map(OutOrder::getCustomerId).distinct()
                .collect(java.util.stream.Collectors.toList());
        if (!cids.isEmpty()) {
            java.util.Map<Long, String> nameMap = customerMapper.selectBatchIds(cids)
                    .stream().collect(java.util.stream.Collectors.toMap(
                            com.warehouse.entity.Customer::getId,
                            com.warehouse.entity.Customer::getName));
            result.getRecords().forEach(o -> {
                if (o.getCustomerId() != null) o.setCustomerName(nameMap.get(o.getCustomerId()));
            });
        }
        return result;
    }
```

**3e — 在文件顶部 import 区加（如果尚未存在）：**
```java
import com.warehouse.entity.Customer;
import com.warehouse.mapper.CustomerMapper;
```

- [ ] **Step 4: 编译验证**

```bash
cd D:\AI\warehouse-backend
mvn compile -q
```

Expected: BUILD SUCCESS。

- [ ] **Step 5: 提交**

```bash
git add src/main/java/com/warehouse/entity/OutOrder.java
git add src/main/java/com/warehouse/dto/OutOrderDTO.java
git add src/main/java/com/warehouse/service/impl/OutOrderServiceImpl.java
git commit -m "feat: link out_order to customer, populate customerName in responses"
```

---

## Task 6: 触发后端部署

- [ ] **Step 1: 推送后端代码，触发自动部署**

```bash
cd D:\AI\warehouse-backend
git push origin main
```

- [ ] **Step 2: 等待约 2 分钟，验证接口可用**

```bash
curl https://api.xiaocup.com/api/customers
```

Expected: `{"code":200,"data":{"records":[],"total":0,...}}`

---

## Task 7: 前端 API + 路由 + 侧边栏

**Files:**
- Create: `src/api/customer.js`
- Modify: `src/router/index.js`
- Modify: `src/components/Layout/Sidebar.vue`

- [ ] **Step 1: 创建 src/api/customer.js**

```js
import request from './request'
export const getCustomers = params => request.get('/customers', { params })
export const createCustomer = data => request.post('/customers', data)
export const updateCustomer = (id, data) => request.put(`/customers/${id}`, data)
export const deleteCustomer = id => request.delete(`/customers/${id}`)
export const getLastPrice = (customerId, productId) =>
  request.get(`/customers/${customerId}/last-price`, { params: { productId } })
export const getCustomerOrders = id => request.get(`/customers/${id}/orders`)
```

- [ ] **Step 2: 修改 src/router/index.js，在 children 数组中 suppliers 路由后面插入**

```js
      { path: 'customers', component: () => import('../views/customer/List.vue') },
      { path: 'customers/:id', component: () => import('../views/customer/Detail.vue') },
```

- [ ] **Step 3: 修改 src/components/Layout/Sidebar.vue，在 suppliers 菜单项后面插入**

```html
    <el-menu-item index="/customers"><i class="el-icon-user"></i><span slot="title">客户管理</span></el-menu-item>
```

- [ ] **Step 4: 提交**

```bash
cd D:\AI\warehouse-frontend
git add src/api/customer.js src/router/index.js src/components/Layout/Sidebar.vue
git commit -m "feat: add customer API, routes and sidebar entry"
```

---

## Task 8: 客户列表页 customer/List.vue

**Files:**
- Create: `src/views/customer/List.vue`

- [ ] **Step 1: 创建 src/views/customer/List.vue**

```vue
<template>
  <el-card>
    <div style="margin-bottom:16px;display:flex;gap:12px;">
      <el-input v-model="query.name" placeholder="客户名称" clearable style="width:200px;" @clear="loadData" />
      <el-button type="primary" icon="el-icon-search" @click="loadData">搜索</el-button>
      <el-button type="success" icon="el-icon-plus" @click="openForm()">新增客户</el-button>
    </div>
    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="客户名称" />
      <el-table-column prop="contact" label="联系人" width="100" />
      <el-table-column prop="phone" label="电话" width="130" />
      <el-table-column prop="address" label="地址" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="90">
        <template slot-scope="{row}">
          <el-tag :type="row.status===1?'success':'info'">{{ row.status===1?'合作中':'已停止' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template slot-scope="{row}">
          <el-button size="mini" @click="$router.push('/customers/'+row.id)">详情</el-button>
          <el-button size="mini" type="primary" @click="openForm(row)">编辑</el-button>
          <el-button size="mini" type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination style="margin-top:16px;text-align:right;" background layout="total, prev, pager, next"
      :total="total" :current-page="query.current" @current-change="p=>{query.current=p;loadData()}" />

    <el-dialog :title="form.id?'编辑客户':'新增客户'" :visible.sync="dialogVisible" width="500px">
      <el-form :model="form" :rules="rules" ref="form" label-width="80px">
        <el-form-item label="客户名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="联系人"><el-input v-model="form.contact" /></el-form-item>
        <el-form-item label="电话"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="地址"><el-input v-model="form.address" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">合作中</el-radio>
            <el-radio :label="0">已停止</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible=false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </div>
    </el-dialog>
  </el-card>
</template>

<script>
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../../api/customer'
export default {
  data() {
    return {
      list: [], total: 0, loading: false, dialogVisible: false,
      query: { current: 1, size: 10, name: '' },
      form: { id: null, name: '', contact: '', phone: '', address: '', remark: '', status: 1 },
      rules: { name: [{ required: true, message: '请输入客户名称' }] }
    }
  },
  created() { this.loadData() },
  methods: {
    async loadData() {
      this.loading = true
      const r = await getCustomers(this.query).finally(() => { this.loading = false })
      this.list = r.data.records
      this.total = r.data.total
    },
    openForm(row) {
      this.form = row
        ? { ...row }
        : { id: null, name: '', contact: '', phone: '', address: '', remark: '', status: 1 }
      this.dialogVisible = true
    },
    handleSave() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        if (this.form.id) await updateCustomer(this.form.id, this.form)
        else await createCustomer(this.form)
        this.$message.success('保存成功')
        this.dialogVisible = false
        this.loadData()
      })
    },
    async handleDelete(id) {
      await this.$confirm('确认删除？', '提示', { type: 'warning' })
      await deleteCustomer(id)
      this.$message.success('删除成功')
      this.loadData()
    }
  }
}
</script>
```

- [ ] **Step 2: 提交**

```bash
cd D:\AI\warehouse-frontend
git add src/views/customer/List.vue
git commit -m "feat: add customer list page with CRUD"
```

---

## Task 9: 出库创建页加客户选择 + 参考价

**Files:**
- Modify: `src/views/outOrder/Create.vue`

- [ ] **Step 1: 在 `<script>` import 区顶部加一行**

在 `import { getPendingDamageRecords, getPendingCount } from '../../api/damageRecord'` 后追加：

```js
import { getCustomers, getLastPrice } from '../../api/customer'
```

- [ ] **Step 2: 在 data() return 对象中，`saving: false` 后追加**

```js
      customers: [],
      customersLoading: false,
```

- [ ] **Step 3: 在 form 对象中加 customerId 字段**

将 `form: { warehouseId: null, targetWarehouseId: null, type: 'SALE', remark: '', items: [] }` 改为：

```js
      form: { warehouseId: null, targetWarehouseId: null, type: 'SALE', remark: '', customerId: null, items: [] },
```

- [ ] **Step 4: 在 created() 钩子中追加客户加载**

将 `created()` 改为：

```js
  created() {
    getWarehouses().then(r => { this.warehouses = r.data })
    getCustomers({ current: 1, size: 200 }).then(r => { this.customers = r.data.records || [] })
  },
```

- [ ] **Step 5: 在 methods 中追加 fetchLastPrice 方法**

在 `addItem()` 方法后追加：

```js
    async fetchLastPrice(row) {
      if (!this.form.customerId || !row.productId) return
      const r = await getLastPrice(this.form.customerId, row.productId)
      const price = r.data
      if (price != null) {
        row.price = Number(price)
        row._lastPriceTip = `参考上次：¥${Number(price).toFixed(2)}`
      } else {
        row._lastPriceTip = null
      }
    },
```

- [ ] **Step 6: 修改 onProductChange 方法，调用 fetchLastPrice**

将现有的 `onProductChange(row)` 改为：

```js
    onProductChange(row) {
      const max = this.inventoryMap[row.productId] || 0
      if (row.qty > max) row.qty = max
      this.fetchLastPrice(row)
    },
```

- [ ] **Step 7: 修改 addItem 方法，新增 _lastPriceTip 字段**

将 `addItem()` 改为：

```js
    addItem() { this.form.items.push({ productId: null, qty: 1, price: 0, _lastPriceTip: null }) },
```

- [ ] **Step 8: 在模板中加客户选择（在备注 el-form-item 后面插入）**

在 `<el-form-item label="备注">...</el-form-item>` 后面插入：

```html
      <el-form-item label="客户">
        <el-select v-model="form.customerId" placeholder="选择客户（可选）" clearable filterable style="width:100%;">
          <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </el-form-item>
```

- [ ] **Step 9: 在明细表格的单价列加参考价提示**

找到现有的单价列：
```html
        <el-table-column label="单价" width="130">
          <template slot-scope="{row}">
            <el-input-number v-model="row.price" :min="0" :precision="2" size="small" style="width:100%;" />
          </template>
        </el-table-column>
```

替换为：
```html
        <el-table-column label="单价" width="160">
          <template slot-scope="{row}">
            <el-input-number v-model="row.price" :min="0" :precision="2" size="small" style="width:100%;" />
            <div v-if="row._lastPriceTip" style="font-size:11px;color:#909399;margin-top:2px;">{{ row._lastPriceTip }}</div>
          </template>
        </el-table-column>
```

- [ ] **Step 10: 验证页面正常渲染（本地 dev server）**

```bash
cd D:\AI\warehouse-frontend
npm run serve
```

打开 http://localhost:8080/out-orders/create，确认：
1. 表单中出现"客户"下拉
2. 选择客户 + 添加商品行后，单价列出现"参考上次：¥xx"提示（如有历史数据）
3. 提交后不报错

- [ ] **Step 11: 提交**

```bash
git add src/views/outOrder/Create.vue
git commit -m "feat: add customer selection and last-price hint to outbound order create"
```

---

## Task 10: 出库列表页和详情页显示客户名

**Files:**
- Modify: `src/views/outOrder/List.vue`
- Modify: `src/views/outOrder/Detail.vue`

- [ ] **Step 1: 修改 outOrder/List.vue，在状态列后插入客户名列**

在 `<el-table-column prop="status" label="状态" ...>` 后面插入：

```html
        <el-table-column prop="customerName" label="客户" width="120" show-overflow-tooltip>
          <template slot-scope="{row}">{{ row.customerName || '—' }}</template>
        </el-table-column>
```

- [ ] **Step 2: 修改 outOrder/Detail.vue，在 el-descriptions 中加客户项**

找到：
```html
      <el-descriptions-item label="备注" :span="2">{{ order.remark || '—' }}</el-descriptions-item>
```

在它前面插入：
```html
      <el-descriptions-item label="客户">{{ order.customerName || '—' }}</el-descriptions-item>
```

- [ ] **Step 3: 提交**

```bash
cd D:\AI\warehouse-frontend
git add src/views/outOrder/List.vue src/views/outOrder/Detail.vue
git commit -m "feat: show customerName in outbound order list and detail"
```

---

## Task 11: 客户详情页 customer/Detail.vue

**Files:**
- Create: `src/views/customer/Detail.vue`

- [ ] **Step 1: 创建 src/views/customer/Detail.vue**

`getCustomerOrders` 接口已在后端的 `getOrders()` 中包含 `customer` 字段（Task 3），直接使用。

```vue
<template>
  <el-card v-loading="loading">
    <div slot="header" style="display:flex;align-items:center;gap:8px;">
      <el-button icon="el-icon-arrow-left" @click="$router.back()" circle size="mini" />
      <span>客户详情 — {{ customer.name }}</span>
    </div>

    <el-descriptions :column="2" border style="margin-bottom:24px;">
      <el-descriptions-item label="客户名称">{{ customer.name }}</el-descriptions-item>
      <el-descriptions-item label="联系人">{{ customer.contact || '—' }}</el-descriptions-item>
      <el-descriptions-item label="电话">{{ customer.phone || '—' }}</el-descriptions-item>
      <el-descriptions-item label="地址">{{ customer.address || '—' }}</el-descriptions-item>
      <el-descriptions-item label="备注" :span="2">{{ customer.remark || '—' }}</el-descriptions-item>
    </el-descriptions>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <span style="font-weight:bold;">历史出库单</span>
      <span style="font-size:15px;">
        总消费额（已确认）：
        <b style="color:#409EFF;font-size:18px;">¥{{ totalAmount }}</b>
      </span>
    </div>

    <el-table :data="orders" border stripe>
      <el-table-column prop="orderNo" label="出库单号" width="200" />
      <el-table-column prop="type" label="类型" width="100">
        <template slot-scope="{row}">{{ typeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="90">
        <template slot-scope="{row}">
          <el-tag :type="row.status==='CONFIRMED'?'success':'warning'">
            {{ row.status==='CONFIRMED'?'已确认':'草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="170" />
      <el-table-column label="操作" width="80">
        <template slot-scope="{row}">
          <el-button size="mini" @click="$router.push('/out-orders/'+row.id)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script>
import { getCustomerOrders } from '../../api/customer'
export default {
  data() {
    return { customer: {}, orders: [], totalAmount: '0.00', loading: false }
  },
  created() { this.loadData() },
  methods: {
    typeLabel(type) {
      const map = { SALE: '销售出库', TRANSFER: '调拨出库', DAMAGE_OUT: '损坏出库', REPLACEMENT_OUT: '补发出库' }
      return map[type] || type || '—'
    },
    async loadData() {
      this.loading = true
      try {
        const r = await getCustomerOrders(this.$route.params.id)
        const vo = r.data
        this.customer = vo.customer || {}
        this.orders = vo.orders || []
        this.totalAmount = Number(vo.totalAmount || 0).toFixed(2)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
```

- [ ] **Step 2: 提交**

```bash
cd D:\AI\warehouse-frontend
git add src/views/customer/Detail.vue
git commit -m "feat: add customer detail page with order history and total amount"
```

---

## Task 12: 前端部署 + 回归验证

- [ ] **Step 1: 推送前端触发 Vercel 部署**

```bash
cd D:\AI\warehouse-frontend
git push origin main
```

- [ ] **Step 2: 等待 Vercel 部署完成（约 1 分钟），访问验证**

打开 https://xiaocup.com，逐项验证：
- [ ] 侧边栏出现"客户管理"入口
- [ ] 客户列表页可以新增、编辑、删除客户
- [ ] 新建出库单时可选择客户，明细行单价可编辑
- [ ] 选定客户 + 商品后若有历史订单，显示"参考上次：¥xx"
- [ ] 出库单列表显示客户名列
- [ ] 出库单详情显示客户名
- [ ] 客户详情页显示历史订单和总消费额

- [ ] **Step 3: 后端部署也确认正常**

```bash
curl https://api.xiaocup.com/api/customers
```

Expected: 返回 200 + 客户列表数据。