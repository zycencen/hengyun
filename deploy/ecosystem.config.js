// ============================================================
// PM2 进程管理配置 — 恒运出行双环境
// 用法: pm2 start deploy/ecosystem.config.js
// ============================================================

module.exports = {
  apps: [
    // ──── 测试环境 ────
    {
      name: 'hengyun-test-api',
      cwd: '/opt/hengyun/test/server',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'test',
        PORT: 8081,
        JWT_SECRET: 'hengyun_test_secret_2026',
        DB_PATH: '/opt/hengyun/test/data.db',
      },
      error_file: '/opt/hengyun/test/logs/api-error.log',
      out_file: '/opt/hengyun/test/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_memory_restart: '500M',
      restart_delay: 3000,
    },

    // ──── 正式环境 ────
    {
      name: 'hengyun-prod-api',
      cwd: '/opt/hengyun/prod/server',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 8082,
        JWT_SECRET: 'hengyun_prod_secret_2026',
        DB_PATH: '/opt/hengyun/prod/data.db',
      },
      error_file: '/opt/hengyun/prod/logs/api-error.log',
      out_file: '/opt/hengyun/prod/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_memory_restart: '500M',
      restart_delay: 3000,
    },
  ],
}
