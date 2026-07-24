# 恒运出行 — 服务器部署指南

## 架构概览

```
                     ┌─────────────────────────────────┐
                     │          Nginx (80/443)          │
                     │  your-domain.com → 正式前端      │
                     │  test.your-domain.com → 测试前端  │
                     └──────┬───────────────┬──────────┘
                            │ /api          │ /api
                     ┌──────▼──────┐  ┌─────▼───────┐
                     │ 正式后端      │  │ 测试后端     │
                     │ 端口 8082    │  │ 端口 8081    │
                     │ PM2: prod    │  │ PM2: test   │
                     └──────────────┘  └─────────────┘
                            │                  │
                     ┌──────▼──────┐  ┌─────▼───────┐
                     │ 正式数据库    │  │ 测试数据库    │
                     │ data.db     │  │ data.db     │
                     └──────────────┘  └─────────────┘
```

**两个环境完全隔离**：独立的端口、进程、数据库、上传文件。

## 目录结构（服务器上）

```
/opt/hengyun/
├── test/                     # 测试环境
│   ├── app/                  # 前端代码
│   ├── server/               # 后端代码
│   ├── data.db               # 测试数据库（独立）
│   └── uploads/              # 测试上传文件（独立）
├── prod/                     # 正式环境
│   ├── app/
│   ├── server/
│   ├── data.db               # 正式数据库（独立）
│   └── uploads/              # 正式上传文件（独立）
├── scripts/
│   └── sync-to-prod.sh       # 同步脚本（从 deploy/ 复制）
├── backups/                  # 自动备份
└── deploy/                   # 部署脚本（从项目复制）
    ├── ecosystem.config.js
    └── nginx-hengyun.conf
```

---

## 部署步骤

### 第一步：本地打包

在项目根目录执行（Git Bash 或 WSL）：

```bash
bash deploy/package.sh
```

会生成 `deploy/packages/hengyun-package-日期时间.tar.gz`

### 第二步：上传到服务器

**方式 A — SCP（推荐，Git Bash 可用）**：

```bash
scp deploy/packages/hengyun-package-*.tar.gz root@你的服务器IP:/tmp/
```

**方式 B — 云控制台文件上传**：

登录云控制台 → 找到文件管理 → 上传 `.tar.gz` 到 `/tmp/`

### 第三步：SSH 登录服务器

```bash
ssh root@你的服务器IP

# 或通过云控制台的"远程连接"/"登录"按钮进入终端
```

### 第四步：解压并初始化

```bash
# 创建目录并解压
mkdir -p /opt/hengyun/test
tar -xzf /tmp/hengyun-package-*.tar.gz -C /opt/hengyun/test/

# 运行初始化（安装 Node.js/Nginx/PM2，创建目录结构）
bash /opt/hengyun/test/deploy/setup-server.sh
```

### 第五步：配置域名

**⚠ 先改域名再继续！**

替换配置文件中的域名占位符（替换为你的实际域名）：

```bash
# 修改 Nginx 配置（将 your-domain.com 替换为实际域名）
sed -i 's/your-domain.com/你的域名.com/g' /opt/hengyun/test/deploy/nginx-hengyun.conf

# 部署 Nginx 配置
sudo cp /opt/hengyun/test/deploy/nginx-hengyun.conf /etc/nginx/conf.d/hengyun.conf
sudo nginx -t && sudo nginx -s reload
```

### 第六步：部署测试环境

```bash
bash /opt/hengyun/test/deploy/deploy-test.sh
```

### 第七步：部署正式环境（首次）

首次需要手动部署一次正式环境：

```bash
# 复制代码到正式环境
cp -r /opt/hengyun/test/server /opt/hengyun/prod/
cp -r /opt/hengyun/test/app /opt/hengyun/prod/

# 安装正式环境
cd /opt/hengyun/prod/server && npm install --production
cd /opt/hengyun/prod/app && npm install && npm run build

# 启动正式环境
cd /opt/hengyun
pm2 start test/deploy/ecosystem.config.js --only hengyun-prod-api
pm2 save
sudo nginx -s reload
```

### 第八步：配置 DNS 解析

登录域名管理后台，添加两条 A 记录：

| 类型 | 主机记录 | 记录值 |
|------|---------|--------|
| A    | `@`     | 你的服务器 IP |
| A    | `test`  | 你的服务器 IP |

---

## 日常使用

### 部署到测试环境

开发完成后，重新打包上传并执行：

```bash
# 本地打包 + 上传
bash deploy/package.sh
scp deploy/packages/hengyun-package-*.tar.gz root@服务器IP:/tmp/

# 服务器上
tar -xzf /tmp/hengyun-package-*.tar.gz -C /opt/hengyun/test/
bash /opt/hengyun/test/deploy/deploy-test.sh
```

### 测试通过 → 同步到正式环境

**方式一：管理后台操作（推荐）**

登录管理后台 → 左侧菜单「环境部署」→ 点击「同步测试环境 → 正式环境」

**方式二：SSH 命令行**

```bash
bash /opt/hengyun/scripts/sync-to-prod.sh
```

同步脚本会：
- 自动备份正式环境当前代码到 `/opt/hengyun/backups/`
- 复制测试环境源码（不含数据库/上传文件/配置）
- 重装依赖 + 构建前端
- 重启 PM2 进程

---

## 运维命令

```bash
# 查看服务状态
pm2 status

# 查看测试环境日志
pm2 logs hengyun-test-api

# 查看正式环境日志
pm2 logs hengyun-prod-api

# 重启服务
pm2 restart hengyun-test-api      # 仅重启测试
pm2 restart hengyun-prod-api      # 仅重启正式
pm2 restart all                   # 全部重启

# 重载 Nginx（修改配置后）
sudo nginx -t && sudo nginx -s reload

# 备份正式数据库
cp /opt/hengyun/prod/data.db /opt/hengyun/backups/prod_$(date +%Y%m%d).db
```

---

## 安全建议

1. **修改默认密码**：管理端默认管理员 `admin / 123456`，首次部署后尽快修改
2. **修改 JWT 密钥**：编辑 `/opt/hengyun/test/deploy/ecosystem.config.js` 中的 `JWT_SECRET`
3. **HTTPS**：建议配置 Let's Encrypt 免费 SSL 证书
   ```bash
   # Certbot 自动配置
   sudo apt install certbot python3-certbot-nginx  # Ubuntu/Debian
   sudo certbot --nginx -d your-domain.com -d test.your-domain.com
   ```
4. **防火墙**：仅开放 80/443 端口，后端端口 8081/8082 不对外开放
5. **数据库备份**：定期备份 `data.db`，建议加入 crontab
   ```bash
   # 每天凌晨 3 点自动备份
   0 3 * * * cp /opt/hengyun/prod/data.db /opt/hengyun/backups/prod_$(date +\%Y\%m\%d).db
   ```
