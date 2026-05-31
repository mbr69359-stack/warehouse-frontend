# 仓储管理系统 — 前端

基于 Vue 2 + Element UI 的仓储管理系统前端，提供完整的仓库业务操作界面。

## 技术栈

- Vue 2
- Element UI
- Vue Router
- Axios
- Webpack（Vue CLI）

## 功能模块

- 登录 / 权限控制
- 仪表盘
- 仓库管理
- 商品 & 分类管理
- 供应商管理
- 入库单 / 出库单
- 库存查询 & 盘点
- 用户 & 角色管理

## 本地运行

### 前置条件

- Node.js 16+

### 步骤

1. 克隆仓库

```bash
git clone https://github.com/your-username/warehouse-frontend.git
cd warehouse-frontend
```

2. 安装依赖

```bash
npm install
```

3. 配置后端地址

```bash
cp .env.example .env.development.local
# 编辑文件，填写本地后端地址
```

4. 启动开发服务器

```bash
npm run serve
```

访问 http://localhost:8080

## 生产构建

```bash
# 修改 .env.production 中的后端地址
npm run build
# dist/ 目录即为构建产物，可部署到 Vercel / Nginx 等
```

## 环境变量说明

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `VUE_APP_API_BASE` | 后端 API 地址 | `http://localhost:8080/api` |

## 部署到 Vercel

1. 将仓库导入 Vercel
2. 在 Vercel 项目设置中添加环境变量 `VUE_APP_API_BASE`，值为后端 URL
3. 触发重新部署

## License

MIT
