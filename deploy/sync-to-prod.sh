#!/bin/bash
# ============================================================
# 恒运出行 — 测试环境 → 正式环境同步
# 将测试环境的代码、数据库同步到正式环境
# 用法: bash /opt/hengyun/scripts/sync-to-prod.sh
# ============================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

BASE=/opt/hengyun
TEST_DIR=$BASE/test
PROD_DIR=$BASE/prod

echo "============================================"
echo "  恒运出行 — 测试 → 正式环境同步"
echo "============================================"
echo ""
warn "⚠ 即将把测试环境代码同步到正式环境！"
echo ""
echo "  同步内容:"
echo "  - 后端源码 (server/src/)"
echo "  - 前端源码 (app/src/)"
echo "  - 前端静态资源 (app/public/，如有)"
echo "  - package.json"
echo ""
echo "  不同步的内容（保持正式环境独立）:"
echo "  - data.db（数据库）"
echo "  - uploads/（上传文件）"
echo "  - .env（环境配置）"
echo ""
read -p "确认同步？输入 yes 继续: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  warn "已取消同步"
  exit 0
fi

TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

# ---------- 1. 备份正式环境 ----------
log "备份正式环境当前代码..."
mkdir -p $BASE/backups
tar -czf "$BASE/backups/prod_backup_$TIMESTAMP.tar.gz" \
  -C $PROD_DIR \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=logs \
  --exclude=uploads \
  . 2>/dev/null || warn "备份失败（可能正式环境尚无代码），继续执行"
log "备份保存至: $BASE/backups/prod_backup_$TIMESTAMP.tar.gz"

# ---------- 2. 同步代码（复制源码，不复制数据库和上传文件） ----------
log "同步代码到正式环境..."

# 后端
rsync -av --delete \
  --exclude='node_modules/' \
  --exclude='data.db' \
  --exclude='data.db-journal' \
  --exclude='data.db-wal' \
  --exclude='uploads/' \
  --exclude='logs/' \
  --exclude='.env' \
  "$TEST_DIR/server/" "$PROD_DIR/server/" 2>&1 | tail -3

# 前端
rsync -av --delete \
  --exclude='node_modules/' \
  --exclude='dist/' \
  "$TEST_DIR/app/" "$PROD_DIR/app/" 2>&1 | tail -3

log "代码同步完成"

# ---------- 3. 安装正式环境依赖 ----------
log "安装正式环境后端依赖..."
cd $PROD_DIR/server
npm install --production 2>&1 | tail -1

# ---------- 4. 构建正式环境前端 ----------
log "构建正式环境前端..."
cd $PROD_DIR/app
echo "VITE_API_BASE_URL=/api" > .env.production
npm install 2>&1 | tail -1
npm run build 2>&1 | tail -3
log "正式环境前端构建完成"

# ---------- 5. 初始化正式数据库（如果不存在） ----------
if [ ! -f "$PROD_DIR/data.db" ]; then
  log "首次同步，初始化正式数据库..."
  cd $PROD_DIR/server
  node -e "
    const { getDb } = require('./src/db');
    getDb();
    console.log('正式数据库初始化完成');
  " || warn "数据库初始化失败，请手动检查"
else
  log "正式数据库已存在，保留不动"
fi

mkdir -p $PROD_DIR/uploads

# ---------- 6. 重启正式环境 ----------
log "重启正式环境 API 服务..."
PM2=$(which pm2 2>/dev/null || echo "npx pm2")
if $PM2 list 2>/dev/null | grep -q "hengyun-prod-api"; then
  $PM2 restart hengyun-prod-api
else
  cd $BASE
  $PM2 start deploy/ecosystem.config.js --only hengyun-prod-api
fi

$PM2 save 2>/dev/null || true

# ---------- 7. 重载 Nginx ----------
log "重载 Nginx..."
sudo nginx -t 2>&1 | grep -q "successful" && sudo nginx -s reload || warn "Nginx 重载失败"

echo ""
echo "============================================"
echo "  同步完成！"
echo "============================================"
echo ""
echo "  正式用户端: http://go.hengyunbus.cn"
echo "  正式管理端: http://admin.hengyunbus.cn"
echo "  测试用户端: http://test.go.hengyunbus.cn"
echo "  测试管理端: http://test.admin.hengyunbus.cn"
echo ""
echo "  备份文件: $BASE/backups/prod_backup_$TIMESTAMP.tar.gz"
echo ""
echo "  查看日志: pm2 logs hengyun-prod-api"
echo "============================================"
