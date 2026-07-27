# 恒运出行 (HengYun)

网约车出行平台：用户端（下单/支付/评价）+ 管理端（调度/车队/组织架构）。

## 怎么跑

```bash
# 后端（端口 8080）— SQLite, JWT, 企业微信推送
cd server && node src/index.js

# 前端（端口 5173）— Vite 代理 /uploads → localhost:8080
cd app && npm run dev
```

## 技术栈

React 19 + TypeScript + Vite + Tailwind CSS + Radix UI + shadcn/ui / Express.js + better-sqlite3

## 目录约定

```
app/src/          → 前端源码（pages/admin/ 管理端, pages/user/ 用户端, components/dispatch/ 调度排班）
app/src/api/      → API 接口模块（modules/admin.ts 管理端, modules/order.ts 订单等）
server/src/       → 后端源码（routes/admin.js 管理路由, db.js SQLite, wechat.js 企微通知, seed.js 种子数据）
server/data.db    → SQLite 数据库（单文件，自动迁移 schema）
```

## 开发约定

- **API 响应**：HTTP 200 统一返回，`code: 200` 成功 / `code: 400/403/404` 业务错误；仅认证失败返回 401
- **认证**：JWT，前端存 `localStorage("admin_token")`，请求头 `Authorization: Bearer <token>`
- **前端样式**：只用 shadcn/ui 组件 + Tailwind CSS，图标用 Lucide React，禁止引入其他 UI 库或 emoji
- **数据库**：better-sqlite3 同步 API，`server/src/db.js` 统一获取 `getDb()`
- **组织隔离**：管理端用 `buildOrgFilter(req.user, tableAlias)` 过滤数据，超级管理员 `org_id IS NULL` 看全部
- **开发验证码**：`888888`（万能码），管理端默认密码 `123456`

## 当前状态

管理端功能完整（仪表盘/订单/调度/合同/车辆/司机/车队/用户/财务/系统设置），用户端功能完整（包车/通勤/定制/发票/评价）。调度排班已支持企业微信通知司机。组织架构 + 角色权限数据隔离体系已建立。

## 线上地址

| 域名 | 用途 | 环境 |
|------|------|------|
| `go.hengyunbus.cn` | 用户端 | 正式 |
| `admin.hengyunbus.cn` | 管理端 | 正式 |
| `test.go.hengyunbus.cn` | 用户端 | 测试 |
| `test.admin.hengyunbus.cn` | 管理端 | 测试 |

服务器：180.76.236.243 (Ubuntu) / Nginx → PM2 (8082 正式, 8081 测试)

## 下一步

可能的扩展方向：真实短信验证码接入、微信支付、地图轨迹、司机端 App、HTTPS 证书。
