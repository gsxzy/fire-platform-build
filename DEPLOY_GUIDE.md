# 新致远智慧消防平台 - 生产部署指南（2026-05-15 更新版）

> 本文档配合本次代码清理（密码硬编码移除 + Migration 系统 + README 重写）使用。

---

## 一、本次变更摘要

### 1. 安全变更（必须部署）
- 后端所有敏感配置（JWT_SECRET、DB_PASSWORD、ZLM_SECRET 等）不再允许硬编码 fallback
- **未设置环境变量时，后端将拒绝启动**（`process.exit(1)`）
- AGENTS.md 中所有真实密码已替换为占位符

### 2. 架构变更
- 新增 Sequelize Migration 系统（`backend/sql/*.js`）
- 新增 `.sequelizerc` + `backend/src/config/migration.js`
- 后端 `package.json` 新增 `db:migrate` 等脚本

### 3. 配置变更
- `backend/.env.example` 全面重写，所有密码/密钥默认值清空
- `app/.env.example` 修复 `VITE_` 前缀缺失问题
- `docker-compose.yml` 改为引用 `.env` 文件

---

## 二、部署前检查清单

### 服务器环境
- [ ] Node.js >= 20.0.0
- [ ] MySQL 8.0 运行正常
- [ ] Redis 运行正常
- [ ] PM2 已安装（`npm install -g pm2`）
- [ ] Nginx 运行正常（宝塔面板）

### 生产环境变量检查
登录服务器，检查 `/opt/my-fire-api-new/.env`：

```bash
# 必须存在的变量（缺一不可，否则后端拒绝启动）
DB_PASSWORD=                    # ✅ 必须设置
JWT_SECRET=                     # ✅ 必须设置（建议 64 位随机字符串）
ZLM_SECRET=                     # ✅ 必须设置
HIKVISION_4G_API_KEY=           # ⚠️ 新增，海康4G设备接入必须
```

**快速生成强密钥：**
```bash
# 在服务器上执行
openssl rand -base64 48
# 输出如：xzy_fire_platform_secret_key_2024_change_in_production...
```

---

## 三、部署步骤

### 方式 A：源码在服务器上（推荐，有 git 仓库）

```bash
# 1. 进入后端目录
cd /opt/my-fire-api-new

# 2. 拉取最新代码（如果用 git）
git pull

# 3. 安装新依赖（sequelize-cli 等）
npm install

# 4. 构建后端
npm run build

# 5. 执行数据库迁移（新增 iot_telemetry 等表）
npx sequelize-cli db:migrate

# 6. 重启后端
pm2 restart fire-platform

# 7. 检查日志确认启动成功
tail -n 50 /opt/my-fire-api-new/logs/combined.log
```

**前端部署（如果前端源码也在服务器上）：**
```bash
cd /opt/fire-platform-build/app  # 或前端源码目录
npm install
npm run build

# 复制到 nginx 站点目录
cp -r dist/* /www/wwwroot/fire-platform/
```

**前端部署（如果前端源码只在本地）：**
```bash
# 本地构建后，用 SFTP/宝塔面板上传到 /www/wwwroot/fire-platform/
```

---

### 方式 B：使用宝塔面板（适合此项目）

#### 后端部署
1. **文件管理** → 进入 `/opt/my-fire-api-new`
2. 上传修改后的文件（或用 git 拉取）
3. **终端** → 执行：
   ```bash
   cd /opt/my-fire-api-new
   npm install
   npm run build
   npx sequelize-cli db:migrate
   pm2 restart fire-platform
   ```

#### 前端部署
1. 本地构建：`cd app && npm run build`
2. 用宝塔面板文件管理器上传 `app/dist/` 内容到 `/www/wwwroot/fire-platform/`
3. 或直接覆盖（注意保留 nginx 配置）

---

## 四、数据库迁移详情

本次新增迁移文件：

| 迁移文件 | 说明 |
|---------|------|
| `20240513000001-init-core-schema.js` | 初始核心表（已有表会自动跳过） |
| `20240513000002-fix-production-schema.js` | 补齐 fire_unit/fire_device 缺失字段 |
| `20240515000001-add-isnb-tables.js` | 新增 `ctwing_raw_log` + `iot_telemetry` |
| `20240515000002-optimize-indexes.js` | 设备管理复合索引优化 |

**查看迁移状态：**
```bash
cd /opt/my-fire-api-new
npx sequelize-cli db:migrate:status
```

**如需回滚：**
```bash
npx sequelize-cli db:migrate:undo          # 回滚最近一次
npx sequelize-cli db:migrate:undo:all      # 回滚全部（危险）
```

---

## 五、验证清单

部署完成后，依次验证：

| 验证项 | 操作 |
|-------|------|
| 后端启动 | `pm2 status` 查看 `fire-platform` 为 `online` |
| 后端日志 | `tail -f /opt/my-fire-api-new/logs/combined.log` 无报错 |
| API 健康 | `curl http://127.0.0.1:5003/health` 或浏览器访问 |
| 前端访问 | 浏览器访问 `http://124.223.35.58` 正常加载 |
| 登录测试 | 用 admin 账号登录成功 |
| 单位管理 | 新增单位 → 保存成功 → 列表回显正确 |
| 设备档案 | 新增设备 → 自动生成 device_no → 保存成功 |
| 视频查看 | 视频监控页面正常播放 |
| 数据库迁移 | `npx sequelize-cli db:migrate:status` 显示全部 `up` |

---

## 六、常见问题

### Q1: 后端启动后立即退出
```
[JWT] 错误：未设置 JWT_SECRET 环境变量，系统无法启动
```
**解决：** 编辑 `/opt/my-fire-api-new/.env`，确保 `JWT_SECRET`、`DB_PASSWORD`、`ZLM_SECRET`、`HIKVISION_4G_API_KEY` 都已设置。

### Q2: `npx sequelize-cli` 命令不存在
**解决：** 在 `/opt/my-fire-api-new` 目录下执行 `npm install`，确保 `sequelize-cli` 已安装到 `node_modules`。

### Q3: 数据库迁移报错 `Table already exists`
**解决：** 初始迁移使用 `createTable`，对已存在的表会报错。如果生产环境已有表，可以：
```bash
# 标记迁移为已执行（不实际运行 SQL）
npx sequelize-cli db:migrate --to 20240513000001-init-core-schema.js \
  --env production 2>/dev/null || true

# 然后执行后续迁移
npx sequelize-cli db:migrate
```

### Q4: 前端白屏或 404
**解决：** 检查 Nginx 配置，确保 `location /` 指向 `/www/wwwroot/fire-platform`，且 `try_files $uri $uri/ /index.html;` 已配置（单页应用需要）。

---

## 七、紧急回滚

如部署后出现问题：

```bash
# 1. 回滚数据库迁移
cd /opt/my-fire-api-new
npx sequelize-cli db:migrate:undo:all

# 2. 回滚代码（如果用 git）
git reset --hard HEAD~1
npm run build

# 3. 恢复备份（如果之前执行了 deploy-server.sh）
cd /opt/my-fire-api-new
tar xzf /opt/backup/backend_YYYYMMDD_HHMMSS.tar.gz

# 4. 重启
pm2 restart fire-platform
```

---

## 八、文件变更列表

本次修改的文件（可通过 `git diff --name-only` 查看）：

```
README.md
AGENTS.md
DEPLOY_GUIDE.md
deploy.sh
deploy-server.sh
app/.env.example
app/vite.config.ts
app/src/api/wvpClient.ts
app/src/hooks/useAMap.ts
app/src/sections/LoginPage.tsx
app/src/sections/FireControlRoomPage.tsx
app/src/components/AlarmPopup.tsx
backend/.env.example
backend/.sequelizerc
backend/docker-compose.yml
backend/package.json
backend/src/config/database.ts
backend/src/config/migration.js        (新增)
backend/src/utils/jwt.ts
backend/src/services/zlm.service.ts
backend/src/services/video.service.ts
backend/src/services/wvp.service.ts
backend/src/services/notification.service.ts
backend/src/controllers/hikvision4g.controller.ts
backend/src/controllers/iotProtocol.controller.ts
backend/src/seeders/index.ts
backend/sql/20240513000001-init-core-schema.js       (新增)
backend/sql/20240513000002-fix-production-schema.js  (新增)
backend/sql/20240515000001-add-isnb-tables.js        (新增)
backend/sql/20240515000002-optimize-indexes.js       (新增)
```
