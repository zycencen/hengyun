# ============================================================
# 恒运出行 — 部署公共配置
# 部署前修改此文件中的域名
# ============================================================

# 正式域名（不含 http://）
# 当前实际部署: hengyunbus.cn, 四子域: go / admin / test.go / test.admin
DOMAIN="hengyunbus.cn"

# 测试子域名
TEST_DOMAIN="test.admin.hengyunbus.cn"

# 项目根目录
BASE_DIR="/opt/hengyun"

# 测试环境配置
TEST_PORT=8081
TEST_DIR="$BASE_DIR/test"

# 正式环境配置
PROD_PORT=8082
PROD_DIR="$BASE_DIR/prod"

# 备份目录
BACKUP_DIR="$BASE_DIR/backups"
