import pymysql

MYSQL = {'host': 'localhost', 'port': 3306, 'user': 'root', 'password': 'Zhangcong2255', 'database': 'fire_platform', 'charset': 'utf8mb4', 'cursorclass': pymysql.cursors.DictCursor}
conn = pymysql.connect(**MYSQL)
cur = conn.cursor()

# Check a few rows from the biggest device
cur.execute("SELECT created_at, direction, cmd_type, LEFT(hex_data, 20) as hex_preview, LEFT(parsed_json, 100) as json_preview FROM fscn8001_raw_log WHERE device_sn='8C0000000000000000000000' LIMIT 3")
for row in cur.fetchall():
    print(row)

# Check if there are any problematic characters
cur.execute("SELECT COUNT(*) as cnt FROM fscn8001_raw_log WHERE parsed_json LIKE '%\\'%'")
print('Rows with single quote in JSON:', cur.fetchone()['cnt'])

cur.execute("SELECT COUNT(*) as cnt FROM fscn8001_raw_log WHERE parsed_json LIKE '%\"%\"%'")
print('Rows with double quotes in JSON:', cur.fetchone()['cnt'])

cur.close()
conn.close()
