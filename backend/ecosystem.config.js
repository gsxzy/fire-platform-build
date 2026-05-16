/**
 * ═══════════════════════════════════════════════════════════════════
 * PM2 生产环境配置
 * 启动方式：pm2 start ecosystem.config.js
 * 重启方式：pm2 restart fire-platform
 * 日志查看：pm2 logs fire-platform
 * ═══════════════════════════════════════════════════════════════════
 */
module.exports = {
  apps: [{
    name: 'fire-platform',
    script: './dist/app.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5003,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5003,
    },
    // 资源限制
    max_memory_restart: '1G',
    // 自动重启策略
    min_uptime: '60s',
    max_restarts: 10,
    restart_delay: 5000,
    // 日志
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // 优雅关闭
    kill_timeout: 15000,
    listen_timeout: 10000,
    // 监视（生产环境关闭）
    watch: false,
    // 忽略文件
    ignore_watch: ['node_modules', 'logs', 'uploads', 'dist'],
    // 健康检查
    exp_backoff_restart_delay: 100,
  }],
};
