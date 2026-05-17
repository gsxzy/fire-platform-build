# 数据库迁移目录

## 目录结构

```
backend/sql/
├── README.md                              # 本文件
├── 20240513000001-init-core-schema.js     # Sequelize 迁移：初始核心表
├── 20240513000002-fix-production-schema.js # Sequelize 迁移：补齐缺失字段
├── 20240515000001-add-isnb-tables.js      # Sequelize 迁移：新增 ISNB 相关表
├── 20240515000002-optimize-indexes.js     # Sequelize 迁移：索引优化
├── V001__create_units_table.sql           # Flyway 迁移 V001~V062
├── ...
└── V062__add_ctwing_device_id_column.sql
```

## 双轨迁移说明

本项目同时存在两种迁移体系，历史原因导致：

| 体系 | 用途 | 状态 |
|------|------|------|
| **Sequelize Migration** (4个 `.js` 文件) | 早期快速迭代阶段使用 | ✅ 已完成，不再新增 |
| **Flyway Migration** (V001~V062 `.sql` 文件) | 当前生产环境标准迁移 | ✅ 活跃，V063+ 继续在此追加 |

## 规则

1. **生产环境新变更**：一律使用 Flyway 迁移（`V063__xxx.sql` 开始）
2. **MySQL 5.7 兼容**：涉及 `ADD COLUMN IF NOT EXISTS` / `ADD INDEX IF NOT EXISTS` 等语法时，必须同时提供 `_mysql57.sql` 兼容版本（使用存储过程动态检测）
3. **禁止**：不再在此目录放置 `check_` / `fix_` / `cleanup_` / `tmp_` 等临时脚本
4. **临时脚本**：如需临时数据修复，放入 `archive/sql/backend/` 并记录操作日志

## 执行命令

```bash
# Flyway（推荐）
cd /opt/my-fire-api-new
/opt/flyway/flyway -configFiles=backend/flyway.conf migrate

# Sequelize（仅历史兼容）
npx sequelize-cli db:migrate --env production
```

## 归档

历史临时脚本已归档至 `archive/sql/backend/`，保留备查但不参与自动迁移。
