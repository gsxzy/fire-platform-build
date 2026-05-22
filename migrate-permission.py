import pymysql
import psycopg2

mysql_conn = pymysql.connect(host='localhost', port=3306, user='root', password='Zhangcong2255', database='fire_platform', charset='utf8mb4', cursorclass=pymysql.cursors.DictCursor)
pg_conn = psycopg2.connect(host='localhost', port=5432, user='fire_user', password='fire_password_2024', database='fire_platform')

mysql_cur = mysql_conn.cursor()
pg_cur = pg_conn.cursor()

mysql_cur.execute("SELECT * FROM sys_permission")
rows = mysql_cur.fetchall()

for row in rows:
    pg_cur.execute('''
        INSERT INTO sys_permission (id, perm_code, perm_name, type, parent_id, path, icon, sort, status, perm_type, component, sort_order, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (perm_code) DO UPDATE SET
            perm_name=EXCLUDED.perm_name, type=EXCLUDED.type, parent_id=EXCLUDED.parent_id,
            path=EXCLUDED.path, icon=EXCLUDED.icon, sort=EXCLUDED.sort, status=EXCLUDED.status,
            perm_type=EXCLUDED.perm_type, component=EXCLUDED.component, sort_order=EXCLUDED.sort_order
    ''', (
        row['id'], row['perm_code'], row['perm_name'], row['type'], row['parent_id'], row['path'], row['icon'],
        row['sort'], row['status'], row['perm_type'], row['component'], row['sort_order'], row['created_at'], row['updated_at']
    ))

pg_conn.commit()
print(f"Migrated {len(rows)} sys_permission rows")

# Now migrate sys_role_permission
mysql_cur.execute("SELECT * FROM sys_role_permission")
rows = mysql_cur.fetchall()
for row in rows:
    pg_cur.execute('''
        INSERT INTO sys_role_permission (role_id, perm_id)
        VALUES (%s, %s)
        ON CONFLICT DO NOTHING
    ''', (row['role_id'], row['perm_id']))
pg_conn.commit()
print(f"Migrated {len(rows)} sys_role_permission rows")

mysql_cur.close()
pg_cur.close()
pg_conn.close()
mysql_conn.close()
