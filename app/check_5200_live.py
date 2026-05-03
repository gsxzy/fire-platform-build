import paramiko
import time

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"

def check():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    with open('5200_live.txt', 'w', encoding='utf-8') as f:
        # 1. Check active connections on 5200
        f.write('=== 5200端口活跃连接 ===\n')
        stdin, stdout, stderr = client.exec_command('ss -tnp | grep 5200')
        out = stdout.read().decode('utf-8', errors='replace').strip()
        f.write(out if out else '(无活跃连接)\n')
        f.write('\n')

        # 2. Check recent GB26875 logs (last 50 lines)
        f.write('=== 最近GB26875日志 (最后50行) ===\n')
        stdin, stdout, stderr = client.exec_command('tail -n 50 /opt/my-fire-api/logs/out.log')
        out = stdout.read().decode('utf-8', errors='replace').strip()
        f.write(out + '\n')
        f.write('\n')

        # 3. Check raw log count in DB
        f.write('=== 数据库记录统计 ===\n')
        stdin, stdout, stderr = client.exec_command('mysql -e "SELECT COUNT(*) as raw_logs FROM fire_platform.gb26875_raw_log; SELECT COUNT(*) as devices FROM fire_platform.gb26875_device; SELECT COUNT(*) as alarms FROM fire_platform.gb26875_alarm;" 2>/dev/null || echo "mysql failed"')
        out = stdout.read().decode('utf-8', errors='replace').strip()
        f.write(out + '\n')
        f.write('\n')

        # 4. Show last 10 raw logs if any
        f.write('=== 最近10条原始报文 ===\n')
        stdin, stdout, stderr = client.exec_command('mysql -e "SELECT id, device_id, cmd_type, hex_data, created_at FROM fire_platform.gb26875_raw_log ORDER BY id DESC LIMIT 10;" 2>/dev/null || echo "no data"')
        out = stdout.read().decode('utf-8', errors='replace').strip()
        f.write(out + '\n')

    client.close()
    print('done')

check()
