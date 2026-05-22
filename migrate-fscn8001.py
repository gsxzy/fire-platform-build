#!/usr/bin/env python3
import pymysql
import requests
import base64

MYSQL = {'host': 'localhost', 'port': 3306, 'user': 'root', 'password': 'Zhangcong2255', 'database': 'fire_platform', 'charset': 'utf8mb4', 'cursorclass': pymysql.cursors.DictCursor}
URL = 'http://localhost:6041/rest/sql/fire_platform_ts'
AUTH = base64.b64encode(b'root:taosdata').decode()
HEADERS = {'Authorization': f'Basic {AUTH}', 'Content-Type': 'text/plain'}

def td_exec(sql):
    r = requests.post(URL, data=sql.encode('utf-8'), headers=HEADERS, allow_redirects=True, timeout=30)
    d = r.json()
    if d.get('code') != 0:
        raise Exception(f"{d.get('code')}: {d.get('desc')}")
    return d

conn = pymysql.connect(**MYSQL)
cur = conn.cursor()

cur.execute("SELECT COUNT(*) as cnt FROM fscn8001_raw_log")
total = cur.fetchone()['cnt']
print(f'Total fscn8001_raw_log: {total}')

cur.execute("SELECT device_sn FROM fscn8001_raw_log GROUP BY device_sn")
devices = [r['device_sn'] for r in cur.fetchall()]
print(f'Devices: {len(devices)}')

migrated = 0
for dev in devices:
    cur.execute("SELECT created_at, direction, cmd_type, hex_data, parsed_json FROM fscn8001_raw_log WHERE device_sn=%s ORDER BY created_at", (dev,))
    rows = cur.fetchall()
    safe_dev = str(dev).replace("'", "\\'").replace(' ', '_')[:50]
    subtable = f"ctb_raw_fscn8001_{safe_dev}"

    vals = []
    for row in rows:
        ts = row['created_at'].strftime('%Y-%m-%d %H:%M:%S.%f')[:-3] if row['created_at'] else ''
        direction = str(row.get('direction') or '').replace("'", "\\'")[:8]
        cmd_type = str(row.get('cmd_type') or '').replace("'", "\\'")[:16]
        hex_data = str(row.get('hex_data') or '').replace("'", "\\'")[:8000]
        raw_json = str(row.get('parsed_json') or '').replace("'", "\\'")[:4000]
        vals.append(f"('{ts}', '{direction}', '{cmd_type}', '{hex_data}', '{raw_json}')")

    for i in range(0, len(vals), 500):
        chunk = vals[i:i+500]
        sql = f"INSERT INTO {subtable} USING stb_raw_log TAGS ('fscn8001', '{safe_dev}') VALUES {', '.join(chunk)};"
        try:
            td_exec(sql)
            migrated += len(chunk)
        except Exception as e:
            print(f"  ERROR {safe_dev} chunk {i}: {e}")
            for v in chunk:
                try:
                    td_exec(f"INSERT INTO {subtable} USING stb_raw_log TAGS ('fscn8001', '{safe_dev}') VALUES {v};")
                    migrated += 1
                except Exception as e2:
                    pass

    if migrated % 10000 == 0:
        print(f'  ... {migrated}/{total}')

print(f'Done: {migrated}/{total}')
cur.close()
conn.close()
