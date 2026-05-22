# 数据库迁移目录

## 架构变更说明（2026-05-22）

本项目已于 2026-05 完成 **MySQL → PostgreSQL + Redis + TDengine 三库重构**。
历史 MySQL 迁移脚本（V001~V064 及 4 个 Sequelize `.js`）已归档至 `archive/`，**不再维护、不再执行**。

## 当前迁移体系

```
backend/sql/
├── README.md                          # 本文件
├── baseline/
│   └── V000__postgresql_baseline.sql  # PostgreSQL 新环境完整 schema 初始化
├── archive/                           # 历史 MySQL 迁移归档（只读）
│   ├── 20240513*.js                   # Sequelize 历史迁移
│   ├── V001__*.sql ~ V064__*.sql      # Flyway MySQL 迁移
│   └── ...
├── tdengine_init.sql                  # TDengine 时序库初始化
├── fix_ctwing_device_id_20260517.sql  # CTWing 设备修复（PostgreSQL）
├── fix_gansu_fu_an_coords.sql         # 坐标修复（PostgreSQL）
├── rename_tables_postgres.sql         # 表命名规范化（一次性）
└── V065__xxx.sql                      # 首个 PostgreSQL 增量迁移（待创建）
```

| 体系 | 用途 | 状态 |
|------|------|------|
| **PostgreSQL Baseline** | 新环境完整 schema 初始化 | ✅ `baseline/V000__postgresql_baseline.sql` |
| **Flyway Migration** | 增量变更（V065+） | ✅ 活跃，强制 PostgreSQL 语法 |
| **Sequelize sync** | 开发环境自动建表兜底 | ⚠️ 生产环境禁用 alter |
| **TDengine Init** | 时序数据库超级表创建 | ✅ `tdengine_init.sql` |

## 新环境部署流程

### 方式一：Docker Compose（推荐）

```bash
cd backend
docker-compose up -d postgres redis tdengine
# PostgreSQL 首次启动时会通过 initdb.d 自动执行 baseline 脚本
# 然后启动后端即可
```

### 方式二：手动部署

```bash
# 1. 创建数据库
psql -U postgres -c "CREATE DATABASE fire_platform WITH ENCODING = 'UTF8' LC_COLLATE = 'zh_CN.UTF-8';"

# 2. 执行基线脚本（一次性，非 Flyway 管理）
psql -U fire_user -d fire_platform -f backend/sql/baseline/V000__postgresql_baseline.sql

# 3. 初始化 TDengine
curl -u root:taosdata http://localhost:6041/rest/sql/ -d "CREATE DATABASE IF NOT EXISTS fire_platform_ts;"

# 4. Flyway 建立基线标记（假装 V001~V064 已执行）
/opt/flyway/flyway -configFiles=backend/flyway.conf baseline \
  -baselineVersion="64" \
  -baselineDescription="PostgreSQL migration baseline"

# 5. 启动后端（sequelize.sync({ alter: false }) 不会破坏已有表）
cd /opt/my-fire-api-new && npm run build && pm2 restart fire-platform
```

## 增量迁移规范（V065+）

1. **强制 PostgreSQL 语法**：禁止使用 `ENGINE=InnoDB`、`DEFAULT CHARSET`、`ON UPDATE CURRENT_TIMESTAMP`
2. **索引创建**：使用 `CREATE INDEX IF NOT EXISTS`（PostgreSQL 9.5+ 支持）
3. **列变更**：使用 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`
4. **时间戳**：使用 `DEFAULT CURRENT_TIMESTAMP`，应用层维护 `updated_at`
5. **JSON 字段**：使用 `JSONB` 而非 `JSON`，配合 `GIN` 索引
6. **全文检索**：使用 `USING GIN (to_tsvector(...))` 替代 `FULLTEXT`
7. **自增主键**：使用 `GENERATED ALWAYS AS IDENTITY` 或 `SERIAL`，禁止 `AUTO_INCREMENT`

### 示例

```sql
-- backend/sql/V065__add_device_vendor_index.sql

-- 添加列
ALTER TABLE fire_device
  ADD COLUMN IF NOT EXISTS vendor_code VARCHAR(32) DEFAULT NULL;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_fire_device_vendor
  ON fire_device(vendor_code);

-- JSONB 列 + GIN 索引
ALTER TABLE fire_device
  ADD COLUMN IF NOT EXISTS extra_config JSONB DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_fire_device_extra_config
  ON fire_device USING GIN (extra_config);
```

## 现有环境如何处理？

| 环境 | 操作 | 说明 |
|------|------|------|
| **现有生产环境** | 零变更 | schema 已基线化到 V064，直接从 V065 开始执行增量迁移 |
| **现有测试/预发** | 同上 | 已基线化到 V064 |
| **全新环境** | 执行基线脚本 + Flyway baseline | 按上述新部署流程 |
