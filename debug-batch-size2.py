import pymysql, requests

MYSQL = {'host': 'localhost', 'port': 3306, 'user': 'root', 'password': 'Zhangcong2255', 'database': 'fire_platform', 'charset': 'utf8mb4', 'cursorclass': pymysql.cursors.DictCursor}
TD_URL = 'http://localhost:6041/rest/sql/fire_platform_ts'
TD_AUTH = ('root', 'taosdata')

conn = pymysql.connect(**MYSQL)
cur = conn.cursor()

# Check timestamp uniqueness for device 8C
cur.execute("SELECT created_at, COUNT(*) as cnt FROM fscn8001_raw_log WHERE device_sn='8C0000000000000000000000' GROUP BY created_at HAVING cnt > 1 LIMIT 5")
print('Duplicate timestamps:', cur.fetchall())

# Get total rows for this device
cur.execute("SELECT COUNT(*) as cnt FROM fscn8001_raw_log WHERE device_sn='8C0000000000000000000000'")
print('Total rows:', cur.fetchone()['cnt'])

# Get first 10 rows with timestamps
cur.execute("SELECT created_at, LEFT(hex_data, 20) as hex FROM fscn8001_raw_log WHERE device_sn='8C0000000000000000000000' ORDER BY created_at LIMIT 10")
for r in cur.fetchall():
    print(r)

cur.close()
conn.close()
