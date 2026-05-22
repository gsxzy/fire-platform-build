#!/usr/bin/env python3
"""
Migrate time-series data from MySQL to TDengine
Tables: fscn8001_raw_log, gb26875_raw_log, ctwing_raw_log, iot_telemetry
"""
import pymysql
import requests
import base64
import json
from datetime import datetime

MYSQL_CONFIG = {
    'host': 'localhost', 'port': 3306, 'user': 'root',
    'password': 'Zhangcong2255', 'database': 'fire_platform', 'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor,
}

TD_URL = 'http://localhost:6041/rest/sql/fire_platform_ts'
TD_AUTH = base64.b64encode(b'root:taosdata').decode()
TD_HEADERS = {'Authorization': f'Basic {TD_AUTH}', 'Content-Type': 'text/plain'}

def td_exec(sql):
    r = requests.post(TD_URL, data=sql.encode('utf-8'), headers=TD_HEADERS, allow_redirects=True, timeout=30)
    if r.status_code != 200:
        raise Exception(f'HTTP {r.status_code}: {r.text[:200]}')
    data = r.json()
    if data.get('code') != 0:
        raise Exception(f'TDengine error {data.get("code")}: {data.get("desc")}')
    return data

def escape_nchar(s, max_len):
    if s is None:
        return ''
    s = str(s).replace("'", "\\'")
    if len(s) > max_len:
        s = s[:max_len]
    return s

def migrate_raw_log(mysql_cur, table, protocol_type, device_id_col, direction_map=None):
    mysql_cur.execute(f"SELECT COUNT(*) as cnt FROM `{table}`")
    total = mysql_cur.fetchone()['cnt']
    if total == 0:
        print(f'  [SKIP] {table}: empty')
        return 0

    print(f'  [MIGRATE] {table}: {total} rows')

    # Get all distinct device IDs
    mysql_cur.execute(f"SELECT DISTINCT `{device_id_col}` FROM `{table}` WHERE `{device_id_col}` IS NOT NULL")
    devices = [r[device_id_col] for r in mysql_cur.fetchall()]
    print(f'    Devices: {len(devices)}')

    migrated = 0
    chunk_size = 1000

    for device_id in devices:
        safe_device_id = str(device_id).replace("'", "\\'").replace(' ', '_')[:50]
        subtable = f"ctb_raw_{protocol_type}_{safe_device_id}"

        # Fetch rows for this device
        mysql_cur.execute(
            f"SELECT * FROM `{table}` WHERE `{device_id_col}` = %s ORDER BY created_at",
            (device_id,)
        )
        rows = mysql_cur.fetchall()
        if not rows:
            continue

        # Build batch INSERT
        values_list = []
        for row in rows:
            direction = row.get('direction')
            if direction_map:
                direction = direction_map.get(str(direction), str(direction))
            direction = escape_nchar(direction, 8) or ''
            cmd_type = escape_nchar(row.get('cmd_type'), 16) or ''
            hex_data = escape_nchar(row.get('hex_data'), 8000) or ''
            raw_json = escape_nchar(row.get('parsed_json', row.get('raw_json')), 4000) or ''
            ts = row['created_at'].strftime('%Y-%m-%d %H:%M:%S.%f')[:-3] if row['created_at'] else ''
            values_list.append(f"('{ts}', '{direction}', '{cmd_type}', '{hex_data}', '{raw_json}')")

        # Insert in chunks
        for i in range(0, len(values_list), chunk_size):
            chunk = values_list[i:i+chunk_size]
            sql = f"INSERT INTO {subtable} USING stb_raw_log TAGS ('{protocol_type}', '{safe_device_id}') VALUES {', '.join(chunk)};"
            try:
                td_exec(sql)
                migrated += len(chunk)
            except Exception as e:
                print(f"    [ERROR] {subtable} chunk {i}: {e}")
                # Try single row
                for j, val in enumerate(chunk):
                    try:
                        single_sql = f"INSERT INTO {subtable} USING stb_raw_log TAGS ('{protocol_type}', '{safe_device_id}') VALUES {val};"
                        td_exec(single_sql)
                        migrated += 1
                    except Exception as e2:
                        if j < 3:
                            print(f"      [ROW ERROR] {e2}")

        if migrated % 10000 == 0:
            print(f'    ... {migrated}/{total}')

    print(f'  [DONE] {table}: {migrated}/{total} rows migrated')
    return migrated

def migrate_iot_telemetry(mysql_cur):
    table = 'iot_telemetry'
    mysql_cur.execute(f"SELECT COUNT(*) as cnt FROM `{table}`")
    total = mysql_cur.fetchone()['cnt']
    if total == 0:
        print(f'  [SKIP] {table}: empty')
        return 0

    print(f'  [MIGRATE] {table}: {total} rows')

    mysql_cur.execute(f"SELECT DISTINCT iot_device_id, device_sn FROM `{table}`")
    devices = mysql_cur.fetchall()

    migrated = 0
    chunk_size = 1000

    for dev in devices:
        iot_device_id = dev['iot_device_id']
        device_sn = str(dev.get('device_sn', '')).replace("'", "\\'")[:50] or f'dev_{iot_device_id}'
        subtable = f"ctb_telemetry_{iot_device_id}"

        mysql_cur.execute(f"SELECT * FROM `{table}` WHERE iot_device_id = %s ORDER BY created_at", (iot_device_id,))
        rows = mysql_cur.fetchall()

        values_list = []
        for row in rows:
            ts = row['created_at'].strftime('%Y-%m-%d %H:%M:%S.%f')[:-3] if row['created_at'] else ''
            vals = [
                f"'{ts}'",
                str(row.get('message_id') or 'NULL'),
                f"'{escape_nchar(row.get('message_type'), 32)}'",
                str(row.get('dev_type') or 'NULL'),
                f"'{escape_nchar(row.get('dev_type_name'), 64)}'",
                f"'{escape_nchar(row.get('imei'), 32)}'",
                f"'{escape_nchar(row.get('device_model'), 64)}'",
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
                f"'{escape_nchar(row.get('raw_hex'), 4000)}'",
            ]
            values_list.append(f"({', '.join(vals)})")

        for i in range(0, len(values_list), chunk_size):
            chunk = values_list[i:i+chunk_size]
            sql = f"INSERT INTO {subtable} USING stb_telemetry TAGS ({iot_device_id}, '{device_sn}') VALUES {', '.join(chunk)};"
            try:
                td_exec(sql)
                migrated += len(chunk)
            except Exception as e:
                print(f"    [ERROR] {subtable} chunk {i}: {e}")
                for j, val in enumerate(chunk):
                    try:
                        single_sql = f"INSERT INTO {subtable} USING stb_telemetry TAGS ({iot_device_id}, '{device_sn}') VALUES {val};"
                        td_exec(single_sql)
                        migrated += 1
                    except Exception as e2:
                        if j < 3:
                            print(f"      [ROW ERROR] {e2}")

    print(f'  [DONE] {table}: {migrated}/{total} rows migrated')
    return migrated

def main():
    print("Connecting to MySQL...")
    mysql_conn = pymysql.connect(**MYSQL_CONFIG)
    mysql_cur = mysql_conn.cursor()

    total = 0
    total += migrate_raw_log(mysql_cur, 'fscn8001_raw_log', 'fscn8001', 'device_sn')
    total += migrate_raw_log(mysql_cur, 'gb26875_raw_log', 'gb26875', 'device_id', direction_map={'1': 'RX', '2': 'TX'})
    total += migrate_raw_log(mysql_cur, 'ctwing_raw_log', 'ctwing', 'device_id')
    total += migrate_iot_telemetry(mysql_cur)

    mysql_cur.close()
    mysql_conn.close()
    print(f"\nTotal time-series rows migrated: {total}")

if __name__ == '__main__':
    main()
