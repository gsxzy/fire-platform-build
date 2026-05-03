import paramiko

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"

def ssh_exec(cmd):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    try:
        stdin, stdout, stderr = client.exec_command(cmd)
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        return exit_status, out, err
    finally:
        client.close()

# 1. Check alarm data
print("=== fscn8001_alarm 最新10条 ===")
_, out, err = ssh_exec("mysql -u root -p'Zhangcong2255' fire_platform -e \"SELECT id, device_sn, alarm_type, alarm_level, status, alarm_time FROM fscn8001_alarm ORDER BY alarm_time DESC LIMIT 10\"")
print(out)
if err:
    print("ERR:", err)

print("\n=== fscn8001_alarm 最早10条 ===")
_, out, err = ssh_exec("mysql -u root -p'Zhangcong2255' fire_platform -e \"SELECT id, device_sn, alarm_type, alarm_level, status, alarm_time FROM fscn8001_alarm ORDER BY alarm_time ASC LIMIT 10\"")
print(out)
if err:
    print("ERR:", err)

print("\n=== fscn8001_alarm 统计 ===")
_, out, err = ssh_exec("mysql -u root -p'Zhangcong2255' fire_platform -e \"SELECT COUNT(*) as total, MIN(alarm_time) as earliest, MAX(alarm_time) as latest FROM fscn8001_alarm\"")
print(out)
if err:
    print("ERR:", err)

print("\n=== gb26875_alarm 统计 ===")
_, out, err = ssh_exec("mysql -u root -p'Zhangcong2255' fire_platform -e \"SELECT COUNT(*) as total, MIN(created_at) as earliest, MAX(created_at) as latest FROM gb26875_alarm\"")
print(out)
if err:
    print("ERR:", err)
