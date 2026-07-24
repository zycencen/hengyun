#!/bin/bash
# ============================================================
# 恒运出行 — 服务器一键初始化脚本
# 安装 Node.js 20 / Nginx / PM2 / Git，创建目录结构
# ============================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo "============================================"
echo "  恒运出行 — 服务器环境初始化"
echo "============================================"
echo ""

# ---------- 1. 检测系统 ----------
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
else
  err "无法识别操作系统"
fi
log "检测到系统: $OS"

# ---------- 2. 安装 Node.js 20 ----------
if ! command -v node &>/dev/null; then
  log "安装 Node.js 20..."
  if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "tencentos" ]; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo yum install -y nodejs
  else
    warn "未知系统，请手动安装 Node.js 20: https://nodejs.org/"
  fi
else
  log "Node.js 已安装: $(node -v)"
fi

# ---------- 3. 安装 Nginx ----------
if ! command -v nginx &>/dev/null; then
  log "安装 Nginx..."
  if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo apt-get update && sudo apt-get install -y nginx
  elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "tencentos" ]; then
    sudo yum install -y nginx
  fi
  sudo systemctl enable nginx
else
  log "Nginx 已安装: $(nginx -v 2>&1)"
fi

# ---------- 4. 安装 PM2 ----------
if ! command -v pm2 &>/dev/null; then
  log "安装 PM2..."
  sudo npm install -g pm2
else
  log "PM2 已安装: $(pm2 -v)"
fi

# ---------- 5. 创建项目目录 ----------
BASE=/opt/hengyun
log "创建项目目录: $BASE"

sudo mkdir -p $BASE/test/{app,server,uploads,logs}
sudo mkdir -p $BASE/prod/{app,server,uploads,logs}
sudo mkdir -p $BASE/scripts

# 创建 .env 文件占位
echo 'NODE_ENV=test
PORT=8081
JWT_SECRET=hengyun_test_secret_2026
DB_PATH=/opt/hengyun/test/data.db' | sudo tee $BASE/test/.env > /dev/null

echo 'NODE_ENV=production
PORT=8082
JWT_SECRET=hengyun_prod_secret_2026
DB_PATH=/opt/hengyun/prod/data.db' | sudo tee $BASE/prod/.env > /dev/null

# ---------- 6. 权限 ----------
sudo chown -R $USER:$USER $BASE
log "目录权限已设置"

# ---------- 7. 开放防火墙端口 ----------
if command -v firewall-cmd &>/dev/null; then
  sudo firewall-cmd --permanent --add-port=80/tcp  2>/dev/null || true
  sudo firewall-cmd --permanent --add-port=443/tcp 2>/dev/null || true
  sudo firewall-cmd --reload 2>/dev/null || true
  log "防火墙端口已开放 (80/443)"
elif command -v ufw &>/dev/null; then
  sudo ufw allow 80/tcp  2>/dev/null || true
  sudo ufw allow 443/tcp 2>/dev/null || true
  log "UFW 端口已开放 (80/443)"
fi

echo ""
echo "============================================"
echo "  服务器初始化完成！"
echo "============================================"
echo ""
echo "  项目根目录: /opt/hengyun"
echo "  测试环境:   /opt/hengyun/test/  (端口 8081)"
echo "  正式环境:   /opt/hengyun/prod/  (端口 8082)"
echo ""
echo "  下一步: 运行 deploy/deploy-test.sh 部署代码"
echo "============================================"
