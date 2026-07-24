#!/bin/bash
# ============================================================
# 恒运出行 — 本地打包脚本
# 在项目根目录执行，生成可上传的部署包
# 用法: bash deploy/package.sh
# ============================================================
set -e

GREEN='\033[0;32m'
NC='\033[0m'
log() { echo -e "${GREEN}[✓]${NC} $1"; }

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PKG="hengyun-package-$TIMESTAMP.tar.gz"
OUTPUT="deploy/packages/$PKG"

mkdir -p deploy/packages

log "打包项目文件..."
tar -czf "$OUTPUT" \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='test_*.json' \
  --exclude='generated-images' \
  --exclude='data.db' \
  --exclude='data.db-journal' \
  --exclude='data.db-wal' \
  --exclude='deploy/packages' \
  --exclude='.codebuddy' \
  --exclude='.pnpm-store' \
  app/ server/ deploy/ .gitignore

log "打包完成: $OUTPUT"
echo ""
echo "下一步: 将 $OUTPUT 上传到服务器"
echo "  - 方式1: scp $OUTPUT user@server:/tmp/"
echo "  - 方式2: 通过云控制台上传文件"
echo ""
echo "上传后在服务器执行:"
echo "  mkdir -p /opt/hengyun/test"
echo "  tar -xzf /tmp/$PKG -C /opt/hengyun/test/"
echo "  bash /opt/hengyun/test/deploy/setup-server.sh"
echo "  bash /opt/hengyun/test/deploy/deploy-test.sh"
