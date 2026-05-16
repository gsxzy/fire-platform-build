# Flyway 迁移规范 — 新致远智慧消防平台

> 本文档规范所有数据库 Schema 变更的 Flyway 版本化管理。
> 本地无法执行 Shell 命令，所有文件需手动上传服务器后执行。

---

## 一、目录结构

```
backend/sql/
├── flyway.conf                    # Flyway 命令行配置
├── FLYWAY_MIGRATION_GUIDE.md      # 本文档
├── V001__create_units_table.sql   # 版本化迁移（60个）
├── V002__create_devices_table.sql
├── ...
├── V060__final_baseline_check.sql
│
├── check_*.sql                    # 诊断脚本（不归 Flyway 管理）
├── fix_*.sql                      # 原始修复脚本（已纳入 Flyway）
├── cleanup_*.sql                  # 数据清理脚本（已纳入 Flyway）
└── *.sql                          # 其他历史脚本
```

> ⚠️ **重要**：`backend/sql/` 目录下的所有文件仅 `V{版本号}__{描述}.sql` 格式的文件会被 Flyway 执行。其他文件（如 `check_*.sql`、`fix_*.sql`）不会触发迁移，保留在原处供手工参考。

---

## 二、命名规则

```
V{版本号}__{描述}.sql
```

- `V`：版本化迁移前缀（Versioned）
- `{版本号}`：三位数字，左补零，严格递增（001~060）
- `__`：双下划线分隔符（Flyway 固定语法）
- `{描述}`：小写蛇形命名，英文描述变更内容
- `.sql`：后缀

**示例**：`V045__fix_production_schema.sql`

---

## 三、版本映射表（V001~V060）

| 版本 | 文件 | 说明 | 来源 |
|------|------|------|------|
| V001 | `V001__create_units_table.sql` | 创建单位表 | app/sql/units_table.sql |
| V002 | `V002__create_devices_table.sql` | 创建设备档案表 | app/sql/device_archive_tables.sql |
| V003 | `V003__create_iot_devices_table.sql` | 创建 IoT 设备档案表 | app/sql/device_archive_tables.sql |
| V004 | `V004__create_cameras_table.sql` | 创建摄像头档案表 | app/sql/device_archive_tables.sql |
| V005 | `V005__create_gb28181_devices_table.sql` | 创建 GB28181 国标设备档案表 | app/sql/device_archive_tables.sql |
| V006 | `V006__create_fire_control_command_table.sql` | 创建设备控制指令表 | app/sql/fire_control_command.sql |
| V007 | `V007__create_work_orders_and_maint_records.sql` | 创建维保工单表和维保记录表 | app/sql/missing_tables.sql |
| V008 | `V008__create_maint_contracts_and_companies.sql` | 创建维保合同表和维保单位表 | app/sql/missing_tables.sql |
| V009 | `V009__create_patrol_tables.sql` | 创建巡检计划表和巡检记录表 | app/sql/missing_tables.sql |
| V010 | `V010__create_hazards_and_plans_tables.sql` | 创建隐患管理表和应急预案表 | app/sql/missing_tables.sql |
| V011 | `V011__create_drills_and_participants.sql` | 创建演练记录表和演练参与人员表 | app/sql/missing_tables.sql |
| V012 | `V012__create_inspections_and_items.sql` | 创建消防检查表和检查项目表 | app/sql/missing_tables.sql |
| V013 | `V013__create_documents_and_categories.sql` | 创建知识库文档表和文档分类表 | app/sql/missing_tables.sql |
| V014 | `V014__create_notifications_table.sql` | 创建通知表 | app/sql/missing_tables.sql |
| V015 | `V015__create_duty_schedules_and_shifts.sql` | 创建值班排班表和班次表 | app/sql/missing_tables.sql |
| V016 | `V016__create_duty_logs_and_handovers.sql` | 创建值班日志表和交接班记录表 | app/sql/missing_tables.sql |
| V017 | `V017__create_dispatch_and_system_logs.sql` | 创建接警处置记录表和系统日志表 | app/sql/missing_tables.sql |
| V018 | `V018__create_floor_plans_and_reports.sql` | 创建建筑平面图表和报表表 | app/sql/missing_tables.sql |
| V019 | `V019__create_report_templates_and_screen_configs.sql` | 创建报表模板表、大屏配置表和组件表 | app/sql/missing_tables.sql |
| V020 | `V020__create_training_tables.sql` | 创建培训课程表、考试表和成绩表 | app/sql/missing_tables.sql |
| V021 | `V021__create_ai_and_alert_tables.sql` | 创建 AI 决策表和智能预警表 | app/sql/missing_tables.sql |
| V022 | `V022__create_iot_protocol_tables.sql` | 创建 IoT 协议表、管道表和数据点表 | app/sql/missing_tables.sql |
| V023 | `V023__create_control_and_map_tables.sql` | 创建控制模板表和地图相关表 | app/sql/missing_tables.sql |
| V024 | `V024__create_subsystem_tables.sql` | 创建子系统表、设备表和指标表 | app/sql/missing_tables.sql |
| V025 | `V025__create_misc_system_tables.sql` | 创建监控日志、视频通道、待办、公告、组织架构表 | app/sql/missing_tables.sql |
| V026 | `V026__create_alarm_snapshots_and_control_room_configs.sql` | 创建报警快照表、消控室配置表和楼层设备表 | app/sql/missing_tables.sql |
| V027 | `V027__create_fscn8001_device_table.sql` | 创建 FSCN8001 传输装置表 | app/sql/fscn8001_tables.sql |
| V028 | `V028__create_fscn8001_alarm_table.sql` | 创建 FSCN8001 报警记录表 | app/sql/fscn8001_tables.sql |
| V029 | `V029__create_fscn8001_raw_log_table.sql` | 创建 FSCN8001 原始报文日志表 | app/sql/fscn8001_tables.sql |
| V030 | `V030__create_iot_sensor_tables.sql` | 创建物联网传感器配置表和实时数据表 | app/sql/fire_control_expand.sql |
| V031 | `V031__create_control_and_shield_tables.sql` | 创建远程控制命令日志表、屏蔽记录表和反馈记录表 | app/sql/fire_control_expand.sql |
| V032 | `V032__create_host_multiline_and_bus_point_tables.sql` | 创建多线盘配置表和总线点位配置表 | app/sql/fire_control_expand.sql |
| V033 | `V033__create_control_room_realtime_and_shield.sql` | 创建消控室实时状态表和屏蔽记录表 | app/sql/control_room_backend.sql |
| V034 | `V034__create_control_room_command_log_and_video.sql` | 创建消控室控制命令日志表和视频监控表 | app/sql/control_room_backend.sql |
| V035 | `V035__create_panel_and_floor_plan_tables.sql` | 创建多线盘/总线盘控制表和消防平面图相关表 | control_room_backend + floor_plan_tables |
| V036 | `V036__add_fire_unit_missing_columns.sql` | 生产修复：单位表补齐缺失字段 | backend/sql/fix_production_schema.sql |
| V037 | `V037__add_device_sn_to_fire_iot_device.sql` | 为 fire_iot_device 添加 device_sn 字段 | fix_db.sql |
| V038 | `V038__add_columns_to_fire_iot_device.sql` | 为 fire_iot_device 扩展协议相关字段 | fix_iot.sql |
| V039 | `V039__add_raw_data_to_fscn8001_alarm.sql` | 为 fscn8001_alarm 添加原始帧数据字段 | fix_table.sql |
| V040 | `V040__add_device_lifecycle_fields.sql` | 设备生命周期字段扩展 | backend/sql/device_lifecycle.sql |
| V041 | `V041__add_device_lifecycle_v2.sql` | 设备生命周期优化 V2 | backend/sql/device_lifecycle_v2.sql |
| V042 | `V042__create_linkage_rules.sql` | 创建安消联动规则表 | app/sql/linkage_tables.sql |
| V043 | `V043__create_linkage_records.sql` | 创建安消联动执行记录表并初始化规则 | app/sql/linkage_tables.sql |
| V044 | `V044__add_commercial_indexes.sql` | 商业环境高频查询索引补充 | backend/sql/commercial_indexes.sql |
| V045 | `V045__fix_production_schema.sql` | 生产环境 schema 修复 | backend/sql/fix_production_schema.sql |
| V046 | `V046__create_ctwing_raw_log_table.sql` | 创建 CTWing 原始推送日志表 | backend/sql/deploy_isnb_20260515.sql |
| V047 | `V047__create_iot_telemetry_table.sql` | 创建 IoT 遥测数据表 | backend/sql/deploy_isnb_20260515.sql |
| V048 | `V048__delete_orphan_iot_devices.sql` | 删除孤儿 IoT 记录 | backend/sql/cleanup_device_orphan_20260515.sql |
| V049 | `V049__optimize_device_indexes_20260515.sql` | 设备管理索引优化 | backend/sql/optimize_device_schema_20260515.sql |
| V050 | `V050__fix_production_schema_mysql57.sql` | MySQL 5.7 兼容修复 | backend/sql/fix_production_schema_mysql57.sql |
| V051 | `V051__add_json_indexes.sql` | JSON 列生成列与索引 | app/sql/json_indexes.sql |
| V052 | `V052__add_foreign_keys_and_indexes.sql` | 外键约束与高频索引补充 | app/sql/commercial_delivery.sql |
| V053 | `V053__optimize_production_indexes_and_events.sql` | 生产环境索引/日志TTL事件/字符集 | app/sql/optimize_production.sql |
| V054 | `V054__optimize_v2_indexes_and_analyze.sql` | 数据库优化 v2.1 | app/sql/optimize_v2.sql |
| V055 | `V055__update_device_passwords_and_lifecycle.sql` | 设备密码更新与生命周期修复 | update_sip_pwd + fix-lifecycle + clear_mock |
| V056 | `V056__init_issue_history_data.sql` | 初始化故障排查历史数据 | init_issue_data.sql |
| V057 | `V057__fix_old_alarm_records.sql` | 修复历史告警记录单位信息 | backend/sql/fix_old_alarms.sql |
| V058 | `V058__cleanup_device_orphan_20260515.sql` | 设备清单孤儿记录清理与档案补建 | backend/sql/cleanup_device_orphan_20260515.sql |
| V059 | `V059__deploy_isnb_tables_20260515.sql` | ISNB 协议解析器集成表创建 | backend/sql/deploy_isnb_20260515.sql |
| V060 | `V060__final_baseline_check.sql` | 最终基线检查与一致性验证 | 汇总验证 |

---

## 四、服务器执行步骤

### 1. 安装 Flyway（如未安装）

```bash
cd /opt
wget https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/10.15.0/flyway-commandline-10.15.0-linux-x64.tar.gz
tar -xzf flyway-commandline-10.15.0-linux-x64.tar.gz
ln -s flyway-10.15.0 flyway
```

### 2. 配置环境变量

```bash
export DB_USER=root
export DB_PASSWORD=Zhangcong2255
```

### 3. 执行迁移（已有数据库使用基线化）

```bash
cd /opt/my-fire-api-new
/opt/flyway/flyway -configFiles=backend/flyway.conf baseline
/opt/flyway/flyway -configFiles=backend/flyway.conf migrate
```

### 4. 验证迁移状态

```bash
/opt/flyway/flyway -configFiles=backend/flyway.conf info
```

---

## 五、基线化说明

如果数据库已存在（生产环境），首次执行时需要设置基线：

```bash
# 将 V060 之前的所有迁移标记为已执行（基线版本 = 060）
/opt/flyway/flyway -configFiles=backend/flyway.conf baseline -baselineVersion=060
```

之后新增 V061+ 的迁移文件时，Flyway 会自动识别并只执行新文件。

---

## 六、新增迁移规范

1. **版本号递增**：新文件版本号必须 > 当前最大版本号
2. **幂等性**：所有脚本必须使用 `IF NOT EXISTS` / `IF EXISTS`
3. **无破坏性变更**：生产环境禁止 DROP TABLE / DROP COLUMN（除非双版本兼容）
4. **注释头**：每个文件必须包含 Flyway Migration 注释头
5. **测试验证**：新脚本必须先在测试环境执行通过后，再上生产

---

*最后更新：2026-05-15*
