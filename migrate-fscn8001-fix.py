#!/usr/bin/env python3
"""
重新迁移 fscn8001_raw_log 到 TDengine，解决时间戳重复导致的丢失问题。
策略：为每条记录增加毫秒级偏移量，确保同一子表内时间戳唯一。
"""

import pymysql, requests, time

MYSQL = {
    'host': 'localhost', 'port': 3306, 'user': 'root',
    'password': 'Zhangcong2255', 'database': 'fire_platform',
    'charset': 'utf8mb4', 'cursorclass': pymysql.cursors.DictCursor
}

TD_URL = 'http://localhost:6041/rest/sql/fire_platform_ts'
TD_AUTH = ('root', 'taosdata')
BATCH_SIZE = 500


def td_post(sql: str):
    try:
        r = requests.post(TD_URL, data=sql.encode('utf-8'), auth=TD_AUTH, timeout=30)
        if r.status_code != 200:
            return {'status': 'error', 'desc': f'HTTP {r.status_code}: {r.text[:200]}'}
        return r.json()
    except Exception as e:
        return {'status': 'error', 'desc': str(e)}


def safe_nchar(s, maxlen=4000):
    if s is None:
        return ''
    s = str(s).replace("'", "''")
    return s[:maxlen]


def get_child_tables(protocol):
    res = td_post(f"SHOW TABLES LIKE 'ctb_raw_{protocol}_%'")
    tables = []
    if isinstance(res, dict) and 'data' in res:
        for row in res['data']:
            tables.append(row[0])
    return tables


def drop_child_tables(protocol):
    tables = get_child_tables(protocol)
    print(f"   发现 {len(tables)} 个旧子表，正在删除...")
    for t in tables:
        td_post(f"DROP TABLE IF EXISTS {t}")
    remaining = get_child_tables(protocol)
    print(f"   删除后剩余: {len(remaining)}")


def build_batch(tb_name, protocol, device_sn, rows, start_ms_offset=0):
    """rows: list of dicts, start_ms_offset: starting millisecond offset for this batch"""
    vals = []
    for i, r in enumerate(rows):
        base_ts = r['created_at']
        # Add millisecond offset to ensure uniqueness
        offset_ms = start_ms_offset + i
        from datetime import datetime, timedelta
        adjusted_ts = base_ts + timedelta(milliseconds=offset_ms)
        ts_str = adjusted_ts.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]  # millisecond precision
        
        direction = safe_nchar(r.get('direction'), 8)
        cmd_type = safe_nchar(r.get('cmd_type'), 16)
        hex_data = safe_nchar(r.get('hex_data'), 8000)
        raw_json = safe_nchar(r.get('parsed_json'), 4000)
        vals.append(f"('{ts_str}', '{direction}', '{cmd_type}', '{hex_data}', '{raw_json}')")
    
    safe_dev = safe_nchar(device_sn[:100])
    safe_tb = tb_name.lower()
    return f"INSERT INTO {safe_tb} USING stb_raw_log TAGS ('{protocol}', '{safe_dev}') VALUES {','.join(vals)}"


def migrate():
    conn = pymysql.connect(**MYSQL)
    cur = conn.cursor()
    
    cur.execute("SELECT COUNT(*) as cnt FROM fscn8001_raw_log")
    total = cur.fetchone()['cnt']
    print(f"\n📊 fscn8001_raw_log: MySQL 共 {total} 行")
    
    drop_child_tables('fscn8001')
    
    cur.execute("SELECT created_at, direction, cmd_type, hex_data, parsed_json, device_sn FROM fscn8001_raw_log ORDER BY created_at, id")
    
    inserted = 0
    errors = 0
    total_batches = 0
    device_ms_counter = {}  # track ms offset per device
    
    def flush(dev, rows):
        nonlocal inserted, errors, total_batches
        if not rows:
            return
        safe_dev = (dev or 'unknown').lower().replace('-', '_')[:80]
        tb_name = f"ctb_raw_fscn8001_{safe_dev}"
        
        # Get current ms offset for this device
        start_offset = device_ms_counter.get(dev, 0)
        sql = build_batch(tb_name, 'fscn8001', dev or 'unknown', rows, start_offset)
        
        res = td_post(sql)
        affected = 0
        if isinstance(res, dict) and 'data' in res and res['data']:
            affected = res['data'][0][0]
        
        if isinstance(res, dict) and res.get('status') == 'error':
            # Full batch failed, try individual
            for i, single in enumerate(rows):
                ssql = build_batch(tb_name, 'fscn8001', dev or 'unknown', [single], start_offset + i)
                sres = td_post(ssql)
                if isinstance(sres, dict) and sres.get('status') == 'error':
                    errors += 1
                    if errors <= 3:
                        print(f"      ❌ {sres.get('desc', 'unknown')[:100]}")
                else:
                    inserted += 1
                    device_ms_counter[dev] = start_offset + i + 1
        else:
            inserted += affected
            device_ms_counter[dev] = start_offset + len(rows)
            if affected < len(rows):
                print(f"   ⚠️  batch 部分成功: {affected}/{len(rows)} 行 (时间戳重复)")
        
        total_batches += 1
        if total_batches % 20 == 0:
            print(f"   ... 已插入 {inserted} 行，错误 {errors} 行")
        time.sleep(0.02)
    
    current_dev = None
    current_rows = []
    
    for row in cur.fetchall():
        dev = (row['device_sn'] or 'unknown').lower()
        if dev != current_dev and current_rows:
            flush(current_dev, current_rows)
            current_rows = []
        current_dev = dev
        current_rows.append(row)
        
        if len(current_rows) >= BATCH_SIZE:
            flush(current_dev, current_rows)
            current_rows = []
    
    if current_rows:
        flush(current_dev, current_rows)
    
    print(f"   ✅ 完成: 插入 {inserted} / {total} 行，错误 {errors} 行")
    cur.close()
    conn.close()


if __name__ == '__main__':
    print("=" * 60)
    print("TDengine fscn8001 数据重迁（修复时间戳重复）")
    print("=" * 60)
    migrate()
    print("\n🎉 完成！")
