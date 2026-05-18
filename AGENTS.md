# Agent 工作记忆 — 新致远智慧消防平台

> 本文档记录项目架构、服务器配置、密钥、部署目录及已排查修复的疑难问题，供后续 Agent 参考。

---

## 一、服务器基本信息

| 项目 | 值 |
|------|-----|
| 公网 IP | `<SERVER_IP>` |
| 内网 IP | `<INTERNAL_IP>`（主网卡 eth0） |
| 系统 | OpenCloudOS 9.4 (`Linux 6.6.117-45.2.oc9.x86_64`) |
| SSH 用户 | `<SSH_USER>` |
| 面板 | 服务器面板（nginx 管理） |

### Docker 容器

| 容器名 | 镜像 | 端口映射 | 状态 |
|--------|------|----------|------|
| `zlmediakit` | `zlmediakit/zlmediakit:master` | host 网络模式（`8081` 等） | 运行中 |
| `wvp-mysql` | `mysql:8.0` | `3307`→`3306` | 运行中 |

### 防火墙（iptables 关键规则）

```
ACCEPT udp 8081
ACCEPT tcp 8081
ACCEPT udp 5060
ACCEPT tcp 5060
ACCEPT tcp 3306 (to 172.17.0.2)
```

---

## 二、前端（App）

| 项目 | 值 |
|------|-----|
| 技术栈 | React 19.2 + Vite 7.2 + Tailwind CSS 3.4 + TypeScript 5.9 |
| Router | `HashRouter` |
| 部署目录 | `/www/wwwroot/fire-platform` |
| nginx 站点配置 | `/www/server/nginx/conf/vhost/fire-platform.conf` |
| 监听端口 | `80` |
| 页面标题 | 新致远智慧消防远程监控中心 |

### 前端 nginx 代理规则

- `/` → 静态文件 (`/www/wwwroot/fire-platform`)
- `/api/` → `http://127.0.0.1:5003/api/`
- `/wvp/` → `http://127.0.0.1:18080/`
- `/api/control-rooms/videos` → `127.0.0.1:5003`
- `/api/alarms` → `127.0.0.1:5003`
- `/api/devices` → `127.0.0.1:5003`

---

## 三、后端（API）

| 项目 | 值 |
|------|-----|
| 框架 | Express 4.19 + Sequelize 6.37 + MySQL + Redis + WebSocket |
| Node.js | `20.20.0` |
| 部署目录 | `/opt/my-fire-api-new` |
| 入口文件 | `/opt/my-fire-api-new/dist/app.js` |
| PM2 进程名 | `fire-platform` |
| 端口 | `5003` |
| 日志目录 | `/opt/my-fire-api-new/logs/`（combined / error / out） |
| 源码目录（本地） | `backend/src/` |

### 后端 `.env` 配置（`/opt/my-fire-api-new/.env`）

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<DB_PASSWORD>
DB_NAME=fire_platform
PORT=5003

JWT_SECRET=<JWT_SECRET>

WVP_PRO_URL=http://127.0.0.1:18080
WVP_PRO_USER=admin
WVP_PRO_SECRET=

HEARTBEAT_CRON=* * * * *
HEARTBEAT_TIMEOUT_MINUTES=10
ZLM_SECRET=<ZLM_SECRET>
ZLM_PLAY_HOST=<SERVER_IP>
GB26875_PORT=5201
FSCN8001_PORT=5200

CAM1_PASS=<CAM_RTSP_PASSWORD>
CAM2_PASS=<CAM_RTSP_PASSWORD>

HIKVISION_4G_API_KEY=<HIKVISION_4G_API_KEY>

# CTWing 天翼物联网 HTTP 推送签名验证密钥
# ⚠️ 建议配置：未配置时跳过签名验证（存在被伪造推送的风险）
CTWING_API_KEY=<CTWING_API_KEY>
```

### 业务数据库（MySQL）

| 项目 | 值 |
|------|-----|
| 端口 | `3306` |
| 数据库 | `fire_platform` |
| 用户 | `root` |
| 密码 | `<DB_PASSWORD>` |
| 新增变量 | `HIKVISION_4G_API_KEY` | 海康4G设备接入鉴权 |

### 关键后端路由

| 路由 | 说明 |
|------|------|
| `POST /auth/login` | 登录 |
| `POST /video/stream` | 获取视频播放地址（body: `{deviceId, channelId}`） |
| `GET /video/devices` | WVP 设备列表 |
| `GET /video/devices/:deviceId/channels` | WVP 通道列表 |
| `GET /api/control-rooms/host-device-codes` | 报警主机编码表（分页/搜索/筛选） |
| `POST /api/control-rooms/host-device-codes` | 新增编码 |
| `PUT /api/control-rooms/host-device-codes/:id` | 更新编码 |
| `DELETE /api/control-rooms/host-device-codes/:id` | 删除编码 |
| `POST /api/control-rooms/host-device-codes/import` | Excel 批量导入编码 |
| `/api/alarms` | 告警接口 |
| `/api/devices` | 设备接口 |

---

## 四、WVP-PRO（GB28181 平台）

| 项目 | 值 |
|------|-----|
| 部署目录 | `/opt/wvp` |
| JAR 文件 | `/opt/wvp/wvp-pro.jar` |
| 版本 | `v2.7.4.2026-01-07T08:55:20Z` |
| 配置文件 | `/opt/wvp/application.yml` |
| 启动脚本 | `/opt/wvp/start-wvp.sh` |
| 日志目录 | `/opt/wvp/logs/`（wvp.log / console.log / sip-*.log） |
| HTTP 端口 | `18080` |
| SIP 监听 | `0.0.0.0:5060` |
| Java 路径 | `/usr/lib/jvm/java-17-konajdk-17.0.17-1.oc9/bin/java` |

### WVP `application.yml` 关键配置

```yaml
server:
  port: 18080

spring:
  datasource:
    url: jdbc:mysql://127.0.0.1:3307/wvp?...
    username: root
    password: <WVP_DB_PASSWORD>
  data:
    redis:
      host: 127.0.0.1
      port: 6379
      password: ''

sip:
  ip: 0.0.0.0
  port: 5060
  domain: 3402000000
  id: 34020000002000000001
  show-ip: <SERVER_IP>
  password: <WVP_SIP_PASSWORD>

media:
  id: polaris
  ip: 127.0.0.1        # WVP→ZLM 内部通信，不可改
  http-port: 8081
  secret: <ZLM_SECRET>
  sdp-ip: <SERVER_IP>  # 必须设为公网 IP！
  rtp:
    port-range: 40000,40500
    send-port-range: 50000,55000
```

### WVP MySQL 数据库

| 项目 | 值 |
|------|-----|
| 端口 | `3307`（Docker 映射到容器内 3306） |
| 用户 | `root` |
| 密码 | `<WVP_DB_PASSWORD>` |
| 数据库 | `wvp` |

### WVP 关键表数据

**`wvp_device`**（设备表）

| device_id | name | ip | port | on_line | stream_mode |
|-----------|------|-----|------|---------|-------------|
| `34020000001300000001` | IP CAMERA | `<CAMERA_WAN_IP>` | `34107` | `1` | `UDP` |
| `34020000001300000002` | IP CAMERA2 | `<CAMERA_WAN_IP>` | `33795` | `1` | `UDP` |

**`wvp_device_channel`**（通道表）

| device_id | name | stream_id |
|-----------|------|-----------|
| `34020000001300000001` | Camera 01 | `34020000001300000001_34020000001300000001` |
| `34020000001320000002` | Camera 01 | `34020000001300000002_34020000001320000002` |

> ⚠️ 注意：Camera 02 的通道 `device_id` 是 `34020000001320000002`（映射值），设备 `device_id` 是原始值 `34020000001300000002`。

---

## 五、ZLMediaKit（流媒体服务器）

| 项目 | 值 |
|------|-----|
| 运行方式 | Docker 容器 `zlmediakit` |
| 网络模式 | host |
| HTTP 端口 | `8081` |
| Secret | `<ZLM_SECRET>` |

---

## 六、摄像头配置

| 项目 | Camera 01 | Camera 02 |
|------|-----------|-----------|
| deviceId | `34020000001300000001` | `34020000001300000002` |
| channelId | `34020000001300000001` | `34020000001320000002`（映射值） |
| SIP 端口 | `34107` | `33795` |
| WAN IP | `<CAMERA_WAN_IP>` | `<CAMERA_WAN_IP>` |
| SIP 密码 | `<WVP_SIP_PASSWORD>` | `<WVP_SIP_PASSWORD>` |
| RTSP 密码 | `<CAM_RTSP_PASSWORD>` | `<CAM_RTSP_PASSWORD>` |
| 厂商 | Hikvision | Hikvision |
| 型号 | DS-2CD1345DV2-LA | DS-2CD1345DV2-LA |

---

## 七、已修复的摄像头问题

### 1. Camera 01 — 收流超时

**根因**：WVP `application.yml` 中 `media.sdp-ip` 被设为 `127.0.0.1`，导致 SDP 中媒体地址指向本地回环，公网摄像头无法回流。

**修复**：
1. `sdp-ip` 改回公网 IP `<SERVER_IP>`
2. 后端 `video.service.ts` 增加 `replaceLocalhost()`，将 WVP 返回的 `127.0.0.1:8081/443` 替换为公网 `<SERVER_IP>`

### 2. Camera 02 — 415 Unsupported Media Type

**根因**（两层）：

#### 层 1：后端 DEVICE_ID_MAP 同时映射了 deviceId

后端 `wvp.service.ts` 中的 `DEVICE_ID_MAP` 对 deviceId 和 channelId 同时应用映射，但 WVP 数据库中设备表使用原始 deviceId，导致 WVP 返回"设备不存在"。

**修复**：将 `DEVICE_ID_MAP` 改为 `CHANNEL_ID_MAP`，仅映射 `channelId`。

#### 层 2：WVP Redis 缓存中 streamMode 格式错误

WVP Redis 中 Camera 02 的 `streamMode` 被存储为 `"TCP_ACTIVE"`（下划线），但 WVP SDP 生成代码期望 `"TCP_ACTIVE"`（连字符）。导致 SDP 缺少 `m=video` 行，摄像头返回 415。

**修复**：
```bash
redis-cli HDEL VMP_DEVICE_INFO 34020000001300000002
```
删除缓存后 WVP 自动从数据库重新加载正确的 `stream_mode=UDP`。

---

## 八、操作备忘

### 重启后端
```bash
pm2 restart fire-platform
```

### 重启 WVP
```bash
# 先查找并杀死旧进程
ps aux | grep wvp-pro.jar | grep -v grep
kill <PID>

# 启动
cd /opt/wvp
nohup /usr/lib/jvm/java-17-konajdk-17.0.17-1.oc9/bin/java \
  -Duser.timezone=Asia/Shanghai -Xms512m -Xmx2048m \
  -jar wvp-pro.jar --spring.config.location=/opt/wvp/application.yml \
  > /opt/wvp/logs/console.log 2>&1 &
```

### 检查 WVP 日志
```bash
tail -f /opt/wvp/logs/wvp.log
tail -f /opt/wvp/logs/console.log
```

### 检查后端日志
```bash
tail -f /opt/my-fire-api-new/logs/combined.log
```

### WVP MySQL 查询
```bash
docker exec wvp-mysql mysql -uroot -p<WVP_DB_PASSWORD> -e "SELECT * FROM wvp.wvp_device;"
```

### 业务 MySQL 查询
```bash
mysql -uroot -p<DB_PASSWORD> -e "SHOW TABLES FROM fire_platform;"
```

### 检查 Redis 设备缓存
```bash
redis-cli HGET VMP_DEVICE_INFO 34020000001300000002
```

### 数据库迁移（新增）
```bash
# 执行所有待执行迁移
cd /opt/my-fire-api-new
npx sequelize-cli db:migrate --env production

# 查看迁移状态
npx sequelize-cli db:migrate:status

# 回滚最近一次迁移
npx sequelize-cli db:migrate:undo

# 创建新迁移（开发时使用）
npx sequelize-cli migration:generate --name xxx
```

---

## 九、已修复的平台级 Bug（2026-05-13）

### 1. 设备添加/更新保存失败 🔴 P0

**根因**：`DeviceController.create/update` 完全无字段映射，前端 camelCase 字段（`name`/`type`/`serialNo`/`location` 等）直接塞进 Sequelize，但模型定义的是 snake_case（`device_name`/`device_type`/`device_sn`/`install_location`）。

更严重的是 `device_no` 字段为 `NOT NULL UNIQUE`，但前端表单根本没有这个字段，导致每次保存必报数据库约束错误。

**修复**：
1. `backend/src/controllers/device.controller.ts` 增加完整的 `mapLegacyDeviceBody()` 函数，做 camelCase→snake_case 映射
2. 创建时 `device_no` 自动生成（格式 `EQ-yyyyMMdd-xxx`），同时兼容前端显式传入
3. `backend/src/models/device.model.ts` 补齐缺失字段：`remark`、`config`、`online_status`、`calibration_cycle`、`scrap_year`、`gateway_id`
4. 报废接口同时更新 `lifecycle_status=5`
5. `saveConfig`/`getConfig` 接口修复（原 `config` 字段不存在）

### 2. 单位添加字段静默丢失 🟡 P1

**根因**：`UnitController.mapLegacyUnitBody` 未处理 `contact_email`、`legal_person`、`license_no`。

**修复**：
1. `backend/src/controllers/unit.controller.ts` 补充三个字段映射
2. `backend/src/models/unit.model.ts` 添加对应字段及索引
3. 前端 `UnitArchivePage.tsx` 增加 `mapUnitToBackend` 统一封装

### 3. PageTemplate 批量选择索引错乱 🔴 P0

**根因**：`selectedIds` 存储的是数组全局索引 `(page-1)*pageSize + i`，翻页/排序后同一索引指向不同数据，导致批量删除误删。

**修复**：`app/src/sections/PageTemplate.tsx` 改为按业务 ID（`row.id`）存储和匹配。

### 4. 设备分配页面单位过滤逻辑错误 🟡 P1

**根因**：`parseInt(u.status, 10) === 1`，若后端返回 `status='normal'` 则 `parseInt` 返回 `NaN`，单位被错误过滤。

**修复**：`DeviceAllocationPage.tsx` 改为兼容数字/字符串数字/字符串状态的多层判断。

### 5. 维保记录服务端点重复 🟢 P2

**根因**：`maintRecordService` 与 `workOrderService` 都指向 `/maintenance/work-orders`。

**修复**：`maintRecordService` 改为指向 `/maintenance/records`。

### 6. 表单验证增强

- 邮箱校验：有值即校验（不再依赖包含 `@`）
- 新增经纬度范围校验
- 表单弹窗 UI 精致化（圆角、阴影、过渡动画、加载状态）

## 十、数据库变更（生产环境必执行）

> ⚠️ **重要**：自 2026-05-15 起，生产环境数据库变更统一通过 **Sequelize Migration** 管理，禁止手工执行 ALTER 脚本。

### 执行迁移

```bash
cd /opt/my-fire-api-new

# 安装 sequelize-cli（如尚未安装）
npm install

# 执行所有待执行的迁移
npx sequelize-cli db:migrate --env production

# 查看迁移状态
npx sequelize-cli db:migrate:status
```

### 当前迁移文件清单

| 文件名 | 说明 |
|--------|------|
| `20240513000001-init-core-schema.js` | 初始核心表（已有表不会重复创建） |
| `20240513000002-fix-production-schema.js` | 补齐 fire_unit/fire_device 缺失字段，修复 NULL 值 |
| `20240515000001-add-isnb-tables.js` | 新增 `ctwing_raw_log` + `iot_telemetry` |
| `20240515000002-optimize-indexes.js` | 设备管理复合索引优化 |

### 旧脚本保留（仅供参考）
以下 SQL 脚本仍保留在 `backend/sql/` 中作为备份，但生产环境请优先使用 migration：
- `fix_production_schema.sql`
- `cleanup_device_orphan_20260515.sql`
- `optimize_device_schema_20260515.sql`
- `deploy_isnb_20260515.sql`

## 十一、部署步骤（商用交付）

### 前置检查

```bash
# 检查环境变量是否已配置（缺一不可）
grep -E '^(DB_PASSWORD|JWT_SECRET|ZLM_SECRET|HIKVISION_4G_API_KEY)=' /opt/my-fire-api-new/.env
```

### 前端部署

```bash
cd /www/wwwroot/fire-platform
rm -rf *
cp -r /opt/fire-platform-build/app/dist/* .
```

### 后端部署

```bash
cd /opt/my-fire-api-new

# 1. 拉取代码并构建
git pull
npm install
npm run build

# 2. 执行数据库迁移
npx sequelize-cli db:migrate --env production

# 3. 重启服务
pm2 restart fire-platform

# 4. 查看日志确认
tail -n 50 /opt/my-fire-api-new/logs/combined.log
```

### 数据库备份（部署前必做）

```bash
mysqldump -uroot -p<DB_PASSWORD> fire_platform > /backup/fire_platform_$(date +%Y%m%d_%H%M%S).sql
```

### 验证清单
1. 单位管理 → 新增单位 → 填写全部字段 → 保存成功 → 列表回显正确
2. 设备档案 → 新增设备 → 只填名称/类型/SN → 保存成功（自动生成 device_no）
3. 设备档案 → 编辑设备 → 修改位置/到期日 → 保存成功
4. 批量选择 → 翻页后选择不同行 → 删除正确行
5. 设备分配 → 单位列表正常显示（包含 status=normal 的单位）

---

## 十二、设备清单数据一致性清理与后端加固（2026-05-15）

### 背景
设备接入页面（`fire_iot_device`）存在 15 条无档案关联的孤儿记录，来源：
- 早期演示数据（SN 为 NULL，无协议配置）
- 海康4G设备自动注册时未同步 `archive_device_id`

设备配置页面显示 3 条"已接入"档案，但实际上无 IoT 配置（`lifecycle_status` 被人为改大）。

### 修复原则
**不删菜单、不删功能**，只清理不符合逻辑的数据，并加固后端防止未来再产生孤儿记录。

### 数据库清理（`backend/sql/cleanup_device_orphan_20260515.sql`）

1. **删除纯演示数据**：`archive_device_id` 为空 + SN 为空 + 无协议配置的 IoT 记录（共 11 条）
2. **为海康4G/CTWing 设备补建档案**：
   - HK-SMOKE-001（4G烟感）
   - HK-PRESSURE-001（4G压力表）
   - HK-LEVEL-001（4G液位表）
   - test_ctwing_003（CTWing测试设备）
3. **建立 IoT ↔ 档案关联**：通过 `device_sn` 匹配更新 `archive_device_id`
4. **状态修正**：
   - 有 IoT 接入但 `lifecycle_status < 2` 的档案 → 升为 2（已接入）
   - 无 IoT 接入但 `lifecycle_status >= 2` 的档案 → 降级为 1（已入库）

### 后端加固

1. **IoT 列表查询过滤**（`IoTController.deviceList`）
   - 增加 `archive_device_id IS NOT NULL` 查询条件
   - 设备接入页面不再展示无档案关联的孤儿记录

2. **设备配置页面过滤**（`DeviceController.list`）
   - 新增 `hasIotConfig` 查询参数
   - 设备配置页面只返回有实际 IoT 接入配置的设备

3. **海康4G自动注册修复**（`Hikvision4GController.report`）
   - 自动注册时先调用 `syncUnifiedDevice` 创建档案，获取 `archiveId`
   - 创建 `fire_iot_device` 时同步写入 `archive_device_id`
   - 彻底解决自动注册设备的源头缺失问题

### 生产环境执行
```bash
# 1. 数据清理与补全
mysql -uroot -p<DB_PASSWORD> fire_platform < backend/sql/cleanup_device_orphan_20260515.sql

# 2. 索引优化（若之前未执行）
mysql -uroot -p<DB_PASSWORD> fire_platform < backend/sql/optimize_device_schema_20260515.sql
```

### CTWing 海康4G 转接修复（追加）

**根因**：`IoTController.deviceCreate` 强制将 `device_sn` 覆盖为档案 SN，但 CTWing 推送匹配用的是平台 `deviceId`（常与档案 SN 不同）。导致 CTWing 页面保存后，平台推送永远无法匹配到 IoT 记录。

**修复**：
1. `IoTController.deviceCreate`：允许传入 `device_sn` 优先于档案 SN，仅记录日志不阻断
2. `Ctwing4gAccessPage.buildCtwingIotBody`：显式传入 `deviceSn: ctwingDeviceId`
3. `CTWingController.report`：增加 `protocol_config` 中的 `ctwingDeviceId` 二次匹配

### CTWing 订阅配置（2026-05-15 更新）

CTWing 平台「产品 → 订阅管理」中配置：

| 消息类别 | 订阅级别 | 订阅方URL地址 |
|---------|---------|-------------|
| 设备数据变化通知 | 产品级 | `http://<DOMAIN>/api/iot/ctwing/report` |
| 设备指令响应通知 | 产品级 | `http://<DOMAIN>/api/iot/ctwing/report` |
| 设备事件上报通知 | 产品级 | `http://<DOMAIN>/api/iot/ctwing/report` |
| 设备上下线通知 | 产品级 | `http://<DOMAIN>/api/iot/ctwing/report` |

**后端接口特点**：
- 所有4类消息统一由 `POST /api/iot/ctwing/report` 接收
- 接口先立即返回 HTTP 200（避免 CTWing 超时重试），再异步处理数据库操作
- 签名验证使用 `CTWING_API_KEY`（MD5(Token + Body)）
- 告警检测支持 ISNB 协议解析（海康4G消防设备私有协议）

### 验证清单
1. 设备接入页面仅显示有档案关联的 IoT 设备（不应出现 SN 为 NULL 的演示数据）
2. 海康4G设备（HK-SMOKE-001 等）正常显示且可查看配置
3. CTWing 测试设备正常显示且配置保留
4. 设备配置页面不显示"有状态但无配置"的空壳设备
5. 新接入的海康4G设备自动注册后，设备接入页面立即出现且档案关联正确
6. 入库管理快捷按钮（去接入/去分配/去配置/去维护）正常跳转
7. **CTWing 页面保存后，天翼平台推送能正确匹配到 IoT 设备**（device_sn = CTWing设备ID）
8. **海康4G通过 CTWing 转接时，告警（烟感/压力/液位）正常创建**

---

## 十三、ISNB 协议解析器集成（2026-05-15）

### 背景
海康4G消防设备（NP-FSC200-4G 水压、NP-FSC210-4G 液位、NP-FY300-4G 烟感等）通过 CTWing（天翼物联网平台）接入时，使用的是 **海康私有 ISNB 协议**（Intelligent Security NB）。CTWing 平台对私有协议只做 **透传**，不会解析数据内容，因此智慧消防平台必须自行解析原始二进制帧。

### ISNB 协议关键信息

| 项目 | 说明 |
|------|------|
| 协议全称 | Intelligent Security NB |
| 通信方式 | NB-IoT / 4G(CAT1) + COAP/LwM2M |
| CTWing 产品ID | **99013914**（MQTT通信模型，HIKFIRE） |
| CTWing 产品ID | **99015246**（HIKFIRE-OTAP，智能发射器等） |
| 文档来源 | `ISNB协议(全）.pdf` + `一体式用水4G数据帧示例报文.docx` |

### ISNB 上行帧结构

```
UP_HEADER (变长，约 112~190 字节)
  ├── byMessageId   1B  0x01=定时上报 0x02=告警 0x05=心跳 0x0A=参数上报
  ├── byFixedSign   1B  0x01=扩展头（含版本/型号/CID/LAC）
  ├── byDevType     1B  0x86=一体式用水 0x88=一体化用水 0x02=烟感
  ├── byMac[6]      6B  MAC地址
  ├── byTime[4]     4B  UTC时间（1970年起秒数）
  ├── wPCI          2B  小区编号
  ├── bySnr         1B  信噪比
  ├── byEcl         1B  覆盖等级
  ├── wRsrp         2B  信号强度
  ├── dwUpHeaderLen 4B  头部长度
  ├── dwPackageNo   4B  包序号
  ├── byQCCID[20]   20B QCCID
  ├── byIMEI[20]    20B IMEI
  ├── byIMSI[20]    20B IMSI
  ├── byNBModuleVersion[24] 24B NB模块版本
  ├── dwCID         4B  基站号（扩展）
  ├── dwLAC         4B  位置区号（扩展）
  ├── bySoftwareVersion[20]  20B 软件版本（扩展）
  ├── byHardwareVersion[20]  20B 硬件版本（扩展）
  ├── byDeviceModel[20]     20B 设备型号（扩展）
  └── byProtocolVersion[10] 10B 协议版本（扩展）

MULTI_CHAN_HEADER (10B)
  ├── byRes                  1B  保留
  ├── byMsgType              1B  0=新事件 1=应答
  ├── byShield               1B  0=正常 1=故障 2=未配置
  ├── byMultiChanBodyVerson  1B  版本
  ├── wLen                   2B  数据总长度
  ├── wChanRscType           2B  0x60=通道号
  └── wChanRscValue          2B  通道数量

MULTI_CHAN_BODY × N (每个通道 14B + 变长数据)
  ├── wType        2B  0x61=通道号
  ├── wValue       2B  通道编号
  ├── wEventType   2B  0x62=状态变化 0x63=故障 0x64=告警
  ├── wEventValueHight  2B  事件值高16位
  ├── wEventValue  2B  事件值低16位（bit位定义见下表）
  ├── wParamType   2B  参数类型
  └── wParamValue  2B  参数值（0xFFFF=变长数据跟随）
```

### 关键参数类型（ParamType）

| 值 | 名称 | 单位 | 说明 |
|----|------|------|------|
| 0x02 | 水压 | 0.1 MPa | 普通水压 |
| 0x03 | 液位 | 0.01 m | 液位高度 |
| 0x04 | 温度 | 0.1 °C | 环境温度 |
| 0x14 | 用水参数信息 | 变长 | 配置信息（阈值/量程等） |
| 0x15 | 电量百分比 | % | 电池电量 |
| 0x23 | 高级水压 | kPa | 高精度水压（示例中 0x002a = 42kPa） |

### 告警事件位定义（EventType=0x64）

| bit | 含义 |
|-----|------|
| 0 | 烟雾告警 |
| 3 | 温度告警 |
| 4 | 水压告警 |
| 5 | 液位告警 |
| 9 | 水浸告警 |
| 10 | 手动报警 |

### 故障事件位定义（EventType=0x63）

| bit | 含义 |
|-----|------|
| 0 | 传感器故障 |
| 2 | 传感器短路 |
| 3 | 低压 |
| 4 | 设备被拆 |

### 代码变更

1. **新建** `backend/src/utils/isnb.parser.ts` — ISNB 协议解析器
   - `parseIsnbFrame(hexStr)` — 解析完整上行帧
   - `isnbToPlatformData(frame)` — 转换为平台 data 对象
   - `extractIsnbHexFromCtwing(body)` — 从 CTWing 推送体中提取 ISNB 原始帧
   - `isIsnbHexFrame(input)` — 判断字符串是否为 ISNB 十六进制帧

2. **修改** `backend/src/controllers/ctwing.controller.ts`
   - `parseCtwingBody` 增加 ISNB 帧自动识别与解析
   - `detectAlarm` 增加 ISNB 专用告警检测（alarmBits / faultBits / 低电量）
   - 新增 `saveIsnbTelemetry` 保存解析后的遥测数据到 `iot_telemetry` 表

### 数据库变更（生产环境必执行）

```sql
-- CTWing 原始推送日志表（已有，自动创建）
-- CREATE TABLE IF NOT EXISTS ctwing_raw_log (...)

-- ISNB 遥测数据表（用于历史曲线）
CREATE TABLE IF NOT EXISTS iot_telemetry (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  iot_device_id BIGINT NOT NULL,
  message_id INT DEFAULT NULL,
  message_type VARCHAR(32) DEFAULT NULL,
  dev_type INT DEFAULT NULL,
  dev_type_name VARCHAR(64) DEFAULT NULL,
  imei VARCHAR(32) DEFAULT NULL,
  device_model VARCHAR(64) DEFAULT NULL,
  rsrp INT DEFAULT NULL,
  snr INT DEFAULT NULL,
  shield INT DEFAULT NULL,
  channel_count INT DEFAULT NULL,
  pressure_kpa DECIMAL(10,2) DEFAULT NULL,
  level_m DECIMAL(10,2) DEFAULT NULL,
  temperature DECIMAL(10,1) DEFAULT NULL,
  battery_pct INT DEFAULT NULL,
  has_alarm TINYINT DEFAULT 0,
  has_fault TINYINT DEFAULT 0,
  raw_hex TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_iot_device_id (iot_device_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='IoT遥测数据';
```

### 验证清单
1. CTWing 平台推送 ISNB 原始帧 → 后端正确解析出 messageId / devType / IMEI / 各通道参数
2. 水压值（ParamType=0x23）正确转换为 kPa（如 0x002a → 42kPa）
3. 液位值（ParamType=0x03）正确转换为米（如 0x01F4 → 5.00m）
4. 告警事件（EventType=0x64）正确识别并创建告警记录
5. 故障事件（EventType=0x63）正确识别并创建故障告警
6. 心跳/定时上报的数据正常保存到 `iot_telemetry` 表

---

## 十四、待办任务与后续优化

> 以下任务按优先级排序，建议按序处理。

### 🔴 P0 — CTWING_API_KEY 补充

**状态**：待执行
**影响**：CTWing 平台 HTTP 推送签名验证被**跳过**（`verifySignature()` 在未配置时直接返回 `true`）。数据仍可接收，但存在被伪造推送的安全风险。

**操作步骤**：
1. 登录 [CTWing 天翼物联网平台](https://www.ctwing.cn/) → 应用管理 → 获取 `API Key`
2. 在服务器 `.env` 中添加：
   ```bash
   CTWING_API_KEY=your_ctwing_api_key_here
   ```
3. 重启后端：
   ```bash
   pm2 restart fire-platform
   ```
4. 在 CTWing 平台「产品 → 订阅管理」中确认 4 类消息订阅 URL 为 `http://<DOMAIN>/api/iot/ctwing/report`

---

### 🟡 P1 — MySQL 5.7 兼容迁移文件改写

**状态**：待处理（技术债务）
**背景**：V036~V045、V049、V052~V054 使用了 MySQL 8.0+ 语法（`ADD COLUMN IF NOT EXISTS` / `ADD INDEX IF NOT EXISTS` / `ADD CONSTRAINT IF NOT EXISTS`），在 MySQL 5.7 上会直接报错。

**当前状况**：
- 生产环境已基线化到 V060，上述文件不会再执行。
- 但**新环境部署**（如客户现场新装 MySQL 5.7）时，Flyway 会按顺序执行 V001~V060，这些文件将导致迁移失败。

**修复方案**：
参照 V050 的写法，将以下文件改写为存储过程动态检测风格：

| 版本 | 文件 | 不兼容语法 |
|------|------|-----------|
| V036 | `add_fire_unit_missing_columns.sql` | `ADD COLUMN IF NOT EXISTS` |
| V037~V039 | 三个增量字段文件 | `ADD COLUMN IF NOT EXISTS` |
| V040~V041 | 生命周期字段文件 | `ADD COLUMN IF NOT EXISTS` |
| V042~V043 | 联动规则文件 | `CREATE TABLE IF NOT EXISTS`（✅ 兼容） |
| V044 | `add_commercial_indexes.sql` | `ADD INDEX IF NOT EXISTS` |
| V045 | `fix_production_schema.sql` | `ADD COLUMN IF NOT EXISTS` |
| V049 | `optimize_device_indexes_20260515.sql` | `ADD INDEX IF NOT EXISTS` |
| V052 | `add_foreign_keys_and_indexes.sql` | `ADD CONSTRAINT IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` |
| V053 | `optimize_production_indexes_and_events.sql` | `ADD COLUMN IF NOT EXISTS` / `ADD INDEX IF NOT EXISTS` |
| V054 | `optimize_v2_indexes_and_analyze.sql` | `ADD INDEX IF NOT EXISTS` |

**兼容改写模板**（以 V049 为例）：
```sql
DELIMITER $$
DROP PROCEDURE IF EXISTS SafeAddIndex$$
CREATE PROCEDURE SafeAddIndex(IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_cols VARCHAR(255))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND INDEX_NAME = p_index
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', p_table, ' ADD INDEX ', p_index, ' (', p_cols, ')');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL SafeAddIndex('fire_device', 'idx_lifecycle_created', 'lifecycle_status, created_at');
CALL SafeAddIndex('fire_device', 'idx_device_search', 'device_no, device_name, device_sn');

DROP PROCEDURE IF EXISTS SafeAddIndex;
```

---

### 🟡 P1 — Flyway CLI 离线安装

**状态**：待执行
**背景**：服务器无法访问 `repo1.maven.org`，`wget` 安装方式不可用。

**离线安装步骤**：
```bash
# 1. 在本地有网络的机器下载
wget https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/10.15.0/flyway-commandline-10.15.0-linux-x64.tar.gz

# 2. 上传到服务器
scp flyway-commandline-10.15.0-linux-x64.tar.gz root@124.223.35.58:/opt/

# 3. 在服务器解压
ssh root@124.223.35.58 "cd /opt && tar -xzf flyway-commandline-10.15.0-linux-x64.tar.gz && ln -sf flyway-10.15.0 flyway"

# 4. 验证
/opt/flyway/flyway version
```

**后续使用**（V061+）：
```bash
cd /opt/my-fire-api-new
/opt/flyway/flyway -configFiles=backend/flyway.conf migrate
/opt/flyway/flyway -configFiles=backend/flyway.conf info
```

---

### 🟡 P1 — 密码轮换与安全加固

**状态**：建议 30 天内执行
**风险**：`FLYWAY_MIGRATION_GUIDE.md` 曾明文记录数据库密码（已清理），但密码可能已在 git 历史中存在。

**轮换清单**：

| 密钥/密码 | 当前位置 | 影响范围 | 建议操作 |
|-----------|----------|----------|----------|
| MySQL root | `.env`、`application.yml`、Flyway 配置 | 整个平台 | 修改后需同步 WVP、后端、所有脚本 |
| JWT_SECRET | `.env` | 所有登录会话 | 修改后所有用户需重新登录 |
| ZLM_SECRET | `.env`、`application.yml` | 视频流媒体 | 修改后需重启 ZLM 容器 |
| WVP_SIP_PASSWORD | `application.yml`、摄像头配置 | GB28181 摄像头 | 修改后需重新配置摄像头 SIP 密码 |
| 摄像头 RTSP | `.env` | 直连摄像头 | 修改后需同步 `.env` |
| CTWING_API_KEY | 待补充 `.env` | 天翼物联网推送 | 首次配置即可 |

**JWT_SECRET 生成命令**：
```bash
openssl rand -base64 64
```

---

### 🟢 P2 — Event Scheduler 开启评估

**状态**：待评估
**背景**：V053 创建了 3 个日志 TTL 自动清理事件，但需要 `event_scheduler = ON`。

**检查命令**：
```bash
mysql -uroot -p -e "SHOW VARIABLES LIKE 'event_scheduler';"
```

**决策**：
- 若服务器内存充足（>2GB）且日志表数据量增长快 → **建议开启**
- 若资源紧张或已有外部定时任务清理 → 可保持 OFF

**开启命令**：
```sql
SET GLOBAL event_scheduler = ON;
-- 持久化（写入 my.cnf）
echo -e "\n[mysqld]\nevent_scheduler = ON" >> /etc/my.cnf
```

---

### 🟢 P2 — 构建部署流程固化

**状态**：已初步验证，待文档化
**背景**：本地 Shell 已永久封锁，前端/后端构建必须在服务器端执行。

**当前可行流程**：
1. 本地修改代码 → `git push`
2. 服务器 `git pull`（或使用 `scp`/`rsync` 上传源码）
3. 服务器端 `npm install`（使用已缓存的 `node_modules`，因无法访问 registry）
4. 服务器端 `npm run build`
5. 前端 `dist/` 复制到 `/www/wwwroot/fire-platform`
6. 后端 `dist/` 已正确输出到 `/opt/my-fire-api-new/dist/`
7. `pm2 restart fire-platform`

**注意**：服务器 `npm install` 虽无法访问 registry，但现有 `node_modules` 已完整。如需新增依赖，必须**本地下载后上传 `node_modules` 子包**。

---

## 十五、安全提醒

1. **禁止在代码仓库中提交包含真实密码的文件**（`.env`、`*_password*`、`flyway.conf` 等）
2. **Git 历史中的密码**：若密码曾提交到 git，即使已删除文件，仍可通过 `git log --all --full-history -p -S '密码'` 找回。建议轮换密码。
3. **服务器文件权限**：`.env` 应设为 `600` 权限：
   ```bash
   chmod 600 /opt/my-fire-api-new/.env
   chmod 600 /opt/wvp/application.yml
   ```

---

## 十六、架构债务修复（2026-05-16）

### 1. 前端 services.ts 按领域拆分
- `app/src/api/services.ts`（967行）→ 拆分为 `services/` 下 15 个独立模块
- 原文件保留为向后兼容的 re-export 入口
- 新增 Vitest 测试 6 例，全部通过

### 2. 后端路由模块化拆分
- `routes/index.ts`（359行）→ 拆分为 `routes/modules/` 下 20 个子路由文件
- `index.ts` 仅保留公开接口、外部推送、认证中间件和子路由挂载
- 新增路由模块：`duty`、`patrol`、`plan`、`knowledge`、`iot`、`training`、`inspection`、`system`、`linkage`、`ai`、`dashboard`、`deviceControl`、`unit`、`deviceAllocation`、`deviceMaintenance`

### 3. AI 服务层下沉
- `ai.controller.ts` 中的 5 个直接数据库操作方法（`decisionList/Create`、`alertList/Confirm/Handle`）下沉到 `AIService`
- 控制器仅保留 HTTP 参数提取、service 调用和统一异常处理

### 4. 测试体系补齐
- **后端**：自建零依赖微型测试框架（`src/test-utils/index.ts`），基于 tsx + Node.js 20+
  - 新增 3 个测试文件、17 个用例，覆盖 ISNB 协议解析器、响应工具、验证器工具
  - `package.json` 新增 `"test": "tsx src/test-utils/run-all.ts"`
  - `tsconfig.json` 排除 `**/__tests__` 和 `**/test-utils`
- **前端**：配置 `vitest.config.ts`，利用已有 Vitest 框架
  - 新增 3 个测试文件、6 个用例，覆盖 alarm 映射、core 工厂

### 5. SQL 迁移规范化
- `backend/sql/` 下 29 个临时脚本（`check_`/`fix_`/`cleanup_` 等）归档至 `archive/sql/backend/`
- 仅保留核心迁移：V001~V062（Flyway）+ 4 个 JS（Sequelize）
- 新增 `backend/sql/README.md`，明确双轨迁移规则和归档规范

### 部署记录
- **时间**：2026-05-16
- **方式**：本地构建 → scp 上传 → PM2 重启
- **状态**：后端 `fire-platform` online，前端 nginx 443 正常，API 路由全部可用

---

## 十七、商用交付级优化（2026-05-17）

### 1. 前端视觉系统完善（深色科技风）

#### Design Token 系统
- 新增 `app/src/styles/design-tokens.css`（128行）—— 完整 CSS 变量体系
  - 颜色：`--fp-bg-*`（5级背景）、`--fp-accent-*`（5主色+4语义色）、`--fp-status-*`（6状态色）
  - 字体：`--fp-font-size-*`（10级字号）、`--fp-font-weight-*`（5级字重）
  - 阴影：`--fp-shadow-*`（6级阴影）、`--fp-shadow-glow-*`（4色光晕）
  - 间距：`--fp-space-*`（12级间距）、`--fp-radius-*`（6级圆角）
  - 过渡：`--fp-transition-*`（4种缓动+6种时长）
- 语义变量：`--fp-color-primary`、`--fp-color-success`、`--fp-color-warning`、`--fp-color-danger`
- 导出 `tailwind.config.ts` 扩展：`fpColors`、`fpSpacing`、`fpFontSize`、`fpBorderRadius`

#### 组件样式系统
- 新增 `app/src/styles/components.css`（491行）—— 完整组件样式库
  - 卡片系统：`fire-card`、`fire-card-v2`、`fire-card-{red,emerald,amber,purple,cyan}`（5色变体）
  - 卡片特效：`card-shine`（扫光）、`gradient-border`（渐变边框）、`corner-accent`（角标）
  - 表格系统：`fire-table`、`fire-table-row`（悬停指示条）、行选中态、5色行变体
  - 按钮系统：`btn-fire`、`btn-fire-primary`、`btn-fire-danger`、`btn-fire-ghost`
  - 统计卡片：`stat-card-mini`、`stat-card-v2`（玻璃态+悬停上浮）
  - 表单增强：`input-fire`（聚焦光晕）、标签系统 `tag-fire-*`（4色）、徽章脉冲 `badge-pulse`
  - 地图增强：`map-marker-fire`（呼吸圈）、图表提示 `chart-tooltip-fire`
  - 其他：`toast-fire`、`skeleton-shimmer`、`scanline-overlay`、`progress-fire`、`status-dot`

#### 动画系统
- 新增 `app/src/styles/animations.css`（完整）—— 30+ 动画 keyframes
  - 入场：`fade-in-up`、`fade-in-left`、`fade-in-right`、`scale-in`
  - 交互：`shake`、`border-flash`、`alarm-blink`、`value-pop`
  - 氛围：`shimmer`、`pulse-glow`、`scanline`、`radar-spin`、`float-gentle`
  - 缓动函数：8种商用级 `ease-*` 工具类
  - 阶梯延迟：`.stagger-1` ~ `.stagger-9`

#### 全局样式增强（`app/src/index.css`）
- 暗色滚动条美化、输入框聚焦光晕、表格行悬停效果
- 状态指示点系统（在线/离线/故障/预警/报废/禁用）
- 文字渐变特效 `text-gradient`、发光文字 `glow-text-*`
- 高德地图暗色滤镜适配

### 2. 后端 API 健壮性优化

#### 数据验证增强
- **新增** `backend/src/middleware/validation.middleware.ts`（160行）—— 通用校验中间件
  - `ValidatorChain`：链式 API（`.optional()`、`.isString()`、`.isInt({min,max})`、`.isEmail()`、`.matches()`、`.isEnum()`、`.custom()`）
  - `validateBody` / `validateQuery` / `validateParams`：自动错误响应（400 + 字段级错误列表）
  - 集成到 `auth.routes.ts`、`deviceAllocation.routes.ts`、`workOrder.routes.ts`
- **新增** `backend/src/middleware/security.middleware.ts`（192行）—— 安全中间件
  - `securityHeaders()`：11项安全响应头（CSP、X-Frame-Options、HSTS、X-Content-Type-Options 等）
  - `rateLimitByIP()`：基于 Redis 的 IP 限流（登录/注册/推送接口）
  - `rateLimitByUser()`：基于 JWT 的用户级限流（写操作接口）
  - `sensitiveDataFilter()`：响应日志脱敏（密码/Token/密钥/身份证号/手机号）
  - `sqlInjectionPreCheck()`：SQL 注入预检测（拦截 `UNION`、`SELECT`、`;--` 等模式）

#### 数据库查询优化
- `device.controller.ts`：`list` 方法 IoT 配置过滤下沉至 SQL 层（避免内存过滤导致分页失真）
- `alarm.controller.ts`：`list` 方法时间范围查询改为闭区间（`created_at >= start AND created_at <= end`）
- `iot.controller.ts`：`deviceList` 增加 `archive_device_id IS NOT NULL` 条件，过滤孤儿记录
- `device.controller.ts`：`list` 新增 `hasIotConfig` 查询参数，设备配置页面只返回有实际 IoT 配置的设备

### 3. 编译验证
- 前端 `tsc --noEmit`：零错误通过
- 后端 `tsc --noEmit`：零错误通过
- 前后端 `--noUnusedLocals`：零警告通过

---

## 十七、监控中心整改（2026-05-17）

### 1. 删除 dashboard.routes 错误子系统映射 🔴 P0

**问题**：`/subsystem/water|elec|vent` 三条路由错误指向 `deviceAnalysis`，语义完全不符，且与子系统模块重复。

**修复**：删除 `backend/src/routes/modules/dashboard.routes.ts` 中的三条错误路由。

### 2. 视频监控 API 统一 🟡 P1

**问题**：WVP 关闭时 `VideoMonitorPage` 同时调用 `cameraService`（`/cameras` Stub）、`gb28181Service`（`/gb28181-devices` Stub）和 `videoApi`（`/video/devices` 正式），数据源混乱。

**修复**：
1. `VideoMonitorPage` WVP 关闭分支只保留 `videoApi.getVideoDevices()` 单一数据源
2. `cameraService` 标记为 `@deprecated`
3. `stub.routes.ts` 中 `/cameras` 保留但注释更新

### 3. 实时监控 WebSocket 推送 🟡 P1

**问题**：`FireMonitorPage` 仅依赖初始 HTTP 加载，无实时推送能力。

**修复**：
1. `websocket.service.ts` 增加 `addAlarmListener` / `removeAlarmListener` 多监听器机制
2. `FireMonitorPage` 注册 WebSocket 告警监听器，新告警实时插入列表头部（已存在则更新）
3. 复用全局 `App.tsx` 中已初始化的 WebSocket 连接，无需额外建连

### 4. WVP/ZLM 部署检查清单 🟡 P1

首次部署或排查视频故障时，按以下顺序检查：

| 步骤 | 检查项 | 期望结果 | 排查命令 |
|------|--------|---------|---------|
| 1 | ZLM 容器运行状态 | `zlmediakit` 容器 Running | `docker ps \| grep zlmediakit` |
| 2 | ZLM HTTP 端口可达 | 返回 JSON 配置 | `curl http://<SERVER_IP>:8081/index/api/getServerConfig` |
| 3 | WVP 进程运行状态 | `wvp-pro.jar` 在运行 | `ps aux \| grep wvp-pro.jar \| grep -v grep` |
| 4 | WVP HTTP 端口可达 | 返回登录页或 API | `curl -s http://127.0.0.1:18080/api/device/list` |
| 5 | WVP→ZLM 连通性 | `secret` 校验通过 | 查看 `/opt/wvp/logs/wvp.log` 无 "mediaServer offline" |
| 6 | WVP `sdp-ip` | 公网 IP `<SERVER_IP>` | `grep sdp-ip /opt/wvp/application.yml` |
| 7 | WVP Redis 缓存格式 | `stream_mode` 为 `UDP` / `TCP_ACTIVE`（连字符） | `redis-cli HGET VMP_DEVICE_INFO <deviceId>` |
| 8 | 摄像头 SIP 配置 | `domain:3402000000`，指向服务器公网 IP | 登录摄像头 Web 管理页检查 |
| 9 | 后端 `.env` 视频配置 | `ZLM_PLAY_HOST=<SERVER_IP>` | `grep ZLM /opt/my-fire-api-new/.env` |
| 10 | 后端 `replaceLocalhost()` | `video.service.ts` 中已启用 | `grep replaceLocalhost backend/src/services/video.service.ts` |
| 11 | nginx 代理 | `/wvp/` 转发到 `127.0.0.1:18080` | `grep /wvp /www/server/nginx/conf/vhost/*.conf` |
| 12 | 防火墙端口 | TCP/UDP 5060、TCP/UDP 8081 放行 | `iptables -L -n \| grep -E '5060\|8081'` |

**常见故障速查**：
- **收流超时** → 检查步骤 6（`sdp-ip` 必须是公网 IP）
- **415 Unsupported Media Type** → 检查步骤 7（Redis 缓存格式错误）+ 检查 `DEVICE_ID_MAP` 是否仅映射 `channelId`
- **画面黑屏/无流** → 检查步骤 1-3 + ZLM 日志 `docker logs zlmediakit`
- **前端无法播放** → 检查步骤 9-10（后端替换 `127.0.0.1` 为公网 IP）

---

## 十八、设备管理整改（2026-05-17）

### 1. 权限码统一 🔴 P0

**问题**：注册表使用生命周期阶段权限（`device:archive/access/allocate/config`），后端路由和种子数据使用 CRUD 权限（`device:view/create/edit/delete`），三套并存。

**修复**：
- 前端 `ModuleRegistry.ts` 去掉阶段权限，统一为细粒度 CRUD：`device:view` / `device:create` / `device:edit` / `device:delete`
- 后端路由和种子数据保持不变（已一致）

### 2. IoT 安全加固 🔴 P0

**问题**：CTWing / 海康4G 公开推送接口无 IP 白名单时放行所有来源，存在被伪造推送风险。

**修复**：
- `.env.example` 强化 `IOT_IP_WHITELIST` 注释，明确生产环境必须配置
- 后端 `ctwing.controller.ts` / `hikvision4g.controller.ts` 已有 `checkIotWhitelist()`，未配置时放行（兼容开发环境）

**生产环境必做**：
```bash
# 1. 获取 CTWing 平台推送 IP（天翼物联网平台 → 应用管理 → 推送设置）
# 2. 配置白名单
echo "IOT_IP_WHITELIST=124.223.x.x,117.x.x.x" >> /opt/my-fire-api-new/.env
pm2 restart fire-platform
```

### 3. 设备生命周期状态机单测 🟡 P1

**新增** `backend/src/__tests__/deviceLifecycle.test.ts`（14 个用例）：
- 状态常量定义校验（6 个状态 + 标签映射）
- 6 个操作规则矩阵测试：`canConnect` / `canAllocate` / `canConfigure` / `canDeleteArchive` / `canScrap` / `canMaintain`
- 核心流程闭环：草稿 → 入库 → 接入 → 分配 → 维护 → 报废

全部 32 个后端测试通过（含原有 18 个）。

---

## 十七、消防维保管理整改（2026-05-17）

### 1. 维保记录正式 API

新增 `MaintenanceRecord` 模型（`fire_maint_record`）及 `/maintenance/records` 标准 CRUD：
- `GET /maintenance/records` — 分页查询（支持 record_type/staff_name/record_date 筛选）
- `GET /maintenance/records/:id` — 单条详情
- `POST /maintenance/records` — 新增记录
- `PUT /maintenance/records/:id` — 更新
- `DELETE /maintenance/records/:id` — 删除
- 前端 `maintRecordService` 统一指向 `/maintenance/records`

### 2. Stub 迁移
- `/maint-records`（Stub）→ `/old/maint-records`
- `stub.routes.ts` 保留旧兼容入口

### 3. 工单完工自动同步
- `workOrderComplete` 完工后自动 `MaintenanceRecord.create`
- `record_type=2`（维修），`record_no=MR${Date.now()}` 自动生成
- 失败仅 warn 不阻断工单完成

### 4. 权限现状
- 读操作：`maintenance:view`
- 写操作（create/update/delete）：`maintenance:view`（当前）
- **P2**：建议后续将写操作拆分为 `maintenance:manage`（记录增删改）和 `maintenance:dispatch`（工单派工/完工），与菜单注册表 `fire_menu` 对齐。

### 生产环境检查
- `fire_maint_record` 表由 Sequelize `sync({ alter: true })` 自动创建（已确认启动不报错）
- 前端 `MaintenanceRecordPage.tsx` 已调用 `/maintenance/records`，无需额外修改

---

## 十八、巡检管理整改（2026-05-17）

### 1. 权限拆分

后端路由写操作统一改用 `patrol:manage`：
- **读操作**（`GET`）：`patrol:view`（计划列表/详情、记录列表/详情、隐患列表）
- **写操作**（`POST/PUT/DELETE`）：`patrol:manage`（计划增删改、记录增删改、隐患增删改/整改）
- 新增接口：`POST /patrol/records/:id/checkin`（签到，需 `patrol:manage`）

前端 `PatrolPlanPage`/`PatrolRecordPage`/`HazardPage` 统一传入 `permission={{ create: 'patrol:manage', update: 'patrol:manage', delete: 'patrol:manage' }}`，无管理权限用户仅可查看。

### 2. 移动端扫码签到 API

`POST /patrol/records/:id/checkin`
- Body：`{ result?, abnormalDesc?, photos?, signature?, checkItems? }`
- 功能：更新巡检结果、异常描述、照片、签名、巡检项
- 联动：若 `result=2`（异常），自动创建隐患单（`hazard_type=4` 其他）

前端 `patrolRecordService.checkIn(id, data)` 已封装。

### 3. 隐患整改与告警联动

`PUT /patrol/hazards/:id/rectify` 整改完成后：
- 若隐患等级 `level >= 2`（重大/特大），自动创建告警记录
- `alarm_type=3`（预警），`alarm_level` 与隐患等级对齐
- 失败仅 warn 不阻断整改流程

### 4. 前端 service 补全

`hazardService.rectify(id, data)` 新增，支持整改措施、整改后照片、整改人姓名提交。

---

## 十九、应急预案整改（2026-05-17）

### 1. Stub 重复路径下线

- `/plans`（Stub）→ `/old/plans`
- `/drills`（Stub）→ `/old/drills`
- 前端 `drillService` 统一改为调用 `/plans/drills`（原调用 `/drills` 实际命中 Stub）

### 2. 预案模型字段补齐

`EmergencyPlan`（`fire_emergency_plan`）新增字段：
- `plan_level` — 预案级别（1一级 2二级 3三级）
- `version_no` — 版本号
- `update_date` — 修订日期

`EmergencyDrill`（`fire_emergency_drill`）新增字段：
- `drill_name` — 演练名称
- `location` — 演练地点
- `duration` — 耗时

控制器新增 `mapPlanBody` / `mapDrillBody` 字段映射（camelCase → snake_case）。

### 3. 演练参与人 drill_participants 对接

- **模型**：新增 `DrillParticipant`（`drill_id`/`name`/`role`）
- **路由**：
  - `GET /plans/drills/:id/participants` — 列表
  - `POST /plans/drills/:id/participants` — 新增（`plan:manage`）
  - `DELETE /plans/drills/:id/participants/:participantId` — 删除（`plan:manage`）
- **前端 service**：`drillParticipantService.list/create/delete`

### 生产环境
- `fire_emergency_plan` / `fire_emergency_drill` 新增字段由 Sequelize `sync({ alter: true })` 自动创建
- `drill_participants` 表已由 V011 迁移创建，新增模型与现有表结构兼容

---

## 二十、GIS 地图整改（2026-05-17）

### 1. GIS 路由权限加固

`dashboard.routes.ts` 中 `/gis/*` 路由统一添加 `map:view` 权限中间件：
- `GET /gis/points` — 地图点位
- `GET /gis/situation` — 区域态势
- `GET /gis/alarm-points` — 告警点位
- `GET /gis/alarm-heatmap` — 告警热力图（新增）

其他 dashboard 路由（workbench、monitor、analysis、reports、bigscreen）不受影响。

### 2. 单位档案经纬度校验

`UnitController.mapLegacyUnitBody` 增加范围校验：
- 经度 `lng` 必须在 `-180 ~ 180` 之间
- 纬度 `lat` 必须在 `-90 ~ 90` 之间
- 无效值返回 `400` 错误，阻断保存

### 3. 区域态势查询优化

`GISService.getRegionSituation` 重构：
- 原 N+1 查询（每个单位单独 `Device.count` + `Alarm.count`）→ 单次聚合查询
- 通过 `GROUP BY unit_id` 批量统计设备数/在线数/告警数

### 4. 告警热力图层

后端：
- 新增 `GET /gis/alarm-heatmap` — 返回 `{lng, lat, weight}` 数组
- `weight` 按告警级别加权（紧急 1.0 / 严重 0.7 / 一般 0.4）

前端：
- `GISMapPage` 新增热力图数据加载与 `AMap.HeatMap` 图层控制
- 工具栏新增「热力图」切换按钮（`Layers` 图标）
- 动态加载高德 HeatMap 插件，支持显示/隐藏切换

---

## 二十一、数据分析整改（2026-05-17）

### 1. 分析路由权限加固

`dashboard.routes.ts` 中 `/analysis/*` 路由统一添加 `analysis:view` 权限中间件：
- `GET /analysis/device` — 设备分析
- `GET /analysis/alarm` — 告警分析
- `GET /analysis/maintenance` — 维保分析
- `GET /analysis/hazard` — 隐患分析
- `GET /analysis/patrol` — 巡检完成率

其他 dashboard 路由（workbench、monitor、reports 列表查询、bigscreen）不受影响。

### 2. 报表导出接口

新增 `GET /reports/export`（需 `analysis:export`）：
- 支持 `type=daily|weekly|monthly|device|maintenance|patrol`
- 支持 `date/endDate/year/month/unitId/startDate` 等参数
- 返回 UTF-8 BOM CSV 文件流，Excel 可直接打开
- 文件名自动生成（如 `日报_2026-05-17_20260517.csv`）

`ReportService.exportReport` 通用 CSV 生成器：
- 日报 → 告警明细
- 周报/月报 → 告警趋势
- 设备 → 设备台账
- 维保 → 工单列表
- 巡检 → 巡检记录

### 3. 前端导出按钮

`AnalysisReportPage` 工具栏新增 6 个导出按钮：日报 / 周报 / 月报 / 设备 / 维保 / 巡检，使用 `fetch` 直接下载 blob。

---

## 二十二、报表管理整改（2026-05-17）

### 1. Stub 清理

- `/reports/list`（Stub）→ `/old/reports/list`
- 删除 `/old/reports/daily|weekly|monthly|device|maintenance|patrol` 6 个 `notImplemented` 空路由
- 正式路由统一由 `dashboard.routes.ts` 的 `/reports/*` 接管

### 2. Excel 导出支持

`ReportService.exportReport` 扩展支持 `xlsx` 格式：
- 使用已有 `xlsx@0.18.5` 依赖生成 `.xlsx` 文件
- 所有报表类型（日报/周报/月报/设备/维保/巡检）均支持 CSV + Excel 双格式
- `dashboard.controller.ts` 根据 format 自动设置 `Content-Type` 和响应体

前端 `ReportExportPage` 重构：
- 每个报表提供「CSV」和「Excel」两个下载按钮
- 放弃 JSON 下载，改为直接调用 `/reports/export?format=xlsx|csv`

### 3. 定时报表任务 + 邮件推送

新增 `ReportSchedule` 模型（`report_schedule`）：
- `report_name` / `report_type` / `unit_id`
- `cron_expr` — Cron 表达式（默认 `0 8 * * *`）
- `recipients` — 收件人邮箱（支持多邮箱逗号/分号分隔）
- `format` — `csv` / `xlsx`
- `last_run_at` / `last_run_status` — 执行记录

`cron/index.ts` 新增每分钟定时报表检查：
- 查询所有 `status=1` 的 schedule
- 使用简化 cron 匹配函数判断当前时间是否满足表达式
- 生成报表后通过 `NotificationService.sendEmail` 推送邮件
- 更新 `last_run_at` 和 `last_run_status`（成功/失败）

**注意**：定时报表邮件需配置 SMTP 环境变量（`SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM`），未配置时邮件发送返回失败但 cron 继续执行其他任务。

---

## 二十三、消防知识库整改（2026-05-17）

### 1. 附件上传

后端：
- 新增 `POST /knowledge/upload`（需 `knowledge:manage`）
- 使用已有 `multer` 中间件，支持 `.jpg/.png/.pdf/.doc/.docx/.xls/.xlsx`，单文件 10MB
- 返回 `{ url, originalName, size }`

前端 `knowledgeService.upload(file)` 已封装。

### 2. 全文检索

`KnowledgeDoc` 模型新增 MySQL FULLTEXT 索引 `ft_title_content`（`title` + `content`）：
- `list` 方法优先使用 `MATCH AGAINST` 布尔模式检索
- 若 FULLTEXT 不可用（如 MySQL 5.5 或引擎不支持），自动降级为 `LIKE '%keyword%'`
- 支持 `*` 前缀匹配（如 `消防*` 匹配「消防法」「消防设施」等）

### 3. 分类树与注册表对齐

新增 `DocCategory` 模型（`doc_categories` 表）：
- `name` / `parent_id` / `sort_order`
- **独立分类管理 API**：
  - `GET /knowledge/categories` — 优先返回 `doc_categories` 数据，无数据时降级到文档记录动态提取
  - `GET /knowledge/categories/list` — 分页列表
  - `POST /knowledge/categories` — 新增（`knowledge:manage`）
  - `PUT /knowledge/categories/:id` — 更新（`knowledge:manage`）
  - `DELETE /knowledge/categories/:id` — 删除（`knowledge:manage`）

### 4. Stub 清理

- `/documents/*`（Stub）→ `/old/documents/*`
- 删除 `/old/knowledge` 和 `/old/knowledge/categories`

### 生产环境
- `fire_knowledge_doc` FULLTEXT 索引由 Sequelize `sync({ alter: true })` 自动创建
- `doc_categories` 表由 `DocCategory` 模型 `sync` 自动创建
- 若 MySQL 版本低于 5.6 或表引擎为 MyISAM，FULLTEXT 可能创建失败，系统会自动降级到 LIKE

---

## 二十四、大屏模式整改（2026-05-17）

### 1. 权限加固

`dashboard.routes.ts` 中 `/bigscreen/data` 和 `/bigscreen/config` 统一添加 `bigscreen:view` 权限中间件。

### 2. 前后端数据对齐

`DashboardService.getBigScreenData` 全面增强，补充前端期望字段：
- `hourlyData` — 24 小时火警/故障分时统计
- `unitAlarmData` — 本月单位告警排行 Top10
- `deviceTypeDist` — 设备类型分布（带颜色）
- `systems` — 子系统状态（从 `subsystems` 表读取）
- `recentAlarms` — 最近告警（格式适配前端：device/unit/time/type/level）
- `summary` — 顶部统计卡片真实数据（联网单位/在线设备/设备总数/今日告警）

### 3. 大屏配置 API

- 新增 `ScreenWidget` 模型（`fire_screen_widget`）
- 新增 `GET /bigscreen/config` — 读取当前启用的大屏配置和组件列表
- 前端 `ScreenDashboardPage` 同时拉取数据 + 配置，配置可用于后续动态布局驱动

### 生产环境
- `fire_screen_widget` 表由 Sequelize `sync({ alter: true })` 自动创建
- `fire_screen_config` 表已有模型，确认正常使用
- `AGENTS.md` 已追加第二十四节记录

---

## 二十五、系统管理模块标准化（2026-05-17）

### 1. 模块配置中心同步后端

**问题**：`ModuleConfigPage` 仅通过 `ModuleEngine`（localStorage）管理模块状态，与后端 Redis 中的 `platform_modules` 不同步，多用户/多设备场景下状态不一致。

**修复**：
- 前端 `ModuleConfigPage` mount 时调用 `GET /system/modules` 同步后端状态到 `ModuleEngine`
- 切换模块时先调用 `PUT /system/modules/toggle`，成功后再更新 `ModuleEngine`
- `ModuleEngine` 新增 `bulkUpdateFromBackend()` 方法
- 前端新增 `moduleService`（`system.service.ts`）

### 2. 人员管理正式化

**问题**：`PersonnelPage` 调用 `/personnel` stub（`unit_personnel` 表），无权限控制；Modal 中单位选择硬编码。

**修复**：
- 后端新增 `Personnel` 模型（`sys_personnel` 表）
- 后端 `SystemController` 新增 `personnelList/Create/Update/Delete` 方法
- 后端路由 `GET|POST|PUT|DELETE /system/personnel` 添加 `system:admin` 权限守卫
- 前端 `personnelService` 迁移到 `/system/personnel`
- `PersonnelModal` 单位选择改为从 `unitService.list()` 动态加载
- 前后端字段映射：前端 camelCase ↔ 后端 snake_case（`unitId`/`unit_id`、`certType`/`cert_type` 等）

### 3. 系统监控真实指标

**问题**：`SystemMonitorPage` 依赖 `/system-monitor/*` stubs：`metrics` 返回随机数，`services`/`logs` 返回 404。

**修复**：
- 后端新增 `GET /system/monitor`，使用 Node.js `os`/`process` 模块返回真实指标：
  - CPU 使用率（基于 `os.loadavg()` / `os.cpus()`）
  - 内存使用率（`os.freemem()` / `os.totalmem()`）
  - 系统运行时间（`process.uptime()`）
  - 设备在线率（数据库查询）
- 前端 `SystemMonitorPage` 改为调用 `/system/monitor`
- 日志从 `/system/logs` 获取（`SystemLog` 表）
- 服务状态只展示当前 Node.js 进程

### 4. Stub 清理

- 删除 `stub.routes.ts` 中的 `/personnel` 和 `/system-monitor/*`
- 删除 `stub.oldTable.service.ts` 中的 `personnelList/ById/Create/Update/Delete` 和 `unit_personnel` 表允许
- 删除 `stub.fakeData.service.ts` 中的 `systemMonitorMetrics/Services/Logs`

### 生产环境
- `sys_personnel` 表由 Sequelize `sync({ alter: true })` 自动创建
- 权限码 `system:admin` 需已在角色权限表中注册

---

*最后更新：2026-05-17*
