import pymysql
import psycopg2

mysql_conn = pymysql.connect(host='localhost', port=3306, user='root', password='Zhangcong2255', database='fire_platform', charset='utf8mb4', cursorclass=pymysql.cursors.DictCursor)
pg_conn = psycopg2.connect(host='localhost', port=5432, user='fire_user', password='fire_password_2024', database='fire_platform')

mysql_cur = mysql_conn.cursor()
pg_cur = pg_conn.cursor()

tables = ['fscn8001_alarm', 'fscn8001_device', 'gb26875_device', 'gb26875_alarm', 'sys_refresh_tokens']
for table in tables:
    mysql_cur.execute(f"SELECT * FROM `{table}`")
    rows = mysql_cur.fetchall()
    if not rows:
        print(f"[SKIP] {table}: empty")
        continue

    # Get column names from MySQL
    mysql_cur.execute(f"SHOW COLUMNS FROM `{table}`")
    mysql_cols = [r['Field'] for r in mysql_cur.fetchall()]

    # Filter to columns that exist in PG
    pg_cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=%s", (table,))
    pg_cols = {r[0] for r in pg_cur.fetchall()}
    common_cols = [c for c in mysql_cols if c in pg_cols]

    col_str = ', '.join(f'"{c}"' for c in common_cols)
    placeholders = ', '.join(['%s'] * len(common_cols))

    count = 0
    for row in rows:
        try:
            values = [row[c] for c in common_cols]
            pg_cur.execute(f'INSERT INTO "{table}" ({col_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING', values)
            count += 1
        except Exception as e:
            print(f"  [ERROR] {table} id={row.get('id')}: {e}")
            pg_conn.rollback()

    pg_conn.commit()
    print(f"[DONE] {table}: {count}/{len(rows)} rows migrated")

mysql_cur.close()
pg_cur.close()
pg_conn.close()
mysql_conn.close()
