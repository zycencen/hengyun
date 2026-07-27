# 恒运出行 (HengYun) — 管理端 + 用户端

网约车出行管理平台，包含用户端（下单/支付/评价）和管理端（订单调度/司机车队/财务系统）。

## 技术栈

- **前端**：React 19 + TypeScript + Vite + Tailwind CSS + Radix UI + shadcn/ui 组件
- **后端**：Express.js + better-sqlite3（SQLite）
- **认证**：JWT（用户端 7 天 / 管理端 24 小时）

## 项目结构

```
├── app/           # React 前端（Vite）
│   └── src/
│       ├── pages/         # 页面组件（admin/ 管理端 + user/ 用户端）
│       ├── components/    # 共享组件 + 业务组件（dispatch/ 调度排班）
│       ├── api/modules/   # API 接口模块
│       ├── hooks/         # 自定义 Hook
│       └── context/       # 全局状态
└── server/        # Express 后端
    └── src/
        ├── routes/        # 路由（admin/users/orders/cars/fleets 等）
        ├── db.js          # SQLite 数据库初始化与迁移
        ├── wechat.js      # 企业微信通知 API（司机排班推送）
        └── seed.js        # 种子数据
```

## 快速启动

```bash
# 后端（端口 8080）
cd server && node src/index.js

# 前端（端口 5173）
cd app && npm run dev
```

## 关键特性

- 用户端：包车/上下班车/定制包车三大业务入口
- 管理端：仪表盘、订单管理、调度管理、合同管理、车辆管理、司机管理、车队管理、用户管理、财务管理、系统设置（组织架构/角色权限）
- 调度排班：排班表 CRUD、Excel 导入导出、多选通知司机（企业微信推送）
- 数据隔离：组织架构 + 角色权限体系
- 车队入口：多车队独立入口，自定义 Tab 和 Banner

## 开发说明

- 开发环境万能验证码：`888888`
- 管理端默认密码：`123456`
- 数据库文件：`server/data.db`

## 线上地址

| 域名 | 用途 | 环境 |
|------|------|------|
| `go.hengyunbus.cn` | 用户端 | 正式 |
| `admin.hengyunbus.cn` | 管理端 | 正式 |
| `test.go.hengyunbus.cn` | 用户端 | 测试 |
| `test.admin.hengyunbus.cn` | 管理端 | 测试 |

详见 [部署文档](../deploy/README.md)。
