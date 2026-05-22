#!/usr/bin/env python3
"""
迁移 MySQL 中缺失的 raw_log 数据到 TDengine
策略：删除旧子表 → 全量重新迁移（确保数据完整性）
"""

import pymysql, requests, sys, time

MYSQL = {
    'host': 'localhost', 'port': 3306, 'user': 'root',
    'password': 'Zhangcong2255', 'database': 'fire_platform',
    'charset': 'utf8mb4', 'cursorclass': pymysql.cursors.DictCursor
}

TD_URL = 'http://localhost:6041/rest/sql/fire_platform_ts'
TD_AUTH = ('root', 'taosdata')
BATCH_SIZE = 500  # 每批条数（TDengine REST 单条 SQL 建议 < 1MB）


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


def get_all_child_tables(protocol):
    """获取某 protocol 下的所有子表名"""
    # 使用 SHOW TABLES LIKE
    res = td_post(f"SHOW TABLES LIKE 'ctb_raw_{protocol}_%'")
    tables = []
    if isinstance(res, dict) and 'data' in res:
        for row in res['data']:
            tables.append(row[0])
    return tables


def drop_child_tables(protocol):
    tables = get_all_child_tables(protocol)
    print(f"   发现 {len(tables)} 个旧子表，正在删除...")
    for t in tables:
        td_post(f"DROP TABLE IF EXISTS {t}")
    # 验证
    remaining = get_all_child_tables(protocol)
    print(f"   删除后剩余: {len(remaining)}")


def build_batch_insert(tb_name, protocol, device_sn, rows):
    vals = []
    for r in rows:
        ts = r['created_at'].strftime('%Y-%m-%d %H:%M:%S') if r.get('created_at') else 'NOW()'
        direction = safe_nchar(r.get('direction'), 8)
        cmd_type = safe_nchar(r.get('cmd_type'), 16)
        hex_data = safe_nchar(r.get('hex_data'), 8000)
        # MySQL 列名可能是 parsed_json 或 raw_json
        raw_json = safe_nchar(r.get('parsed_json') or r.get('raw_json') or r.get('json_data'), 4000)
        vals.append(f"('{ts}', '{direction}', '{cmd_type}', '{hex_data}', '{raw_json}')")
    
    safe_dev = safe_nchar(device_sn[:100])
    safe_tb = tb_name.lower()  # TDengine 3.x 表名自动转小写
    return f"INSERT INTO {safe_tb} USING stb_raw_log TAGS ('{protocol}', '{safe_dev}') VALUES {','.join(vals)}"


def migrate_table(mysql_table, protocol):
    conn = pymysql.connect(**MYSQL)
    cur = conn.cursor()
    
    cur.execute(f"SELECT COUNT(*) as cnt FROM {mysql_table}")
    total = cur.fetchone()['cnt']
    print(f"\n📊 {mysql_table}: MySQL 共 {total} 行")
    
    # 删除旧数据
    drop_child_tables(protocol)
    
    # 全量迁移
    cur.execute(f"SELECT created_at, direction, cmd_type, hex_data, parsed_json, device_sn FROM {mysql_table} ORDER BY created_at")
    
    device_batches = {}  # device_sn -> list of rows
    inserted = 0
    errors = 0
    total_batches = 0
    
    def flush_device(dev_sn, rows):
        nonlocal inserted, errors, total_batches
        if not rows:
            return
        safe_dev = (dev_sn or 'unknown').lower().replace('-', '_')[:80]
        tb_name = f"ctb_raw_{protocol}_{safe_dev}"
        sql = build_batch_insert(tb_name, protocol, dev_sn or 'unknown', rows)
        res = td_post(sql)
        if isinstance(res, dict) and res.get('status') == 'error':
            # 降级单条
            for single in rows:
                ssql = build_batch_insert(tb_name, protocol, dev_sn or 'unknown', [single])
                sres = td_post(ssql)
                if isinstance(sres, dict) and sres.get('status') == 'error':
                    errors += 1
                    if errors <= 5:
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
        dev = (row['device_sn'] or 'unknown').lower()
        if dev != current_dev and current_rows:
            flush_device(current_dev, current_rows)
            current_rows = []
        current_dev = dev
        current_rows.append(row)
        
        if len(current_rows) >= BATCH_SIZE:
            flush_device(current_dev, current_rows)
            current_rows = []
    
    if current_rows:
        flush_device(current_dev, current_rows)
    
    print(f"   ✅ 完成: 插入 {inserted} / {total} 行，错误 {errors} 行")
    cur.close()
    conn.close()


if __name__ == '__main__':
    print("=" * 60)
    print("TDengine 历史数据全量重迁")
    print("=" * 60)
    migrate_table('fscn8001_raw_log', 'fscn8001')
    migrate_table('gb26875_raw_log', 'gb26875')
    migrate_table('ctwing_raw_log', 'ctwing')
    print("\n🎉 全部完成！")
