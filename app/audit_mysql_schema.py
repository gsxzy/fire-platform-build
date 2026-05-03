#!/usr/bin/env python3
"""
MySQL Schema Auditor for fire_platform
Connects via SSH and analyzes database schema for best practices.
"""

import paramiko
import re
import json
from datetime import datetime

# Configuration
SSH_HOST = "124.223.35.58"
SSH_USER = "root"
SSH_PASS = "Zhangcong2255"
DB_NAME = "fire_platform"
OUTPUT_FILE = "schema_audit_report.txt"

# Commonly queried columns that should typically be indexed
COMMON_QUERY_COLUMNS = [
    "status", "created_at", "updated_at", "unit_id", "user_id",
    "device_id", "alarm_id", "type", "code", "name", "phone",
    "email", "address", "is_deleted", "deleted_at", "parent_id",
    "level", "category", "source", "state", "start_time", "end_time",
    "build_id", "floor_id", "room_id", "company_id", "org_id",
    "role_id", "menu_id", "post_id", "dept_id", "create_by",
    "update_by", "create_time", "update_time"
]

# Expected charset
EXPECTED_CHARSET = "utf8mb4"


def run_mysql_query(ssh, sql):
    """Run a MySQL query by piping SQL via stdin to avoid shell escaping issues."""
    cmd = "mysql -N"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    stdin.write(sql + "\n")
    stdin.channel.shutdown_write()
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return out, err, exit_code


def get_tables(ssh, db_name):
    """Get list of tables in the database."""
    sql = f"SHOW TABLES FROM {db_name};"
    out, err, code = run_mysql_query(ssh, sql)
    if code != 0:
        raise RuntimeError(f"Failed to get tables: {err}")
    tables = [line.strip() for line in out.strip().split("\n") if line.strip()]
    return tables


def get_create_table(ssh, db_name, table):
    """Get CREATE TABLE statement."""
    sql = f"SHOW CREATE TABLE {db_name}.`{table}`;"
    out, err, code = run_mysql_query(ssh, sql)
    if code != 0:
        return None, err
    out = out.strip()
    # mysql -N outputs TSV: first column is table name, second is CREATE TABLE
    # Newlines inside the CREATE TABLE are escaped as literal \n
    if "\t" in out:
        parts = out.split("\t", 1)
        if len(parts) == 2:
            create_sql = parts[1].replace("\\n", "\n").strip()
            return create_sql, None
    return None, "Unexpected output format"


def get_indexes(ssh, db_name):
    """Get all indexes from information_schema."""
    sql = (
        f"SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME "
        f"FROM information_schema.STATISTICS "
        f"WHERE TABLE_SCHEMA='{db_name}' ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;"
    )
    out, err, code = run_mysql_query(ssh, sql)
    if code != 0:
        raise RuntimeError(f"Failed to get indexes: {err}")
    indexes = {}
    for line in out.strip().split("\n"):
        line = line.strip()
        if not line or "\t" not in line:
            continue
        parts = line.split("\t")
        if len(parts) < 3:
            continue
        table, idx_name, col_name = parts[0], parts[1], parts[2]
        if table not in indexes:
            indexes[table] = {}
        if idx_name not in indexes[table]:
            indexes[table][idx_name] = []
        indexes[table][idx_name].append(col_name)
    return indexes


def get_table_sizes(ssh, db_name):
    """Get table row counts and sizes."""
    sql = (
        f"SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH "
        f"FROM information_schema.TABLES "
        f"WHERE TABLE_SCHEMA='{db_name}' AND TABLE_TYPE='BASE TABLE';"
    )
    out, err, code = run_mysql_query(ssh, sql)
    if code != 0:
        raise RuntimeError(f"Failed to get table sizes: {err}")
    sizes = {}
    for line in out.strip().split("\n"):
        line = line.strip()
        if not line or "\t" not in line:
            continue
        parts = line.split("\t")
        if len(parts) < 4:
            continue
        table, rows, data_len, idx_len = parts[0], parts[1], parts[2], parts[3]
        sizes[table] = {
            "table_rows": rows if rows else "0",
            "data_length": int(data_len) if data_len else 0,
            "index_length": int(idx_len) if idx_len else 0,
        }
    return sizes


def get_triggers(ssh, db_name):
    """Get triggers from information_schema."""
    sql = (
        f"SELECT TRIGGER_NAME, EVENT_OBJECT_TABLE "
        f"FROM information_schema.TRIGGERS "
        f"WHERE EVENT_OBJECT_SCHEMA='{db_name}';"
    )
    out, err, code = run_mysql_query(ssh, sql)
    if code != 0:
        return {}
    triggers = {}
    for line in out.strip().split("\n"):
        line = line.strip()
        if not line or "\t" not in line:
            continue
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        trigger_name, table = parts[0], parts[1]
        if table not in triggers:
            triggers[table] = []
        triggers[table].append(trigger_name)
    return triggers


def get_columns_info(ssh, db_name, table):
    """Get column info from information_schema.COLUMNS."""
    sql = (
        f"SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, COLUMN_COMMENT "
        f"FROM information_schema.COLUMNS "
        f"WHERE TABLE_SCHEMA='{db_name}' AND TABLE_NAME='{table}' "
        f"ORDER BY ORDINAL_POSITION;"
    )
    out, err, code = run_mysql_query(ssh, sql)
    if code != 0:
        return []
    columns = []
    for line in out.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        parts = line.split("\t")
        columns.append({
            "name": parts[0] if len(parts) > 0 else "",
            "type": parts[1] if len(parts) > 1 else "",
            "nullable": parts[2] if len(parts) > 2 else "",
            "default": parts[3] if len(parts) > 3 else "",
            "extra": parts[4] if len(parts) > 4 else "",
            "comment": parts[5] if len(parts) > 5 else "",
        })
    return columns


def parse_create_table(sql):
    """Parse CREATE TABLE to extract key info."""
    info = {
        "engine": None,
        "charset": None,
        "collate": None,
        "primary_key": None,
        "columns": [],
        "foreign_keys": [],
        "has_auto_increment": False,
    }
    if not sql:
        return info

    # Engine
    m = re.search(r'ENGINE=(\w+)', sql, re.IGNORECASE)
    if m:
        info["engine"] = m.group(1)

    # Charset
    m = re.search(r'DEFAULT CHARSET=(\w+)', sql, re.IGNORECASE)
    if m:
        info["charset"] = m.group(1)

    # Collation
    m = re.search(r'COLLATE=(\w+)', sql, re.IGNORECASE)
    if m:
        info["collate"] = m.group(1)

    # Primary key
    m = re.search(r'PRIMARY KEY\s*\(([^)]+)\)', sql, re.IGNORECASE)
    if m:
        info["primary_key"] = m.group(1).strip().replace('`', '')

    # Foreign keys
    fk_matches = re.findall(
        r'CONSTRAINT\s+`([^`]+)`\s+FOREIGN KEY\s*\(`([^`]+)`\)\s*REFERENCES\s*`([^`]+)`\s*\(`([^`]+)`\)',
        sql, re.IGNORECASE
    )
    for match in fk_matches:
        info["foreign_keys"].append({
            "constraint": match[0],
            "column": match[1],
            "ref_table": match[2],
            "ref_column": match[3],
        })

    # Auto increment
    if re.search(r'AUTO_INCREMENT', sql, re.IGNORECASE):
        info["has_auto_increment"] = True

    return info


def analyze_table(table, create_sql, indexes, sizes, triggers, columns):
    """Analyze a single table and return findings."""
    findings = {
        "table": table,
        "missing_primary_key": False,
        "missing_foreign_keys": [],
        "missing_indexes": [],
        "wrong_charset": False,
        "missing_updated_at_trigger": False,
        "no_indexes": False,
        "columns": columns,
        "create_sql": create_sql,
        "parsed": parse_create_table(create_sql),
        "size": sizes.get(table, {}),
        "indexes": indexes.get(table, {}),
        "triggers": triggers.get(table, []),
    }

    parsed = findings["parsed"]

    # 1. Missing primary key
    if not parsed["primary_key"] and not parsed["has_auto_increment"]:
        findings["missing_primary_key"] = True

    # 2. Missing indexes on commonly queried columns
    existing_indexed_cols = set()
    for idx_name, cols in indexes.get(table, {}).items():
        for col in cols:
            existing_indexed_cols.add(col.lower())

    for col in columns:
        col_name = col["name"].lower()
        if col_name in COMMON_QUERY_COLUMNS and col_name not in existing_indexed_cols:
            findings["missing_indexes"].append(col["name"])

    # 3. Wrong charset
    if parsed["charset"] and parsed["charset"].lower() != EXPECTED_CHARSET.lower():
        findings["wrong_charset"] = True

    # 4. Missing updated_at trigger
    has_updated_at = any(c["name"].lower() in ("updated_at", "update_time", "modify_time") for c in columns)
    has_update_trigger = any("update" in t.lower() for t in triggers.get(table, []))
    if has_updated_at and not has_update_trigger:
        findings["missing_updated_at_trigger"] = True

    # 5. No indexes at all
    if not indexes.get(table):
        findings["no_indexes"] = True

    # Check for columns that look like foreign keys but have no FK constraint
    fk_cols = [fk["column"] for fk in parsed["foreign_keys"]]
    for col in columns:
        col_name = col["name"]
        if col_name.lower().endswith("_id") and col_name.lower() not in ("id", "uuid"):
            if col_name not in fk_cols:
                # Suggest foreign key
                ref_table = col_name[:-3]  # strip _id
                findings["missing_foreign_keys"].append({
                    "column": col_name,
                    "suggested_ref_table": ref_table,
                })

    return findings


def generate_alter_recommendations(findings_list):
    """Generate ALTER TABLE statements from findings."""
    recommendations = []
    for f in findings_list:
        table = f["table"]
        parsed = f["parsed"]

        # Missing primary key
        if f["missing_primary_key"]:
            # Try to find a suitable id column
            id_col = None
            for col in f["columns"]:
                if col["name"].lower() == "id":
                    id_col = col["name"]
                    break
            if not id_col:
                for col in f["columns"]:
                    if "id" in col["name"].lower():
                        id_col = col["name"]
                        break
            if id_col:
                recommendations.append(
                    f"ALTER TABLE `{table}` ADD PRIMARY KEY (`{id_col}`);"
                )
            else:
                recommendations.append(
                    f"-- `{table}`: Missing primary key. No obvious ID column found. Consider adding an AUTO_INCREMENT id."
                )

        # Wrong charset
        if f["wrong_charset"]:
            recommendations.append(
                f"ALTER TABLE `{table}` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            )

        # Missing indexes
        for col in f["missing_indexes"]:
            idx_name = f"idx_{table}_{col}"
            # Truncate if too long (MySQL limit 64 chars)
            if len(idx_name) > 64:
                idx_name = idx_name[:60]
            recommendations.append(
                f"ALTER TABLE `{table}` ADD INDEX `{idx_name}` (`{col}`);"
            )

        # Missing updated_at trigger
        if f["missing_updated_at_trigger"]:
            updated_at_col = None
            for col in f["columns"]:
                if col["name"].lower() in ("updated_at", "update_time", "modify_time"):
                    updated_at_col = col["name"]
                    break
            if updated_at_col:
                trigger_name = f"trg_{table}_updated_at"
                if len(trigger_name) > 64:
                    trigger_name = trigger_name[:60]
                recommendations.append(
                    f"CREATE TRIGGER `{trigger_name}` BEFORE UPDATE ON `{table}` "
                    f"FOR EACH ROW SET NEW.`{updated_at_col}` = CURRENT_TIMESTAMP;"
                )

        # No indexes at all (and has rows)
        if f["no_indexes"] and not f["missing_primary_key"]:
            row_count = f["size"].get("table_rows", "0")
            if row_count and int(row_count) > 0:
                recommendations.append(
                    f"-- `{table}`: No indexes found on table with {row_count} rows. Consider adding at least a primary key."
                )

        # Missing foreign keys (heuristic)
        for fk in f["missing_foreign_keys"]:
            col = fk["column"]
            ref = fk["suggested_ref_table"]
            fk_name = f"fk_{table}_{col}"
            if len(fk_name) > 64:
                fk_name = fk_name[:60]
            recommendations.append(
                f"-- `{table}`: Consider adding FK on `{col}` referencing `{ref}`(id): "
                f"ALTER TABLE `{table}` ADD CONSTRAINT `{fk_name}` FOREIGN KEY (`{col}`) REFERENCES `{ref}`(`id`);"
            )

    return recommendations


def main():
    print("Connecting to SSH...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SSH_HOST, username=SSH_USER, password=SSH_PASS, timeout=30)
    print("Connected.")

    try:
        # 1. Get tables
        print(f"Fetching tables from {DB_NAME}...")
        tables = get_tables(ssh, DB_NAME)
        print(f"Found {len(tables)} tables.")

        # 2. Get indexes and sizes
        print("Fetching indexes...")
        indexes = get_indexes(ssh, DB_NAME)
        print("Fetching table sizes...")
        sizes = get_table_sizes(ssh, DB_NAME)
        print("Fetching triggers...")
        triggers = get_triggers(ssh, DB_NAME)

        # 3. For each table, get CREATE TABLE and columns
        all_findings = []
        for table in tables:
            print(f"Analyzing {table}...")
            create_sql, err = get_create_table(ssh, DB_NAME, table)
            if err:
                print(f"  Warning: could not get CREATE TABLE for {table}: {err}")
                continue
            columns = get_columns_info(ssh, DB_NAME, table)
            findings = analyze_table(table, create_sql, indexes, sizes, triggers, columns)
            all_findings.append(findings)

        # 4. Generate recommendations
        recommendations = generate_alter_recommendations(all_findings)

        # 5. Write report
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write("=" * 80 + "\n")
            f.write(f"MySQL Schema Audit Report for `{DB_NAME}`\n")
            f.write(f"Generated: {datetime.now().isoformat()}\n")
            f.write(f"Server: {SSH_HOST}\n")
            f.write("=" * 80 + "\n\n")

            # Summary
            missing_pk = [x["table"] for x in all_findings if x["missing_primary_key"]]
            wrong_charset = [x["table"] for x in all_findings if x["wrong_charset"]]
            no_indexes = [x["table"] for x in all_findings if x["no_indexes"]]
            missing_triggers = [x["table"] for x in all_findings if x["missing_updated_at_trigger"]]
            total_missing_idx = sum(len(x["missing_indexes"]) for x in all_findings)

            f.write("## SUMMARY\n")
            f.write(f"- Total tables: {len(tables)}\n")
            f.write(f"- Missing primary keys: {len(missing_pk)}\n")
            f.write(f"- Wrong charset (not utf8mb4): {len(wrong_charset)}\n")
            f.write(f"- Tables with no indexes at all: {len(no_indexes)}\n")
            f.write(f"- Missing updated_at triggers: {len(missing_triggers)}\n")
            f.write(f"- Missing recommended indexes: {total_missing_idx}\n")
            f.write("\n")

            # Per-table details
            f.write("## PER-TABLE DETAILS\n\n")
            for findings in all_findings:
                t = findings["table"]
                parsed = findings["parsed"]
                sz = findings["size"]
                f.write(f"### Table: `{t}`\n")
                f.write(f"- Engine: {parsed['engine'] or 'N/A'}\n")
                f.write(f"- Charset: {parsed['charset'] or 'N/A'}\n")
                f.write(f"- Collation: {parsed['collate'] or 'N/A'}\n")
                f.write(f"- Primary Key: {parsed['primary_key'] or '**MISSING**'}\n")
                f.write(f"- Rows: {sz.get('table_rows', 'N/A')}\n")
                f.write(f"- Data Length: {sz.get('data_length', 0):,} bytes\n")
                f.write(f"- Index Length: {sz.get('index_length', 0):,} bytes\n")
                f.write(f"- Foreign Keys: {len(parsed['foreign_keys'])}\n")
                f.write(f"- Indexes: {list(findings['indexes'].keys()) or '**NONE**'}\n")
                f.write(f"- Triggers: {findings['triggers'] or 'None'}\n")

                issues = []
                if findings["missing_primary_key"]:
                    issues.append("Missing primary key")
                if findings["wrong_charset"]:
                    issues.append(f"Wrong charset ({parsed['charset']})")
                if findings["no_indexes"]:
                    issues.append("No indexes at all")
                if findings["missing_updated_at_trigger"]:
                    issues.append("Missing updated_at trigger")
                if findings["missing_indexes"]:
                    issues.append(f"Missing indexes on: {', '.join(findings['missing_indexes'])}")
                if findings["missing_foreign_keys"]:
                    fk_cols = [fk["column"] for fk in findings["missing_foreign_keys"]]
                    issues.append(f"Columns without FK constraints: {', '.join(fk_cols)}")

                if issues:
                    f.write(f"- Issues: {'; '.join(issues)}\n")
                else:
                    f.write("- Issues: None\n")
                f.write("\n")

            # Raw schema dump
            f.write("## RAW SCHEMA DUMP\n\n")
            for findings in all_findings:
                f.write(f"### `{findings['table']}`\n")
                f.write("```sql\n")
                f.write(findings["create_sql"] or "-- Unable to retrieve")
                f.write("\n```\n\n")

            # Recommendations
            f.write("## ALTER TABLE RECOMMENDATIONS\n\n")
            f.write("```sql\n")
            for rec in recommendations:
                f.write(rec + "\n")
            f.write("```\n\n")

            # Indexes
            f.write("## INDEX LIST\n\n")
            f.write("| Table | Index Name | Columns |\n")
            f.write("|-------|-----------|---------|\n")
            for findings in all_findings:
                t = findings["table"]
                for idx_name, cols in findings["indexes"].items():
                    f.write(f"| {t} | {idx_name} | {', '.join(cols)} |\n")
            f.write("\n")

            # Table sizes
            f.write("## TABLE SIZES\n\n")
            f.write("| Table | Rows | Data Length | Index Length | Total |\n")
            f.write("|-------|------|-------------|--------------|-------|\n")
            for findings in all_findings:
                t = findings["table"]
                sz = findings["size"]
                rows = sz.get("table_rows", "N/A")
                dl = sz.get("data_length", 0)
                il = sz.get("index_length", 0)
                total = dl + il
                f.write(f"| {t} | {rows} | {dl:,} | {il:,} | {total:,} |\n")

        print(f"\nReport saved to {OUTPUT_FILE}")
        print(f"Tables analyzed: {len(all_findings)}")
        print(f"Issues found:")
        print(f"  Missing PKs: {len(missing_pk)}")
        print(f"  Wrong charset: {len(wrong_charset)}")
        print(f"  No indexes: {len(no_indexes)}")
        print(f"  Missing triggers: {len(missing_triggers)}")
        print(f"  Missing recommended indexes: {total_missing_idx}")

        # Print a summary to stdout as well
        print("\n" + "=" * 80)
        print("QUICK SUMMARY")
        print("=" * 80)
        if missing_pk:
            print(f"\nMissing Primary Keys ({len(missing_pk)}):\n  " + "\n  ".join(missing_pk))
        if wrong_charset:
            print(f"\nWrong Charset ({len(wrong_charset)}):\n  " + "\n  ".join(wrong_charset))
        if no_indexes:
            print(f"\nNo Indexes At All ({len(no_indexes)}):\n  " + "\n  ".join(no_indexes))
        if missing_triggers:
            print(f"\nMissing updated_at Triggers ({len(missing_triggers)}):\n  " + "\n  ".join(missing_triggers))

    finally:
        ssh.close()
        print("\nSSH connection closed.")


if __name__ == "__main__":
    main()
