# 新版后端 - 测试环境部署手册

## 一、本地打包准备（Windows 开发机）

### 1. 确认编译通过

```powershell
cd "D:\新致远智慧消防平台\fire-platform-build\backend"
npm run build
```

确认 `tsc` 零错误。

### 2. 准备部署包

```powershell
# 创建部署目录
New-Item -ItemType Directory -Force -Path "D:\deploy\backend-test"

# 复制必要文件（不包含 node_modules，太大了）
Copy-Item -Path "dist" -Destination "D:\deploy\backend-test\dist" -Recurse -Force
Copy-Item -Path "scripts" -Destination "D:\deploy\backend-test\scripts" -Recurse -Force
Copy-Item -Path "ecosystem.test.config.js" -Destination "D:\deploy\backend-test\" -Force
Copy-Item -Path ".env.test" -Destination "D:\deploy\backend-test\.env" -Force
Copy-Item -Path "package.json" -Destination "D:\deploy\backend-test\" -Force

# 压缩
Compress-Archive -Path "D:\deploy\backend-test\*" -DestinationPath "D:\deploy\backend-test.zip" -Force
```

> **注意**：`node_modules` 不打包，直接在服务器上使用已有的 `node_modules`（或重新离线安装）。如果服务器已有旧版 `node_modules`，建议直接复用，因为依赖没有变化。

---

## 二、服务器端操作（OpenCloudOS 9.4）

### 1. 克隆生产数据库为测试库

```bash
ssh root@124.223.35.58

# 备份生产库
mysqldump -u root -p fire_platform > /backup/fire_platform_$(date +%Y%m%d_%H%M%S).sql

# 创建测试库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS fire_platform_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 导入数据
mysql -u root -p fire_platform_test < /backup/fire_platform_xxx.sql
```

### 2. 上传新版后端

```bash
# 在 Windows 上执行
scp D:\deploy\backend-test.zip root@124.223.35.58:/opt/

# 在服务器上解压
ssh root@124.223.35.58
cd /opt
unzip -o backend-test.zip -d my-fire-api-test
```

### 3. 准备 node_modules

**方案 A：复用旧版 node_modules（推荐，最简单）**

```bash
cd /opt/my-fire-api-test
ln -s /opt/my-fire-api/node_modules ./node_modules
```

**方案 B：全新离线安装（如果旧版 node_modules 不兼容）**

```bash
# 在 Windows 开发机打包完整 node_modules
cd "D:\新致远智慧消防平台\fire-platform-build\backend"
Compress-Archive -Path "node_modules" -DestinationPath "D:\deploy\node_modules.zip" -Force

# 上传到服务器
scp D:\deploy\node_modules.zip root@124.223.35.58:/opt/my-fire-api-test/

# 在服务器解压
ssh root@124.223.35.58
cd /opt/my-fire-api-test
unzip -o node_modules.zip
```

### 4. 配置环境变量

```bash
cd /opt/my-fire-api-test
cp .env.test .env

# 编辑 .env，确认以下关键配置
vim .env
```

**必须检查项**：
- `DB_SOCKET_PATH=/tmp/mysql.sock`（如果生产用 socket）
- `DB_NAME=fire_platform_test`
- `DB_USER` / `DB_PASSWORD`（与生产一致）
- `REDIS_HOST=127.0.0.1`
- `GB26875_PORT=5202`（避免与旧版 5200 冲突）
- `FSCN8001_PORT=5203`（避免与旧版 5201 冲突）
- `ZLM_API_URL`、`ZLM_SECRET`、`CAM1_IP` 等视频配置
- `WVP_PRO_URL`（如有 WVP，配置后自动切换 WVP 模式）

### 5. 运行数据迁移脚本

```bash
cd /opt/my-fire-api-test
npx tsx scripts/migration.ts
```

**预期输出**：
```
[Migration] 检查并准备旧版同名表...
[Migration] 旧 fire_device 已重命名为 fire_device_legacy
[Migration] 旧 fire_alarm 已重命名为 fire_alarm_legacy
[Migration] departments → sys_department 完成: N 条
...
✅ 数据迁移全部完成
```

**如果报错**：检查 `logs-test/` 目录下的错误日志，或直接在终端查看输出。

### 6. 验证迁移结果

```bash
mysql -u root -p fire_platform_test -e "
SHOW TABLES LIKE '%legacy%';
SELECT COUNT(*) AS device_count FROM fire_device;
SELECT COUNT(*) AS alarm_count FROM fire_alarm;
SELECT COUNT(*) AS user_count FROM sys_user;
SELECT username, LEFT(password, 20) AS password_prefix FROM sys_user LIMIT 3;
SELECT COUNT(*) FROM fire_device WHERE unit_id IS NULL;
SELECT alarm_no, COUNT(*) FROM fire_alarm GROUP BY alarm_no HAVING COUNT(*) > 1;
"
```

**验证标准**：
- `legacy` 表存在
- 新表有数据且数量合理
- `sys_user.password` 以 `$2a$` 开头（bcrypt）
- `fire_device` 无 `unit_id IS NULL`
- `fire_alarm` 无重复 `alarm_no`

---

## 三、启动测试服务

### 1. 首次启动（前台运行，观察日志）

```bash
cd /opt/my-fire-api-test
node dist/app.js
```

**观察输出**：
- `[DB] Tables synchronized (alter=false)` ✅
- `[WS] Server initialized` ✅
- `[GB26875] TCP listening 0.0.0.0:5202` ✅
- `[FSCN8001] TCP listening 0.0.0.0:5203` ✅
- `[DeviceHeartbeat] 设备心跳检测已启动` ✅

按 `Ctrl+C` 停止。

### 2. PM2 启动

```bash
cd /opt/my-fire-api-test
pm2 start ecosystem.test.config.js
pm2 save

# 查看状态
pm2 status
pm2 logs fire-platform-test
```

---

## 四、功能验证清单

### API 接口测试

```bash
# 1. 健康检查
curl http://124.223.35.58:3000/api/health

# 2. 登录（用旧版账号，密码不变）
curl -X POST http://124.223.35.58:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 3. 视频设备列表
curl http://124.223.35.58:3000/api/video/devices

# 4. 取流（ZLM 模式）
curl -X POST http://124.223.35.58:3000/api/video/stream \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"CAM-001"}'

# 5. 数据库统计（Stub 接口）
curl http://124.223.35.58:3000/api/db/stats
```

### 前端验证

1. 修改前端 `.env` 的 `VITE_API_BASE_URL=http://124.223.35.58:3000/api`
2. 重新构建前端（或临时用代理）
3. 验证以下页面：
   - [ ] 登录页面（密码验证通过）
   - [ ] 首页大屏（数据加载正常）
   - [ ] 设备管理（fire_device 数据正确）
   - [ ] 告警中心（fire_alarm 数据正确，能确认/处理）
   - [ ] 视频监控（ZLM/WVP 取流正常）
   - [ ] 协议设备（GB26875/FSCN8001 设备在线状态）

### WebSocket 验证

1. 打开浏览器控制台
2. 连接 `ws://124.223.35.58:3000/ws?token=YOUR_JWT_TOKEN`
3. 触发一条告警（如通过协议模拟器发送数据）
4. 观察是否收到 `{ type: "new_alarm", data: {...} }` 消息

### 协议设备验证

1. **GB26875**：配置设备连接到 `124.223.35.58:5202`
   - 观察 `gb26875_device` 表是否有设备注册
   - 观察 `fire_device` / `dev_heartbeat` 是否有同步数据

2. **FSCN8001**：配置设备连接到 `124.223.35.58:5203`
   - 观察 `fscn8001_device` 表是否有设备注册
   - 观察 `fire_device` / `dev_heartbeat` 是否有同步数据

---

## 五、回滚方案（测试环境）

如果测试发现问题，随时回滚：

```bash
# 停止测试服务
pm2 stop fire-platform-test
pm2 delete fire-platform-test

# 删除测试库（重新克隆即可）
mysql -u root -p -e "DROP DATABASE IF EXISTS fire_platform_test;"
```

旧版生产服务不受影响（仍在 5003/5200/5201 运行）。

---

## 六、生产切换前最后检查

测试全部通过后，准备生产切换：

```bash
# 1. 再次备份生产数据库
mysqldump -u root -p fire_platform > /backup/fire_platform_final_$(date +%Y%m%d_%H%M%S).sql

# 2. 停止旧版 PM2
pm2 stop my-fire-api

# 3. 运行迁移脚本（这次指向生产库）
cd /opt/my-fire-api
cp .env.production .env   # 确认 DB_NAME=fire_platform
npx tsx scripts/migration.ts

# 4. 启动新版
pm2 start ecosystem.config.js

# 5. 验证
pm2 logs fire-platform
curl http://124.223.35.58:3000/api/health
```

---

## 常见问题

### Q1: `npx tsx scripts/migration.ts` 报 `tsx: not found`
**原因**：生产环境 `node_modules` 缺少 `tsx`（它在 `devDependencies`）。
**解决**：确保部署包包含完整 `node_modules`（不是 `--production` 安装的）。

### Q2: 迁移脚本报 `ER_BAD_FIELD_ERROR: Unknown column 'alarm_desc' in 'field list'`
**原因**：旧版 `fire_alarm` 没有被正确重命名，新版模型尝试向旧 schema 表插入数据。
**解决**：手动重命名旧表后重新运行迁移：
```sql
RENAME TABLE fire_alarm TO fire_alarm_legacy;
RENAME TABLE fire_device TO fire_device_legacy;
```

### Q3: 协议设备连不上 5202/5203
**原因**：防火墙未开放端口。
**解决**：
```bash
firewall-cmd --add-port=5202/tcp --permanent
firewall-cmd --add-port=5203/tcp --permanent
firewall-cmd --reload
```

### Q4: 视频取流返回空地址
**原因**：ZLM 未运行或摄像头密码未配置。
**解决**：检查 `.env` 中 `ZLM_API_URL`、`CAM1_PASS`、`CAM2_PASS` 是否配置正确。
