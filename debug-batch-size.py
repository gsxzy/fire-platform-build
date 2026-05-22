import pymysql, requests

MYSQL = {'host': 'localhost', 'port': 3306, 'user': 'root', 'password': 'Zhangcong2255', 'database': 'fire_platform', 'charset': 'utf8mb4', 'cursorclass': pymysql.cursors.DictCursor}
TD_URL = 'http://localhost:6041/rest/sql/fire_platform_ts'
TD_AUTH = ('root', 'taosdata')

conn = pymysql.connect(**MYSQL)
cur = conn.cursor()

# Get first 1000 rows for device 8C0000000000000000000000
cur.execute("SELECT created_at, direction, cmd_type, hex_data, parsed_json FROM fscn8001_raw_log WHERE device_sn='8C0000000000000000000000' ORDER BY created_at LIMIT 1000")
rows = cur.fetchall()

def safe_nchar(s, maxlen=4000):
    if s is None: return ''
    s = str(s).replace("'", "''")
    return s[:maxlen]

vals = []
for r in rows:
    ts = r['created_at'].strftime('%Y-%m-%d %H:%M:%S')
    direction = safe_nchar(r.get('direction'), 8)
    cmd_type = safe_nchar(r.get('cmd_type'), 16)
    hex_data = safe_nchar(r.get('hex_data'), 8000)
    raw_json = safe_nchar(r.get('parsed_json'), 4000)
    vals.append(f"('{ts}', '{direction}', '{cmd_type}', '{hex_data}', '{raw_json}')")

sql = f"INSERT INTO ctb_raw_fscn8001_8c_test USING stb_raw_log TAGS ('fscn8001', '8C0000000000000000000000') VALUES {','.join(vals)}"

print(f"SQL length: {len(sql)} bytes")
r = requests.post(TD_URL, data=sql.encode('utf-8'), auth=TD_AUTH, timeout=30)
print(f"Response: {r.status_code} {r.text[:500]}")

cur.close()
conn.close()
