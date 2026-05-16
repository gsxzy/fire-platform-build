/**
 * ═══════════════════════════════════════════════════════════════════
 * PM2 测试环境配置
 * 端口 3000 + 5202/5203，与生产旧版（5003 + 5200/5201）不冲突
 * 启动方式：pm2 start ecosystem.test.config.js
 * ═══════════════════════════════════════════════════════════════════
 */
module.exports = {
  apps: [{
    name: 'fire-platform-test',
    script: './dist/app.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    // 资源限制
    max_memory_restart: '1G',
    // 自动重启策略
    min_uptime: '60s',
    max_restarts: 10,
    restart_delay: 5000,
    // 日志（与生产区分）
    log_file: './logs-test/combined.log',
    out_file: './logs-test/out.log',
    error_file: './logs-test/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // 优雅关闭
    kill_timeout: 15000,
    listen_timeout: 10000,
    // 监视（测试环境可开启便于调试）
    watch: false,
    // 忽略文件
    ignore_watch: ['node_modules', 'logs-test', 'uploads', 'dist'],
    // 指数退避重启
    exp_backoff_restart_delay: 100,
  }],
};
