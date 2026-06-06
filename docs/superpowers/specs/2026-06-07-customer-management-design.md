# 客户管理功能设计文档

**日期**：2026-06-07  
**范围**：仓库管理系统新增客户档案、出库关联客户、出库行单价、客户历史订单

---

## 业务背景

陶瓷批发场景：每笔出库由老板根据客户要的数量临时定价，不存在固定阶梯价。系统需要：
1. 管理客户档案（增删改查）
2. 出库单关联到具体客户
3. 出库明细行可手动填写本次单价，并参考"上次给该客户的成交价"
4. 在客户详情页查看历史拿货记录和消费总额

原计划"阶梯价格表"取消，替换为"上次参考价"查询接口。

---

## 数据库变更

### 新增 customer 表

```sql
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

### out_order 加 customer_id

```sql
ALTER TABLE out_order ADD COLUMN customer_id BIGINT NULL AFTER warehouse_id;
```

`out_order_item.price` 字段已存在，无需改表，仅在前端暴露为可编辑输入框。

---

## 后端

### 新增文件（完全复用 Supplier 分层模式）

| 文件 | 说明 |
|------|------|
| `entity/Customer.java` | 对应 customer 表，字段含 deleted/createTime/updateTime |
| `mapper/CustomerMapper.java` | extends BaseMapper\<Customer\> |
| `dto/CustomerDTO.java` | 创建/更新入参（name/contact/phone/address/remark） |
| `service/CustomerService.java` | 分页查询（按 name 模糊）+ CRUD |
| `controller/CustomerController.java` | REST：GET/POST/PUT/{id}/DELETE/{id} /customers |

### 修改文件

| 文件 | 改动 |
|------|------|
| `entity/OutOrder.java` | 加 `customerId` 字段；加非持久化 `customerName` 用于返回 |
| `controller/OutOrderController.java` | 创建时接收 customerId；详情/列表返回 customerName |
| `controller/CustomerController.java` | 新增 `GET /customers/{id}/last-price?productId=` 和 `GET /customers/{id}/orders` 两个接口 |

### last-price 查询逻辑

```sql
SELECT oi.price
FROM out_order_item oi
JOIN out_order o ON oi.order_id = o.id
WHERE o.customer_id = #{customerId}
  AND oi.product_id = #{productId}
  AND o.deleted = 0
ORDER BY o.create_time DESC
LIMIT 1
```

---

## 前端

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/api/customer.js` | 封装 CRUD + last-price + orders 接口 |
| `src/views/customer/List.vue` | 客户列表页，表格 + 搜索 + 增删改弹窗（参照 supplier/List.vue） |
| `src/views/customer/Detail.vue` | 客户详情：基本信息 + 历史出库单表格 + 顶部显示总消费额 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `src/router/index.js` | 加 `/customers`、`/customers/:id` 两条路由 |
| `src/components/Layout/index.vue` | 侧边栏和底部抽屉加"客户管理"入口 |
| `src/views/outOrder/Create.vue` | 表头区域加客户选择下拉（el-select 远程搜索）；明细行加单价列（el-input-number），选定客户+商品后异步拉取参考价并填入，可覆盖 |
| `src/views/outOrder/Detail.vue` | 展示客户名；明细表格加单价、小计列 |

### 出库创建页单价交互

1. 用户选择客户（可选，不填也能下单）
2. 添加商品明细行后，若已选客户，自动调 `last-price` 接口填入参考价（灰色提示"参考上次：xx元"）
3. 用户可直接修改单价输入框
4. 提交时单价随明细一起写入 `out_order_item.price`

---

## 路由汇总

```
GET    /customers              分页列表（name 模糊搜索）
POST   /customers              新建
PUT    /customers/{id}         更新
DELETE /customers/{id}         软删除
GET    /customers/{id}/last-price?productId=  上次成交价
GET    /customers/{id}/orders  历史出库单列表 + 总消费额（仅统计 status=confirmed 的单，金额=Σ qty×price）
```

---

## 不在范围内

- 客户信用额度/欠款管理
- 客户分级/标签
- 固定阶梯价格表
- 客户对账单导出