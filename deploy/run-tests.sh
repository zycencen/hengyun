#!/bin/bash
# ============================================================
# 恒运出行 — 后端 API 自动化测试脚本
# 在测试服务器执行: bash /opt/hengyun/test/deploy/run-tests.sh
# ============================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()    { echo -e "${GREEN}[✓]${NC} $1"; }
warn()   { echo -e "${YELLOW}[!]${NC} $1"; }
err()    { echo -e "${RED}[✗]${NC} $1"; }
header() { echo -e "\n${CYAN}════════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}════════════════════════════════════════${NC}"; }

TEST_DIR="/opt/hengyun/test"

header "1. 拉取最新代码"
cd $TEST_DIR
git pull
log "代码已更新"

header "2. 确认测试 API 运行状态"
if pm2 list 2>/dev/null | grep -q "hengyun-test-api.*online"; then
  log "测试 API 运行中 (端口 8081)"
else
  warn "测试 API 未运行，正在启动..."
  cd $TEST_DIR/server
  pm2 start ../deploy/ecosystem.config.js --only hengyun-test-api
  sleep 2
  log "测试 API 已启动"
fi

header "3. 安装测试依赖"
cd $TEST_DIR/server
npm install
log "依赖安装完成"

header "4. 执行 API 测试"
npm test

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}============================================${NC}"
  echo -e "${GREEN}  全部测试通过！${NC}"
  echo -e "${GREEN}============================================${NC}"
else
  echo -e "${RED}============================================${NC}"
  echo -e "${RED}  部分测试失败，请查看上方输出${NC}"
  echo -e "${RED}============================================${NC}"
fi

exit $EXIT_CODE
