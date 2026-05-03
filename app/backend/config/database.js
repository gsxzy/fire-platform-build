module.exports = {
  getDbConfig() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    const config = {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'fire_platform',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    };
    if (process.env.DB_SOCKET_PATH) {
      config.socketPath = process.env.DB_SOCKET_PATH;
    } else {
      config.host = process.env.DB_HOST || 'localhost';
      config.port = process.env.DB_PORT || 3306;
    }
    // 生产环境强制验证
    if (isProduction && (!process.env.DB_USER || !process.env.DB_PASSWORD)) {
      console.error('[FATAL] 生产环境必须配置 DB_USER 和 DB_PASSWORD');
      process.exit(1);
    }
    return config;
  },
  getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!secret || secret === 'fire-platform-jwt-secret-dev-only') {
      if (isProduction) {
        console.error('[FATAL] 生产环境必须配置强随机 JWT_SECRET');
        process.exit(1);
      }
    }
    
    return secret || 'fire-platform-jwt-secret-dev-only';
  }
};
