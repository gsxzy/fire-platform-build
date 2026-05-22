#!/usr/bin/env python3
"""迁移 gb26875_raw_log 和 ctwing_raw_log 到 TDengine"""

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


def build_batch(tb_name, protocol, device_id, rows, has_direction_int=False):
    vals = []
    for r in rows:
        ts = r['created_at'].strftime('%Y-%m-%d %H:%M:%S') if r.get('created_at') else 'NOW()'
        if has_direction_int:
            direction = 'RX' if r.get('direction') == 1 else 'TX'
        else:
            direction = safe_nchar(r.get('direction'), 8)
        cmd_type = safe_nchar(r.get('cmd_type'), 16)
        hex_data = safe_nchar(r.get('hex_data'), 8000)
        raw_json = safe_nchar(r.get('parsed_json') or r.get('raw_json') or r.get('json_data'), 4000)
        vals.append(f"('{ts}', '{direction}', '{cmd_type}', '{hex_data}', '{raw_json}')")
    
    safe_dev = safe_nchar(device_id[:100])
    safe_tb = tb_name.lower()
    return f"INSERT INTO {safe_tb} USING stb_raw_log TAGS ('{protocol}', '{safe_dev}') VALUES {','.join(vals)}"


def migrate(mysql_table, protocol, id_col, has_direction_int=False):
    conn = pymysql.connect(**MYSQL)
    cur = conn.cursor()
    
    cur.execute(f"SELECT COUNT(*) as cnt FROM {mysql_table}")
    total = cur.fetchone()['cnt']
    print(f"\n📊 {mysql_table}: MySQL 共 {total} 行")
    
    drop_child_tables(protocol)
    
    cols = f"created_at, direction, cmd_type, hex_data, parsed_json, {id_col}"
    cur.execute(f"SELECT {cols} FROM {mysql_table} ORDER BY created_at")
    
    inserted = 0
    errors = 0
    total_batches = 0
    
    def flush(dev, rows):
        nonlocal inserted, errors, total_batches
        if not rows:
            return
        safe_dev = (dev or 'unknown').lower().replace('-', '_')[:80]
        tb_name = f"ctb_raw_{protocol}_{safe_dev}"
        sql = build_batch(tb_name, protocol, dev or 'unknown', rows, has_direction_int)
        res = td_post(sql)
        if isinstance(res, dict) and res.get('status') == 'error':
            for single in rows:
                ssql = build_batch(tb_name, protocol, dev or 'unknown', [single], has_direction_int)
                sres = td_post(ssql)
                if isinstance(sres, dict) and sres.get('status') == 'error':
                    errors += 1
                    if errors <= 3:
                        print(f"      ❌ {sres.get('desc', 'unknown')[:100]}")
                else:
                    inserted += 1
        else:
            inserted += len(rows)
        total_batches += 1
        if total_batches % 20 == 0:
            print(f"   ... 已插入 {inserted} 行，错误 {errors} 行")
        time.sleep(0.02)
    
    current_dev = None
    current_rows = []
    
    for row in cur.fetchall():
        dev = (row[id_col] or 'unknown').lower()
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
    print("TDengine gb26875 + ctwing 数据迁移")
    print("=" * 60)
    migrate('gb26875_raw_log', 'gb26875', 'device_id', has_direction_int=True)
    migrate('ctwing_raw_log', 'ctwing', 'device_sn', has_direction_int=False)
    print("\n🎉 全部完成！")
