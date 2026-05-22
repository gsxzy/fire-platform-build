#!/usr/bin/env python3
"""
MySQL -> PostgreSQL 数据迁移脚本 v2
逐表迁移，出错自动回滚单表事务，不影响其他表
跳过 schema 不匹配的列
"""
import pymysql
import psycopg2
from psycopg2.extras import execute_values
import json

MYSQL_CONFIG = {
    'host': 'localhost', 'port': 3306, 'user': 'root',
    'password': 'Zhangcong2255', 'database': 'fire_platform', 'charset': 'utf8mb4',
}
PG_CONFIG = {
    'host': 'localhost', 'port': 5432, 'user': 'fire_user',
    'password': 'fire_password_2024', 'database': 'fire_platform',
}

def get_pg_columns(cur, table):
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name=%s
    """, (table,))
    return set(r[0] for r in cur.fetchall())

def get_mysql_columns(cur, table):
    cur.execute(f"SHOW COLUMNS FROM `{table}`")
    return {r['Field']: r for r in cur.fetchall()}

def migrate_table(mysql_cur, pg_cur, pg_conn, table):
    mysql_cur.execute(f"SELECT COUNT(*) as cnt FROM `{table}`")
    count = mysql_cur.fetchone()['cnt']
    if count == 0:
        print(f"  [SKIP] {table}: empty")
        return 0

    pg_cols = get_pg_columns(pg_cur, table)
    mysql_cols = get_mysql_columns(mysql_cur, table)

    # Find common columns
    common_cols = [c for c in mysql_cols if c in pg_cols]
    skipped_cols = [c for c in mysql_cols if c not in pg_cols]
    if skipped_cols:
        print(f"  [WARN] {table}: skipping columns not in PG: {skipped_cols}")

    if not common_cols:
        print(f"  [SKIP] {table}: no common columns")
        return 0

    print(f"  [MIGRATE] {table}: {count} rows, columns: {common_cols}")

    col_str = ', '.join(f'"{c}"' for c in common_cols)
    chunk_size = 500
    migrated = 0
    offset = 0
    errors = 0

    while offset < count:
        mysql_cur.execute(f"SELECT * FROM `{table}` LIMIT %s OFFSET %s", (chunk_size, offset))
        rows = mysql_cur.fetchall()
        if not rows:
            break

        pg_rows = []
        for row in rows:
            pg_row = []
            for col in common_cols:
                val = row[col]
                mysql_type = mysql_cols[col]['Type']
                # Convert JSON/dict/list
                if isinstance(val, (dict, list)):
                    val = json.dumps(val, ensure_ascii=False)
                # Convert tinyint(1) boolean
                elif mysql_type.startswith('tinyint(1)') and val is not None:
                    val = bool(val)
                pg_row.append(val)
            pg_rows.append(tuple(pg_row))

        try:
            execute_values(
                pg_cur,
                f'INSERT INTO "{table}" ({col_str}) VALUES %s ON CONFLICT DO NOTHING',
                pg_rows
            )
            pg_conn.commit()
            migrated += len(rows)
        except Exception as e:
            pg_conn.rollback()
            errors += 1
            if errors <= 3:
                print(f"    [BULK ERROR] {table} at offset {offset}: {e}")
            # Try row by row
            for i, pg_row in enumerate(pg_rows):
                try:
                    placeholders = ', '.join(['%s'] * len(common_cols))
                    pg_cur.execute(
                        f'INSERT INTO "{table}" ({col_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING',
                        pg_row
                    )
                    pg_conn.commit()
                    migrated += 1
                except Exception as e2:
                    pg_conn.rollback()
                    if errors <= 3 and i < 3:
                        print(f"      [ROW ERROR] {table} row {offset+i}: {e2}")

        offset += chunk_size
        if offset % 5000 == 0:
            print(f"    ... {migrated}/{count}")

    print(f"  [DONE] {table}: {migrated}/{count} rows migrated")
    return migrated

def main():
    print("Connecting to MySQL...")
    mysql_conn = pymysql.connect(**MYSQL_CONFIG, cursorclass=pymysql.cursors.DictCursor)
    mysql_cur = mysql_conn.cursor()

    print("Connecting to PostgreSQL...")
    pg_conn = psycopg2.connect(**PG_CONFIG)
    pg_cur = pg_conn.cursor()

    # Get all tables with data from MySQL
    mysql_cur.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema=%s AND table_type='BASE TABLE'
        ORDER BY table_name
    """, (MYSQL_CONFIG['database'],))
    all_tables = [r['table_name'] for r in mysql_cur.fetchall()]

    skip = {'fscn8001_raw_log', 'gb26875_raw_log', 'ctwing_raw_log', 'iot_telemetry', '_migration_id_map'}
    total = 0
    for table in all_tables:
        if table in skip:
            print(f"[SKIP] {table}: TDengine/Flyway internal")
            continue
        # Check if exists in PG
        pg_cur.execute("""
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_schema='public' AND table_name=%s
        """, (table,))
        if pg_cur.fetchone()[0] == 0:
            print(f"[SKIP] {table}: not in PostgreSQL")
            continue
        total += migrate_table(mysql_cur, pg_cur, pg_conn, table)

    pg_cur.close()
    pg_conn.close()
    mysql_cur.close()
    mysql_conn.close()
    print(f"\nMigration complete! Total rows migrated: {total}")

if __name__ == '__main__':
    main()
