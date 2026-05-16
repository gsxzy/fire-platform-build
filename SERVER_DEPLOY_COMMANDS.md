# 服务器端部署命令清单（复制粘贴执行）

> 以下命令需在服务器 `root` 用户下执行，假设后端源码在 `/opt/my-fire-api-new`，前端构建产物需上传到 `/www/wwwroot/fire-platform`。

---

## 第一步：备份（30秒）

```bash
mkdir -p /opt/backup
# 备份后端
tar czf /opt/backup/backend_$(date +%Y%m%d_%H%M%S).tar.gz -C /opt/my-fire-api-new dist sql .env package.json 2>/dev/null || true
# 备份前端
tar czf /opt/backup/frontend_$(date +%Y%m%d_%H%M%S).tar.gz -C /www/wwwroot/fire-platform . 2>/dev/null || true
echo "备份完成"
```

---

## 第二步：更新后端代码并构建（2-5分钟）

```bash
cd /opt/my-fire-api-new

# 如果用 git
git pull

# 安装依赖（会自动安装 sequelize-cli）
npm install

# 构建
npm run build
```

---

## 第三步：数据库迁移（10秒）

```bash
cd /opt/my-fire-api-new

# 执行所有迁移
npx sequelize-cli db:migrate --env production

# 检查状态（应显示 4 个 up）
npx sequelize-cli db:migrate:status
```

---

## 第四步：重启后端服务（5秒）

```bash
pm2 restart fire-platform

# 或者如果进程不存在
# cd /opt/my-fire-api-new && pm2 start dist/app.js --name fire-platform --env production
```

---

## 第五步：检查后端启动状态（10秒）

```bash
# 查看进程状态
pm2 status

# 查看最近日志
tail -n 30 /opt/my-fire-api-new/logs/combined.log

# 健康检查（如有 /health 接口）
curl -s http://127.0.0.1:5003/health || echo "请检查日志"
```

---

## 第六步：部署前端（如果前端源码在服务器上）

```bash
# 假设前端源码在 /opt/fire-platform-build/app
cd /opt/fire-platform-build/app
npm install
npm run build

# 复制到 nginx 目录
rm -rf /www/wwwroot/fire-platform/*
cp -r dist/* /www/wwwroot/fire-platform/
```

**如果前端源码只在本地：**
本地执行 `npm run build` 后，用 SFTP/宝塔面板将 `app/dist/` 内容上传到 `/www/wwwroot/fire-platform/`。

---

## 第七步：验证

| 验证项 | 命令/操作 |
|--------|----------|
| 后端进程 | `pm2 status` → `fire-platform` 为 `online` |
| 后端日志 | `tail -f /opt/my-fire-api-new/logs/combined.log` 无报错 |
| 前端访问 | 浏览器打开 `http://124.223.35.58` |
| 登录测试 | 用 admin 账号登录 |
| 数据库迁移 | `npx sequelize-cli db:migrate:status` 显示全部 `up` |

---

## 紧急回滚

```bash
# 停止服务
pm2 stop fire-platform

# 恢复后端（替换 BACKUP_FILE 为实际备份文件名）
cd /opt/my-fire-api-new
tar xzf /opt/backup/backend_YYYYMMDD_HHMMSS.tar.gz

# 重启
pm2 restart fire-platform
```

---

## 常见问题速查

**Q: 后端启动后立即退出，日志显示 `[JWT] 错误：未设置 JWT_SECRET`**
```bash
# 编辑 .env，确保以下变量已设置
vi /opt/my-fire-api-new/.env
# DB_PASSWORD=xxx
# JWT_SECRET=xxx
# ZLM_SECRET=xxx
# HIKVISION_4G_API_KEY=xxx
```

**Q: `npx sequelize-cli` 不存在**
```bash
cd /opt/my-fire-api-new
npm install
# 或单独安装
npm install sequelize-cli --save
```

**Q: 迁移报错 `Table already exists`**
```bash
# 标记初始迁移为已执行（不修改表）
npx sequelize-cli db:seed --seed 20240513000001-init-core-schema.js 2>/dev/null || true
# 然后重新执行迁移
npx sequelize-cli db:migrate
```
