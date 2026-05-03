import paramiko

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# All in one query
stdin, stdout, stderr = client.exec_command(
    "mysql -u root -p'Zhangcong2255' fire_platform -e \""
    "SELECT t.TABLE_NAME, t.TABLE_ROWS, COUNT(s.INDEX_NAME) as idx_count "
    "FROM information_schema.TABLES t "
    "LEFT JOIN information_schema.STATISTICS s ON t.TABLE_NAME=s.TABLE_NAME AND t.TABLE_SCHEMA=s.TABLE_SCHEMA "
    "WHERE t.TABLE_SCHEMA='fire_platform' GROUP BY t.TABLE_NAME ORDER BY t.TABLE_ROWS DESC"
    "\" 2>/dev/null"
)
out = stdout.read().decode('utf-8', errors='replace')
print("=== Tables (rows, indexes) ===")
for line in out.split('\n'):
    if line.strip():
        safe = ''.join(c if ord(c) < 128 else '?' for c in line)
        print(safe)

client.close()
