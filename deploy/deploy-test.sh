#!/bin/bash
# ============================================================
# 恒运出行 — 部署到测试环境
# 在本地项目根目录执行: bash deploy/deploy-test.sh [server_ip]
# 或者先上传代码到服务器后在 /opt/hengyun 执行
# ============================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

BASE=/opt/hengyun
TEST_DIR=$BASE/test
BRANCH=${1:-develop}

echo "============================================"
echo "  恒运出行 — 部署测试环境"
echo "============================================"
echo ""

# ---------- 1. 验证目录 ----------
if [ ! -d "$BASE" ]; then
  err "项目根目录 $BASE 不存在，请先运行 setup-server.sh"
fi

# 将部署脚本复制到统一位置
log "复制管理脚本到 $BASE/scripts/..."
mkdir -p $BASE/scripts
cp $TEST_DIR/deploy/sync-to-prod.sh $BASE/scripts/
cp $TEST_DIR/deploy/ecosystem.config.js $BASE/ || true
cp $TEST_DIR/deploy/nginx-hengyun.conf $BASE/ || true
# 如果 scripts 存在 deploy/ 下的脚本也要同步
cp $TEST_DIR/deploy/deploy-test.sh $BASE/scripts/ 2>/dev/null || true
chmod +x $BASE/scripts/*.sh

# ---------- 2. 安装后端依赖 ----------
log "安装测试环境后端依赖..."
cd $TEST_DIR/server
npm install --production 2>&1 | tail -1 || err "后端依赖安装失败"

# ---------- 3. 构建前端 ----------
log "构建测试环境前端..."
cd $TEST_DIR/app
# 设置生产环境 API 地址
echo "VITE_API_BASE_URL=/api" > .env.production
npm install 2>&1 | tail -1 || err "前端依赖安装失败"
npm run build 2>&1 | tail -3 || err "前端构建失败"
log "前端构建完成 → $TEST_DIR/app/dist/"

# ---------- 4. 初始化数据库（首次部署时） ----------
if [ ! -f "$TEST_DIR/data.db" ]; then
  log "首次部署，初始化测试数据库..."
  cd $TEST_DIR/server
  # 运行 seed 脚本初始化管理员账号
  node -e "
    const { getDb, initDb } = require('./src/db');
    initDb();
    console.log('测试数据库初始化完成');
  " || warn "数据库初始化遇到问题，请手动检查"
else
  log "测试数据库已存在，跳过初始化"
fi

# ---------- 5. 确保上传目录存在 ----------
mkdir -p $TEST_DIR/uploads

# ---------- 6. 重启 PM2 ----------
log "重启测试环境 API 服务..."
if pm2 list 2>/dev/null | grep -q "hengyun-test-api"; then
  pm2 restart hengyun-test-api
else
  # 首次启动
  cd $BASE
  pm2 start deploy/ecosystem.config.js --only hengyun-test-api
fi

# ---------- 7. 重载 Nginx ----------
log "重载 Nginx..."
sudo nginx -t 2>&1 | grep -q "successful" && sudo nginx -s reload || warn "Nginx 配置有误，请检查"

# ---------- 8. 保存 PM2 进程列表 ----------
pm2 save 2>/dev/null || true

echo ""
echo "============================================"
echo "  测试环境部署完成！"
echo "============================================"
echo ""
echo "  后端 API: http://127.0.0.1:8081/api"
echo "  前端访问: http://test.your-domain.com"
echo ""
echo "  管理端默认账号: admin / 123456"
echo "  万能验证码: 888888"
echo ""
echo "  查看日志: pm2 logs hengyun-test-api"
echo "  查看状态: pm2 status"
echo "============================================"
