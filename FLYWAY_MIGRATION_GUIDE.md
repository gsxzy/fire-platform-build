# Flyway Migration 迁移方案

> 将现有 111 个零散 SQL 脚本规范为 Flyway 标准迁移格式。

---

## 一、目录结构

```
backend/
├── sql/
│   ├── migration/              # Flyway 版本化迁移（自动执行）
│   │   ├── V001__create_units_table.sql
│   │   ├── V002__create_devices_table.sql
│   │   └── ...
│   ├── repeatable/             # Flyway 可重复迁移（校验和变化时执行）
│   │   └── R__create_diagnostic_views.sql
│   └── diagnostic/             # 人工诊断脚本（不归 Flyway 管理）
│       ├── check_db.sql
│       ├── check_alarm.sql
│       └── ...
├── flyway.conf                 # Flyway 配置文件
└── flyway.user.conf            # 本地覆盖（gitignore）
```

**设计原则：**
- `migration/`：所有**修改数据库结构或数据**的脚本，Flyway 自动管理版本
- `repeatable/`：视图、存储过程等可重复执行的脚本
- `diagnostic/`：只读 `SELECT` 诊断脚本，开发/运维手动执行

---

## 二、命名规则

### 版本化迁移（Versioned Migration）
```
V<version>__<description>.sql
```
- `V`：固定前缀，表示版本化迁移
- `<version>`：3 位数字，严格递增，**不可重复**
- `__`：双下划线，分隔版本号和描述
- `<description>`：下划线连接的小写描述
- `.sql`：文件后缀

**示例：**
```
V001__create_units_table.sql
V042__add_fire_unit_missing_columns.sql
V090__optimize_device_schema_indexes.sql
```

### 可重复迁移（Repeatable Migration）
```
R__<description>.sql
```
- 每次 Flyway 检测到文件内容（校验和）变化时重新执行
- 适合：视图、存储过程、函数

### 基线迁移（Baseline Migration）
```
B<version>__<description>.sql
```
- 用于已有数据库的基线初始化（跳过基线之前的所有迁移）

---

## 三、版本映射表（V001 ~ V090）

### Phase 1：初始表结构（V001 ~ V025）

| 版本 | 文件名 | 来源 | 说明 |
|------|--------|------|------|
| V001 | `V001__create_units_table.sql` | `app/sql/units_table.sql` | 单位表 |
| V002 | `V002__create_devices_table.sql` | `app/sql/device_archive_tables.sql` | 通用设备档案表 |
| V003 | `V003__create_fire_host_table.sql` | `app/sql/fire_host.sql` | 报警主机表 |
| V004 | `V004__create_fire_loop_table.sql` | `app/sql/fire_host.sql` | 回路表 |
| V005 | `V005__create_fire_point_table.sql` | `app/sql/fire_host.sql` | 设备点位表 |
| V006 | `V006__create_fire_iot_device_table.sql` | `app/sql/fire_iot_device.sql` | IoT 设备统一档案表 |
| V007 | `V007__create_fire_alarm_table.sql` | `app/sql/fire_iot_device.sql` | 告警表 |
| V008 | `V008__create_fscn8001_tables.sql` | `app/sql/fscn8001_tables.sql` | FSCN8001 协议相关表 |
| V009 | `V009__create_control_room_table.sql` | `app/sql/control_room_backend.sql` | 消控室实时表 |
| V010 | `V010__create_floor_plan_tables.sql` | `app/sql/floor_plan_tables.sql` | 建筑/楼层/点位表 |
| V011 | `V011__create_linkage_rules_table.sql` | `app/sql/linkage_tables.sql` | 联动规则表 |
| V012 | `V012__create_work_orders_table.sql` | `app/sql/missing_tables.sql` | 工单表 |
| V013 | `V013__create_fire_control_command_table.sql` | `app/sql/fire_control_command.sql` | 消防控制指令表 |
| V014 | `V014__create_iot_sensor_table.sql` | `app/sql/fire_control_expand.sql` | 传感器表 |
| V015 | `V015__add_password_hash_column.sql` | `app/sql/add_password_hash.sql` | 用户表增加密码哈希字段 |
| V016 | `V016__add_unit_device_columns.sql` | `app/sql/unit_device_tables.sql` | 单位设备关联字段 |
| V017 | `V017__add_device_lifecycle_columns.sql` | `app/sql/device_lifecycle_tables.sql` | 设备生命周期字段 |
| V018 | `V018__add_commercial_constraints.sql` | `app/sql/commercial_delivery.sql` | 外键约束 |
| V019 | `V019__add_json_indexes.sql` | `app/sql/json_indexes.sql` | JSON 索引 |
| V020 | `V020__create_dedup_views.sql` | `app/sql/dedup_views.sql` | 去重视图 |
| V021 | `V021__optimize_production_indexes.sql` | `app/sql/optimize_production.sql` | 生产索引优化 |
| V022 | `V022__optimize_v2_indexes.sql` | `app/sql/optimize_v2.sql` | 索引优化 v2 |
| V023 | `V023__upgrade_floor_plan_table.sql` | `app/sql/floor_plan_upgrade.sql` | 平面图升级字段 |
| V024 | `V024__insert_floor_plan_demo.sql` | `app/sql/floor_plan_demo.sql` | 平面图演示数据 |
| V025 | `V025__migrate_user_passwords.sql` | `app/sql/migrate_password.sql` | 用户密码迁移 |

### Phase 2：表结构扩展与修复（V026 ~ V040）

| 版本 | 文件名 | 来源 | 说明 |
|------|--------|------|------|
| V026 | `V026__fix_fire_iot_device_add_sn.sql` | `fix_db.sql` | IoT 设备表增加 device_sn |
| V027 | `V027__fix_fire_iot_device_add_type.sql` | `fix_iot.sql` | IoT 设备表增加 device_type |
| V028 | `V028__fix_fscn_alarm_add_raw_data.sql` | `fix_table.sql` | FSCN 告警表增加 raw_data |
| V029 | `V029__create_fire_issue_history_table.sql` | `init_db_fix.sql` | AI 故障知识库表 |
| V030 | `V030__add_fire_device_protocol_config.sql` | `init_db_fix.sql` | 设备表增加 protocol_config |
| V031 | `V031__add_device_lifecycle_status.sql` | `backend/sql/device_lifecycle.sql` | 设备生命周期状态字段 |
| V032 | `V032__enhance_device_lifecycle_status.sql` | `backend/sql/device_lifecycle_v2.sql` | 生命周期状态增强 |
| V033 | `V033__add_commercial_performance_indexes.sql` | `backend/sql/commercial_indexes.sql` | 商用性能索引 |
| V034 | `V034__create_missing_building_tables.sql` | `backend/sql/create_missing_tables.sql` | 缺失建筑相关表 |
| V035 | `V035__update_device_lifecycle_status.sql` | `fix-lifecycle.sql` | 更新生命周期状态值 |
| V036 | `V036__add_fire_unit_missing_columns.sql` | `backend/sql/fix_production_schema.sql` | 单位表增加联系邮箱/法人等 |
| V037 | `V037__add_fire_device_missing_columns.sql` | `backend/sql/fix_production_schema.sql` | 设备表增加 remark/config 等 |
| V038 | `V038__add_fire_unit_business_indexes.sql` | `backend/sql/fix_production_schema.sql` | 单位表业务索引 |
| V039 | `V039__add_fire_device_business_indexes.sql` | `backend/sql/fix_production_schema.sql` | 设备表业务索引 |
| V040 | `V040__fix_null_value_consistency.sql` | `backend/sql/fix_production_schema.sql` | 修复 NULL 值一致性 |

### Phase 3：安全与清理（V041 ~ V050）

| 版本 | 文件名 | 来源 | 说明 |
|------|--------|------|------|
| V041 | `V041__create_hikvision4g_raw_log_table.sql` | `create_hik_table.sql` | 海康4G原始日志表 |
| V042 | `V042__update_sip_device_passwords.sql` | `update_sip_pwd.sql` | 更新 SIP 设备密码 |
| V043 | `V043__clear_mock_test_data.sql` | `clear_mock_data.sql` | 清除测试数据 |
| V044 | `V044__insert_init_issue_data.sql` | `init_issue_data.sql` | 初始化故障知识库数据 |
| V045 | `V045__fix_old_alarm_records.sql` | `backend/sql/fix_old_alarms.sql` | 修复历史告警记录 |
| V046 | `V046__create_ctwing_raw_log_table.sql` | `backend/sql/deploy_isnb_20260515.sql` | CTWing 原始推送日志表 |
| V047 | `V047__create_iot_telemetry_table.sql` | `backend/sql/deploy_isnb_20260515.sql` | IoT 遥测数据表 |
| V048 | `V048__delete_orphan_iot_devices.sql` | `backend/sql/cleanup_device_orphan_20260515.sql` | 删除孤儿 IoT 记录 |
| V049 | `V049__insert_hikvision4g_archive_devices.sql` | `backend/sql/cleanup_device_orphan_20260515.sql` | 补建海康4G档案 |
| V050 | `V050__update_iot_archive_links.sql` | `backend/sql/cleanup_device_orphan_20260515.sql` | 更新 IoT-档案关联 |

### Phase 4：状态修正与优化（V051 ~ V060）

| 版本 | 文件名 | 来源 | 说明 |
|------|--------|------|------|
| V051 | `V051__fix_lifecycle_status_mismatch.sql` | `backend/sql/cleanup_device_orphan_20260515.sql` | 修正生命周期状态不匹配 |
| V052 | `V052__add_device_lifecycle_composite_index.sql` | `backend/sql/optimize_device_schema_20260515.sql` | 复合索引 lifecycle+created |
| V053 | `V053__add_device_search_composite_index.sql` | `backend/sql/optimize_device_schema_20260515.sql` | 复合索引 device_no+name+sn |
| V054 | `V054__add_alarm_created_at_index.sql` | `backend/sql/fix_production_schema.sql` | 告警表 created_at 索引 |
| V055 | `V055__add_control_room_unit_id_index.sql` | `backend/sql/fix_production_schema.sql` | 消控室 unit_id 索引 |
| V056 | `V056__add_iot_device_unit_id_index.sql` | `backend/sql/fix_production_schema.sql` | IoT 设备 unit_id 索引 |
| V057 | `V057__add_fire_device_unique_device_no.sql` | `backend/sql/fix_production_schema.sql` | 设备编号唯一索引 |
| V058 | `V058__add_fire_device_sn_index.sql` | `backend/sql/fix_production_schema.sql` | 设备 SN 索引 |
| V059 | `V059__update_stream_mode_config.sql` | `tmp_query.sql` | 更新设备流传输模式 |
| V060 | `V060__insert_test_alarm_data.sql` | `test_insert.sql` | 插入测试告警数据（可选） |

### Phase 5：保留位（V061 ~ V090）

| 版本 | 用途 | 说明 |
|------|------|------|
| V061~V070 | 预留：未来表结构扩展 | 新模块表创建 |
| V071~V080 | 预留：未来索引优化 | 性能调优 |
| V081~V090 | 预留：未来数据修复 | 数据治理 |

---

## 四、Flyway 配置文件

创建 `backend/flyway.conf`（项目级配置）：

```properties
# Flyway 配置 — 智慧消防平台
flyway.url=jdbc:mysql://localhost:3306/fire_platform
flyway.user=fire_user
flyway.password=${DB_PASSWORD}
flyway.locations=filesystem:sql/migration,filesystem:sql/repeatable
flyway.sqlMigrationPrefix=V
flyway.repeatableSqlMigrationPrefix=R
flyway.sqlMigrationSeparator=__
flyway.sqlMigrationSuffixes=.sql
flyway.baselineOnMigrate=true
flyway.baselineVersion=001
flyway.validateOnMigrate=true
flyway.outOfOrder=false
flyway.cleanDisabled=true
flyway.placeholders.databaseName=fire_platform
```

创建 `backend/flyway.user.conf`（本地覆盖，已加入 gitignore）：

```properties
# 本地覆盖（请勿提交到版本控制）
flyway.url=jdbc:mysql://127.0.0.1:3306/fire_platform
flyway.user=root
flyway.password=your_password_here
```

---

## 五、执行顺序说明

### 首次初始化（新数据库）

```bash
cd backend

# 1. 安装 Flyway CLI（仅需一次）
# 方式A：Docker
docker pull flyway/flyway

# 方式B：手动下载
# https://documentation.red-gate.com/fd/command-line-184127404.html

# 2. 执行迁移
flyway -configFiles=flyway.conf migrate

# 3. 查看状态
flyway -configFiles=flyway.conf info
```

### 已有数据库（基线化）

```bash
# 对已有数据库设置基线（跳过 V001~V060 之前的脚本）
flyway -configFiles=flyway.conf baseline -baselineVersion=060

# 然后只执行 V061 及之后的迁移
flyway -configFiles=flyway.conf migrate
```

### 使用 npm 脚本（推荐）

在 `backend/package.json` 中添加：

```json
{
  "scripts": {
    "db:migrate": "flyway -configFiles=flyway.conf migrate",
    "db:info": "flyway -configFiles=flyway.conf info",
    "db:validate": "flyway -configFiles=flyway.conf validate",
    "db:baseline": "flyway -configFiles=flyway.conf baseline"
  }
}
```

---

## 六、脚本分类总览

| 分类 | 数量 | 去向 | 说明 |
|------|------|------|------|
| Schema/DDL | 36 | `sql/migration/` V001~V060 | 建表、加字段、加索引 |
| Data Fix | 7 | `sql/migration/` V035~V051 | UPDATE/INSERT/DELETE |
| Security | 2 | `sql/migration/` V042 | 密码更新 |
| Cleanup | 3 | `sql/migration/` V043,V048~V051 | 数据清理 |
| Config/Device | 6 | `sql/migration/` V059~V060 | 配置更新 |
| Diagnostic/Query | 57 | `sql/diagnostic/` | 只读 SELECT，手动执行 |
| Repeatable | 1 | `sql/repeatable/` | 视图 |

---

## 七、手动执行诊断脚本

不归 Flyway 管理的诊断脚本保留在 `sql/diagnostic/`，使用方式：

```bash
# 方式1：通过 check_db.py（已重构为 .env 驱动）
python check_db.py sql/diagnostic/check_alarm.sql

# 方式2：直接通过 MySQL 客户端
mysql -uroot -p fire_platform < sql/diagnostic/check_devices.sql
```

---

## 八、幂等性原则

每个迁移脚本必须满足：

1. **CREATE TABLE** → 使用 `IF NOT EXISTS`
2. **ALTER TABLE ADD COLUMN** → 使用 `IF NOT EXISTS`（MySQL 8.0+）或存储过程判断（MySQL 5.7）
3. **ADD INDEX** → 先判断索引是否存在，或使用 `DROP INDEX IF EXISTS` 后重建
4. **UPDATE/DELETE** → 使用 WHERE 条件精确匹配，避免重复执行时产生副作用
5. **INSERT** → 使用 `INSERT ... ON DUPLICATE KEY UPDATE` 或先 `SELECT` 判断

---

*最后更新：2026-05-15*
