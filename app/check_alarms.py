import pymysql
conn = pymysql.connect(
    host='124.223.35.58',
    port=3306,
    user='root',
    password='Zhangcong2255',
    database='fire_platform',
    charset='utf8mb4'
)
try:
    with conn.cursor() as cur:
        cur.execute("SHOW TABLES LIKE '%alarm%'")
        tables = [r[0] for r in cur.fetchall()]
        print('Alarm tables:', tables)
        
        if 'fscn8001_alarm' in tables:
            cur.execute('SELECT COUNT(*) FROM fscn8001_alarm')
            print('fscn8001_alarm count:', cur.fetchone()[0])
            cur.execute("SELECT id, device_sn, alarm_type, alarm_level, status, alarm_time FROM fscn8001_alarm ORDER BY alarm_time DESC LIMIT 10")
            print('Latest 10 fscn8001_alarm:')
            for r in cur.fetchall():
                print(r)
        
        if 'fire_alarms' in tables:
            cur.execute('SELECT COUNT(*) FROM fire_alarms')
            print('fire_alarms count:', cur.fetchone()[0])
            cur.execute("SELECT id, unit_name, alarm_type, status, alarm_time FROM fire_alarms ORDER BY alarm_time DESC LIMIT 10")
            print('Latest 10 fire_alarms:')
            for r in cur.fetchall():
                print(r)
finally:
    conn.close()
