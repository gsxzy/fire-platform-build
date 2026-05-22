#!/usr/bin/env python3
"""
MySQL -> PostgreSQL 数据迁移脚本
适用于同一服务器上的两个数据库
"""
import pymysql
import psycopg2
from psycopg2.extras import execute_values
import sys

MYSQL_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': 'Zhangcong2255',
    'database': 'fire_platform',
    'charset': 'utf8mb4',
}

PG_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'user': 'fire_user',
    'password': 'fire_password_2024',
    'database': 'fire_platform',
}

# Tables to migrate in dependency order (parents before children)
TABLES = [
    # System core
    'sys_department',
    'sys_user',
    'sys_role',
    'sys_permission',
    'sys_role_permission',
    'sys_user_role',
    'sys_config',
    'sys_personnel',
    'sys_notify_template',
    'sys_log',
    'sys_todo',
    'sys_notice',
    'sys_camera',
    # Business core
    'fire_unit',
    'fire_device',
    'fire_device_maintenance',
    'fire_iot_device',
    'fire_protocol_config',
    # Alarm & dispatch
    'fire_alarm',
    'fire_alarm_legacy',
    'alarm_threshold',
    'alarm_notify_policy',
    'dispatch_record',
    'fire_smart_alert',
    'fire_linkage_rule',
    'linkage_records',
    # Maintenance
    'fire_maint_company',
    'fire_maint_contract',
    'fire_maint_work_order',
    'fire_maint_record',
    # Patrol & inspection
    'fire_patrol_plan',
    'fire_patrol_record',
    'fire_inspection',
    'fire_inspection_template',
    'fire_hazard',
    # Training
    'fire_training_course',
    'fire_training_exam',
    'fire_training_record',
    # Emergency
    'fire_emergency_plan',
    'fire_emergency_drill',
    'drill_participants',
    # Knowledge
    'doc_categories',
    'fire_knowledge_doc',
    # Reports
    'report_schedule',
    'fire_screen_config',
    'fire_screen_widget',
    # Control room
    'fire_control_room',
    'fire_control_room_host',
    'fire_host_device_code',
    'fire_multiline_panel',
    'fire_bus_point',
    'host_multiline',
    'host_bus_point',
    'bus_panel',
    'fire_host_command_log',
    'fire_control_command',
    'fire_data_pipeline',
    # Duty
    'fire_duty_schedule',
    'fire_duty_shift',
    'fire_duty_log',
    'fire_duty_handover',
    # Floor plan
    'buildings',
    'floors',
    'floor_camera_bindings',
    'floor_device_positions',
    # AI
    'fire_ai_decision',
    # Subsystem
    'subsystems',
    'fire_issue_history',
]

# Tables that should go to TDengine (skip for now)
SKIP_TABLES = {
    'fscn8001_raw_log',
    'gb26875_raw_log',
    'ctwing_raw_log',
    'iot_telemetry',
    '_migration_id_map',
}

def get_mysql_columns(cursor, table):
    cursor.execute(f"SHOW COLUMNS FROM `{table}`")
    return [(r['Field'], r['Type'], r['Null'], r['Key'], r['Default'], r['Extra']) for r in cursor.fetchall()]

def migrate_table(mysql_cur, pg_cur, table):
    mysql_cur.execute(f"SELECT COUNT(*) as cnt FROM `{table}`")
    count = mysql_cur.fetchone()['cnt']
    if count == 0:
        print(f"  [SKIP] {table}: empty")
        return

    print(f"  [MIGRATE] {table}: {count} rows")

    # Get column names
    mysql_cur.execute(f"SELECT * FROM `{table}` LIMIT 0")
    columns = [desc[0] for desc in mysql_cur.description]

    # Read data in chunks
    chunk_size = 500
    migrated = 0
    offset = 0
    while offset < count:
        mysql_cur.execute(f"SELECT * FROM `{table}` LIMIT %s OFFSET %s", (chunk_size, offset))
        rows = mysql_cur.fetchall()
        if not rows:
            break

        # Convert rows to list of tuples
        pg_rows = []
        for row in rows:
            pg_row = []
            for col in columns:
                val = row[col]
                # Handle MySQL BOOLEAN (tinyint(1)) vs PostgreSQL boolean
                # pymysql returns tinyint as int, psycopg2 accepts int for boolean
                # Handle JSON
                if isinstance(val, dict) or isinstance(val, list):
                    import json
                    val = json.dumps(val, ensure_ascii=False)
                pg_row.append(val)
            pg_rows.append(tuple(pg_row))

        # Build INSERT query
        col_str = ', '.join(f'"{c}"' for c in columns)
        placeholders = ', '.join(['%s'] * len(columns))
        # Use execute_values for bulk insert
        try:
            execute_values(
                pg_cur,
                f'INSERT INTO "{table}" ({col_str}) VALUES %s ON CONFLICT DO NOTHING',
                pg_rows
            )
        except Exception as e:
            print(f"    [ERROR] {table} at offset {offset}: {e}")
            # Try row by row
            for i, pg_row in enumerate(pg_rows):
                try:
                    pg_cur.execute(
                        f'INSERT INTO "{table}" ({col_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING',
                        pg_row
                    )
                except Exception as e2:
                    print(f"      [ROW ERROR] {table} row {offset+i}: {e2}")

        migrated += len(rows)
        offset += chunk_size
        if offset % 5000 == 0:
            print(f"    ... {migrated}/{count}")

    print(f"  [DONE] {table}: {migrated} rows migrated")

def main():
    print("Connecting to MySQL...")
    mysql_conn = pymysql.connect(**MYSQL_CONFIG, cursorclass=pymysql.cursors.DictCursor)
    mysql_cur = mysql_conn.cursor()

    print("Connecting to PostgreSQL...")
    pg_conn = psycopg2.connect(**PG_CONFIG)
    pg_cur = pg_conn.cursor()

    total_migrated = 0
    for table in TABLES:
        # Check if table exists in MySQL
        mysql_cur.execute("SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema=%s AND table_name=%s",
                          (MYSQL_CONFIG['database'], table))
        if mysql_cur.fetchone()['cnt'] == 0:
            print(f"[SKIP] {table}: not found in MySQL")
            continue

        # Check if table exists in PG
        pg_cur.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name=%s", (table,))
        if pg_cur.fetchone()[0] == 0:
            print(f"[SKIP] {table}: not found in PostgreSQL")
            continue

        migrate_table(mysql_cur, pg_cur, table)
        pg_conn.commit()

    pg_cur.close()
    pg_conn.close()
    mysql_cur.close()
    mysql_conn.close()
    print("\nMigration complete!")

if __name__ == '__main__':
    main()
