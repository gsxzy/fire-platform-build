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

cur.execute("SELECT COUNT(*) as cnt FROM iot_telemetry")
total = cur.fetchone()['cnt']
print(f'Total iot_telemetry: {total}')

# Get device mapping
cur.execute("SELECT id, device_sn FROM fire_iot_device")
device_map = {r['id']: r['device_sn'] for r in cur.fetchall()}

cur.execute("SELECT iot_device_id FROM iot_telemetry GROUP BY iot_device_id")
devices = [r['iot_device_id'] for r in cur.fetchall()]

migrated = 0
for iot_id in devices:
    device_sn = device_map.get(iot_id, f"dev_{iot_id}")
    safe_sn = str(device_sn).replace("'", "\\'").replace(' ', '_')[:50]
    subtable = f"ctb_telemetry_{iot_id}"

    cur.execute("SELECT * FROM iot_telemetry WHERE iot_device_id=%s ORDER BY created_at", (iot_id,))
    rows = cur.fetchall()

    vals = []
    for row in rows:
        ts = row['created_at'].strftime('%Y-%m-%d %H:%M:%S.%f')[:-3] if row['created_at'] else ''
        v = [
            f"'{ts}'",
            str(row.get('message_id') or 'NULL'),
            f"'{str(row.get('message_type') or '').replace(chr(39), chr(92)+chr(39))[:32]}'",
            str(row.get('dev_type') or 'NULL'),
            f"'{str(row.get('dev_type_name') or '').replace(chr(39), chr(92)+chr(39))[:64]}'",
            f"'{str(row.get('imei') or '').replace(chr(39), chr(92)+chr(39))[:32]}'",
            f"'{str(row.get('device_model') or '').replace(chr(39), chr(92)+chr(39))[:64]}'",
            str(row.get('rsrp') or 'NULL'),
            str(row.get('snr') or 'NULL'),
            str(row.get('shield') or 'NULL'),
            str(row.get('channel_count') or 'NULL'),
            str(row.get('pressure_kpa') or 'NULL'),
            str(row.get('level_m') or 'NULL'),
            str(row.get('temperature') or 'NULL'),
            str(row.get('battery_pct') or 'NULL'),
            '1' if row.get('has_alarm') else '0',
            '1' if row.get('has_fault') else '0',
            f"'{str(row.get('raw_hex') or '').replace(chr(39), chr(92)+chr(39))[:4000]}'",
        ]
        vals.append(f"({', '.join(v)})")

    for i in range(0, len(vals), 500):
        chunk = vals[i:i+500]
        sql = f"INSERT INTO {subtable} USING stb_telemetry TAGS ({iot_id}, '{safe_sn}') VALUES {', '.join(chunk)};"
        try:
            td_exec(sql)
            migrated += len(chunk)
        except Exception as e:
            print(f"  ERROR {subtable}: {e}")

print(f'Done: {migrated}/{total}')
cur.close()
conn.close()
