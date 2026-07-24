#!/bin/bash
# ============================================================
# 恒运出行 — 本地打包并上传到服务器
# 在本地项目根目录执行: bash deploy/upload.sh user@server_ip
# ============================================================
set -e

GREEN='\033[0;32m'
NC='\033[0m'
log() { echo -e "${GREEN}[✓]${NC} $1"; }

SERVER=$1
if [ -z "$SERVER" ]; then
  echo "用法: bash deploy/upload.sh user@your-server-ip"
  echo "例如: bash deploy/upload.sh root@192.168.1.100"
  exit 1
fi

PACKAGE="hengyun-deploy-$(date +%Y%m%d_%H%M%S).tar.gz"

log "打包项目文件..."
tar -czf "/tmp/$PACKAGE" \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='test_*.json' \
  --exclude='generated-images' \
  --exclude='data.db' \
  --exclude='data.db-journal' \
  --exclude='data.db-wal' \
  --exclude='uploads' \
  app/ server/ deploy/ .gitignore

log "上传到服务器: $SERVER ..."
scp "/tmp/$PACKAGE" "$SERVER:/tmp/"

log "解压到测试环境..."
ssh "$SERVER" "
  sudo tar -xzf /tmp/$PACKAGE -C /opt/hengyun/test/
  rm /tmp/$PACKAGE
  echo '代码已部署到 /opt/hengyun/test/'
"

rm "/tmp/$PACKAGE"
log "上传完成！现在登录服务器执行: bash /opt/hengyun/test/deploy/deploy-test.sh"
