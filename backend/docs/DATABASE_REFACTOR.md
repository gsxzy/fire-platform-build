# 智慧消防平台数据库三库分离重构文档

> 重构日期：2026-05-21
> 重构范围：backend（Node.js + Express）
> 前端零改动，业务接口零改动

---

## 一、架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                     前端 (React 19 + Vite)                   │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP / WebSocket
┌───────────────────────────▼─────────────────────────────────┐
│                  Express API (Node.js 20)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ PostgreSQL  │  │   Redis     │  │     TDengine        │ │
│  │ 业务主库     │  │  缓存层      │  │    时序库            │ │
│  │             │  │             │  │                     │ │
│  │ 56+ 业务表   │  │ 在线状态     │  │ 传感器遥测数据       │ │
│  │ 单位/设备    │  │ 实时告警     │  │ 原始报文日志         │ │
│  │ 告警/工单    │  │ 登录令牌     │  │ 历史趋势数据         │ │
│  │ 用户权限     │  │ 大屏统计     │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 数据分层

| 数据库 | 存储内容 | 具体表/Key |
|--------|----------|-----------|
| **PostgreSQL** | 结构化业务数据 | `fire_device`, `fire_unit`, `fire_alarm`, `sys_user`, `fire_maint_*`, `fire_patrol_*`, `fire_control_room*`, `gb26875_device`, `gb26875_alarm`, `fscn8001_device`, `fscn8001_alarm` 等全部业务表 |
| **Redis** | 高速缓存 + 实时状态 | `device:online:*`, `alarm:window:*`, `auth:perms:*`, `dashboard:stats:*`, `sensor:latest:*`, `fire:alarm(pub/sub)`, `iot:stats:*` |
| **TDengine** | 时序采集数据 + 原始日志 | `stb_telemetry` / `ctb_telemetry_*`, `stb_raw_log` / `ctb_raw_*` |

---

## 二、三种库配置与启动依赖

### 2.1 环境变量（`.env`）

```bash
# ═══════════════════════════════════════════════════════════════
# 1. PostgreSQL 业务主库配置（必须）
# ═══════════════════════════════════════════════════════════════
DB_HOST=localhost
DB_PORT=5432
DB_USER=fire_platform
DB_PASSWORD=your_strong_password
DB_NAME=fire_platform
DB_POOL_MIN=5
DB_POOL_MAX=20

# ═══════════════════════════════════════════════════════════════
# 2. Redis 缓存层配置（必须）
# ═══════════════════════════════════════════════════════════════
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ═══════════════════════════════════════════════════════════════
# 3. TDengine 时序库配置（必须）
# ═══════════════════════════════════════════════════════════════
TDENGINE_URL=http://localhost:6041
TDENGINE_DB=fire_platform_ts
TDENGINE_USER=root
TDENGINE_PASSWORD=taosdata
```

### 2.2 启动依赖顺序

后端服务启动前，以下三个数据库必须已就绪：

```
1. PostgreSQL 13+    ─┐
2. Redis 6+           ─┼→ 后端服务启动前必须就绪
3. TDengine 3.0+      ─┘
```

### 2.3 一键启动脚本（Docker 方式）

```bash
#!/bin/bash
# 启动 PostgreSQL
docker run -d --name fire-pg \
  -e POSTGRES_USER=fire_platform \
  -e POSTGRES_PASSWORD=your_strong_password \
  -e POSTGRES_DB=fire_platform \
  -p 5432:5432 postgres:15

# 启动 Redis
docker run -d --name fire-redis -p 6379:6379 redis:7-alpine

# 启动 TDengine
docker run -d --name fire-tdengine \
  -e TAOS_FQDN=localhost \
  -p 6030:6030 -p 6041:6041 \
  tdengine/tdengine:3.2.0

# 初始化 PostgreSQL 基线表（原生 SQL 管理表）
psql -U fire_platform -d fire_platform -f backend/sql/baseline/V000__postgresql_baseline.sql

# 初始化 TDengine 超级表
curl -u root:taosdata http://localhost:6041/rest/sql/fire_platform_ts \
  -d "CREATE DATABASE IF NOT EXISTS fire_platform_ts;"
# 或执行：taos -s "source backend/sql/tdengine_init.sql"
```

### 2.4 后端启动

```bash
cd backend
npm install
npm run build
npm start
```

---

## 三、关键变更点

### 3.1 PostgreSQL 迁移变更

| 变更项 | 原值 | 新值 | 涉及文件 |
|--------|------|------|---------|
| 数据库驱动 | `mysql2` | `pg` + `pg-hstore` | `package.json` |
| Sequelize 方言 | `mysql` | `postgres` | `config/database.ts` |
| 主键类型 | `BIGINT.UNSIGNED` | `BIGINT` | 全部模型文件 |
| 无符号整型 | `INTEGER.UNSIGNED` | `INTEGER` | `device.model.ts` 等 |
| 长文本 | `TEXT('long')` | `TEXT` | `knowledge.model.ts` 等 |
| JSON 字段 | `DataTypes.JSON` | `DataTypes.JSONB` | `subsystem.model.ts` 等 |
| 字符集配置 | `charset/collate` | 移除（数据库级配置） | `config/database.ts` |
| 自增主键 | `AUTO_INCREMENT` | `GENERATED ALWAYS AS IDENTITY` | 原生 SQL DDL |
| 引擎声明 | `ENGINE=InnoDB` | 移除 | 原生 SQL DDL |
| 冲突更新 | `ON DUPLICATE KEY UPDATE` | `ON CONFLICT DO UPDATE` | `refreshToken.service.ts` 等 |

### 3.2 TDengine 时序库变更

| 变更项 | 原存储位置 | 新存储位置 | 涉及文件 |
|--------|-----------|-----------|---------|
| ISNB 遥测数据 | `iot_telemetry` (MySQL) | `stb_telemetry` (TDengine) | `services/ctwing/ctwing.db.ts` |
| GB26875 原始报文 | `gb26875_raw_log` (MySQL) | `stb_raw_log` (TDengine) | `protocols/gb26875.server.ts` |
| FSCN8001 原始报文 | `fscn8001_raw_log` (MySQL) | `stb_raw_log` (TDengine) | `protocols/fscn8001.server.ts` |
| CTWing 原始推送 | `ctwing_raw_log` (MySQL) | `stb_raw_log` (TDengine) | `services/ctwing/ctwing.db.ts` |
| 海康4G 原始上报 | `hikvision4g_raw_log` (MySQL) | `stb_raw_log` (TDengine) | `controllers/hikvision4g.controller.ts` |

### 3.3 Redis 缓存增强

| 新增缓存场景 | Key 模式 | TTL | 写入触发点 |
|-------------|---------|-----|-----------|
| 设备在线状态 | `device:online:{id}` | 300s | `deviceHeartbeat.service.ts` |
| 单位在线设备集合 | `device:online:unit:{id}` | - | `deviceHeartbeat.service.ts` |
| 告警实时窗口 | `alarm:window:{YYYY-MM-DD}` | 86400s | `alarm.service.ts` |
| 大屏统计缓存 | `dashboard:stats:{type}` | 60s | `dashboard.service.ts` |
| 传感器最新值 | `sensor:latest:{sn}` | 3600s | `iot/index.ts` |

---

## 四、文件变更清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `backend/src/config/tdengine.ts` | TDengine REST API 连接配置 |
| `backend/src/services/tdengine.service.ts` | TDengine 超级表管理 + 读写封装 |
| `backend/src/services/redisCache.service.ts` | Redis 缓存增强封装 |
| `backend/sql/baseline/V000__postgresql_baseline.sql` | PostgreSQL 基线建表 + 索引脚本（新环境初始化） |
| `backend/sql/archive/` | 历史 MySQL 迁移脚本归档（V001~V064） |
| `backend/sql/tdengine_init.sql` | TDengine 超级表创建脚本 |
| `backend/docs/DATABASE_REFACTOR.md` | 本文档 |

### 修改文件

| 文件 | 修改内容 |
|------|---------|
| `backend/package.json` | 替换 `mysql2` → `pg` + `pg-hstore`；添加 `axios` |
| `backend/src/config/database.ts` | 方言 `postgres`，移除 charset/collate |
| `backend/src/app.ts` | 启动流程加入 `initTDengine()` |
| `backend/src/models/*.ts`（28 个） | 移除 UNSIGNED、TEXT('long') → TEXT、JSON → JSONB |
| `backend/src/services/refreshToken.service.ts` | DDL + DML 改为 PostgreSQL 语法 |
| `backend/src/services/deviceHeartbeat.service.ts` | BIGINT.UNSIGNED → BIGINT；Redis 在线状态同步 |
| `backend/src/services/ctwing/ctwing.db.ts` | 遥测/原始日志写入 TDengine |
| `backend/src/protocols/gb26875.server.ts` | raw_log → TDengine；device/alarm DDL 改为 PostgreSQL |
| `backend/src/protocols/fscn8001.server.ts` | raw_log → TDengine；device/alarm DDL 改为 PostgreSQL |
| `backend/src/controllers/hikvision4g.controller.ts` | raw_log → TDengine |
| `backend/src/services/dashboard.service.ts` | 大屏统计写入/读取 Redis 缓存 |
| `backend/src/services/alarm.service.ts` | 告警写入 Redis 实时窗口 |
| `backend/src/iot/index.ts` | MQTT 传感器数据写入 Redis 最新值缓存 |
| `backend/.env.example` | 更新为三库配置 |

### 未改动文件（业务逻辑零变更）

- 全部 **Controllers**（37+ 个）— 业务逻辑、接口路由、返回格式完全不变
- 全部 **Routes**（22+ 个）— 路由定义不变
- 全部 **Middleware**（8 个）— 中间件逻辑不变
- **前端所有代码** — 零改动

---

## 五、生产环境部署检查清单

- [ ] PostgreSQL 13+ 已安装，数据库 `fire_platform` 已创建，字符集 UTF8
- [ ] Redis 6+ 已安装，端口 6379 可连接
- [ ] TDengine 3.0+ 已安装，REST API 端口 6041 可访问
- [ ] `.env` 中 `DB_PASSWORD`、`JWT_SECRET`、`TDENGINE_PASSWORD` 已设置为强密码
- [ ] `backend/sql/baseline/V000__postgresql_baseline.sql` 已执行（创建原生 SQL 管理表 + 索引）
- [ ] `backend/sql/tdengine_init.sql` 已执行（创建超级表）
- [ ] 首次启动时 Sequelize 会自动创建模型管理表（`sequelize.sync({ force: false })`）
- [ ] `npm install` 已执行（安装 `pg`、`pg-hstore`、`axios`）
- [ ] `npm run build` 编译通过
- [ ] `npm start` 启动后日志显示 `[DB] PostgreSQL connected`、`[TDengine] 时序数据库已就绪`

---

## 六、回退方案

如需回退到 MySQL 单库架构：

1. 还原 `backend/package.json`：移除 `pg`、`pg-hstore`、`axios`，恢复 `mysql2`
2. 还原 `backend/src/config/database.ts`：方言改回 `mysql`，恢复 charset/collate
3. 还原模型文件：将 `BIGINT` 改回 `BIGINT.UNSIGNED`，`TEXT` 改回 `TEXT('long')`，`JSONB` 改回 `JSON`
4. 还原各协议文件/控制器中的原始 SQL 为 MySQL 语法
5. 移除 TDengine 和 Redis 增强相关代码

建议：重构前创建 Git 分支，便于快速回退。

---

## 七、补充说明（2026-05-22）

### 迁移体系基线化完成

2026-05-22 完成迁移体系的最终收尾：

1. **历史迁移归档**：V001~V064（Flyway）及 4 个 Sequelize `.js` 迁移已移至 `backend/sql/archive/`，不再维护
2. **基线脚本规范化**：`postgres_baseline.sql` 已整理为 `backend/sql/baseline/V000__postgresql_baseline.sql`
3. **Docker 编排更新**：`docker-compose.yml` 中的 `mysql:8.0` 已替换为 `postgres:15-alpine` + `tdengine:3.3.6.6`
4. **模型层残留修复**：`device.model.ts` 移除 `UNSIGNED`，`knowledge.model.ts` 移除 `FULLTEXT` 类型声明
5. **增量迁移规范**：V065+ 强制使用 PostgreSQL 语法（`CREATE INDEX IF NOT EXISTS`、`JSONB`、`GIN` 等）

### 新环境部署路径

```bash
# Docker 一键启动（含 PostgreSQL + Redis + TDengine）
cd backend
docker-compose up -d

# 手动部署
psql -U postgres -c "CREATE DATABASE fire_platform WITH ENCODING = 'UTF8';"
psql -U fire_user -d fire_platform -f backend/sql/baseline/V000__postgresql_baseline.sql
/opt/flyway/flyway -configFiles=backend/flyway.conf baseline -baselineVersion="64"
```

### 现有生产环境

- **零影响**：schema 已基线化，继续正常运行
- **后续变更**：从 V065 开始执行 PostgreSQL 语法的 Flyway 增量迁移
