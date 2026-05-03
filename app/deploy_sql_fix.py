#!/usr/bin/env python3
"""Fix MySQL SQL execution for old MySQL versions (no IF NOT EXISTS support)"""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Read DB credentials
stdin, stdout, stderr = client.exec_command('cat /opt/my-fire-api/.env')
env_content = stdout.read().decode('utf-8', errors='replace')
env = {}
for line in env_content.splitlines():
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, v = line.split('=', 1)
        env[k] = v

db_user = env.get('DB_USER', 'root')
db_pass = env.get('DB_PASSWORD', '')
db_host = env.get('DB_HOST', 'localhost')
db_name = env.get('DB_NAME', 'fire_platform')

def run_sql(sql, desc):
    cmd = "mysql -u '{}' -p'{}' -h '{}' -e \"{}\"".format(db_user, db_pass, db_host, sql.replace('"', '\\"'))
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if err and 'Warning' not in err:
        print(f'  ! {desc} ERROR: {err[:200]}')
        return False
    else:
        print(f'  ✓ {desc} OK')
        return True

# 1. Check existing columns in device_archive
print('Checking device_archive columns...')
stdin, stdout, stderr = client.exec_command(
    "mysql -u '{}' -p'{}' -h '{}' -N -e \"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='{}' AND TABLE_NAME='device_archive'\"".format(db_user, db_pass, db_host, db_name)
)
columns = [c.strip() for c in stdout.read().decode('utf-8').splitlines() if c.strip()]
print(f'  Existing columns: {columns}')

# 2. Add missing columns one by one
new_cols = [
    ("archive_status", "VARCHAR(16) DEFAULT 'unallocated' COMMENT '档案流程状态'"),
    ("calibration_cycle", "INT DEFAULT 12 COMMENT '校准周期(月)'"),
    ("scrap_year", "INT DEFAULT 10 COMMENT '报废年限(年)'"),
    ("created_by", "VARCHAR(64) DEFAULT NULL COMMENT '录入人'"),
    ("remark", "TEXT DEFAULT NULL COMMENT '备注'"),
]

for col_name, col_def in new_cols:
    if col_name in columns:
        print(f'  SKIP {col_name}: already exists')
    else:
        sql = f"ALTER TABLE device_archive ADD COLUMN {col_name} {col_def}"
        run_sql(sql, f'Add column {col_name}')

# 3. Add index if not exists
print('Checking indexes...')
stdin, stdout, stderr = client.exec_command(
    "mysql -u '{}' -p'{}' -h '{}' -N -e \"SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA='{}' AND TABLE_NAME='device_archive' AND INDEX_NAME='idx_archive_status'\"".format(db_user, db_pass, db_host, db_name)
)
idx_exists = stdout.read().decode().strip()
if idx_exists:
    print('  SKIP idx_archive_status: already exists')
else:
    run_sql("ALTER TABLE device_archive ADD INDEX idx_archive_status (archive_status)", 'Add index idx_archive_status')

# 4. Migrate data
print('Migrating archive_status data...')
run_sql("UPDATE device_archive SET archive_status = 'scrapped' WHERE status = 'scrapped'", 'Migrate scrapped')
run_sql("UPDATE device_archive SET archive_status = 'unallocated' WHERE (archive_status IS NULL OR archive_status = '') AND (unit_id IS NULL OR unit_id = '')", 'Migrate unallocated')
run_sql("UPDATE device_archive SET archive_status = 'allocated' WHERE (archive_status IS NULL OR archive_status = '') AND unit_id IS NOT NULL AND (protocol_device_id IS NULL OR protocol_device_id = '')", 'Migrate allocated')
run_sql("UPDATE device_archive SET archive_status = 'accessed' WHERE (archive_status IS NULL OR archive_status = '') AND unit_id IS NOT NULL AND protocol_device_id IS NOT NULL AND protocol_device_id != ''", 'Migrate accessed')

# 5. Create new tables (use IF NOT EXISTS for tables - this is supported in old MySQL)
print('Creating new tables...')

table_sqls = [
    ("device_access", """
CREATE TABLE IF NOT EXISTS device_access (
  id VARCHAR(32) PRIMARY KEY COMMENT '接入ID',
  device_id VARCHAR(32) NOT NULL COMMENT '设备档案ID',
  unit_id VARCHAR(32) NOT NULL COMMENT '所属单位ID',
  gateway_no VARCHAR(64) DEFAULT NULL COMMENT '网关编号',
  protocol VARCHAR(32) NOT NULL COMMENT '通信协议',
  access_address VARCHAR(128) DEFAULT NULL COMMENT '接入地址/IP',
  port INT DEFAULT NULL COMMENT '端口号',
  heartbeat_interval INT DEFAULT 60 COMMENT '心跳间隔(秒)',
  encrypt_type VARCHAR(32) DEFAULT NULL COMMENT '加密方式',
  access_status VARCHAR(16) DEFAULT 'disconnected' COMMENT '接入状态',
  config_json JSON DEFAULT NULL COMMENT '扩展配置参数',
  last_test_time DATETIME DEFAULT NULL COMMENT '最后测试时间',
  last_test_result VARCHAR(16) DEFAULT NULL COMMENT '最后测试结果',
  fail_reason VARCHAR(255) DEFAULT NULL COMMENT '失败原因',
  created_by VARCHAR(64) DEFAULT NULL COMMENT '创建人',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_device_id (device_id),
  INDEX idx_unit_id (unit_id),
  INDEX idx_access_status (access_status),
  INDEX idx_protocol (protocol),
  FOREIGN KEY (device_id) REFERENCES device_archive(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备接入管理';
"""),
    ("device_allocation_log", """
CREATE TABLE IF NOT EXISTS device_allocation_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(32) NOT NULL COMMENT '设备档案ID',
  unit_id VARCHAR(32) NOT NULL COMMENT '分配到的单位ID',
  building_id VARCHAR(32) DEFAULT NULL COMMENT '建筑ID',
  floor_id VARCHAR(32) DEFAULT NULL COMMENT '楼层ID',
  point_id VARCHAR(32) DEFAULT NULL COMMENT '点位ID',
  action VARCHAR(16) NOT NULL COMMENT '操作: allocate分配/unallocate解除分配/reallocate变更单位',
  operator VARCHAR(64) DEFAULT NULL COMMENT '操作人',
  remark VARCHAR(255) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_device_id (device_id),
  INDEX idx_unit_id (unit_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (device_id) REFERENCES device_archive(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备分配记录';
"""),
    ("device_access_log", """
CREATE TABLE IF NOT EXISTS device_access_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(32) NOT NULL COMMENT '设备档案ID',
  access_id VARCHAR(32) NOT NULL COMMENT '接入记录ID',
  action VARCHAR(16) NOT NULL COMMENT '操作: connect接入/disconnect断开/test测试/reconfig重新配置',
  access_params JSON DEFAULT NULL COMMENT '接入参数快照',
  result VARCHAR(16) DEFAULT NULL COMMENT '结果: success/failed',
  fail_reason VARCHAR(255) DEFAULT NULL COMMENT '失败原因',
  operator VARCHAR(64) DEFAULT NULL COMMENT '操作人',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_device_id (device_id),
  INDEX idx_access_id (access_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (device_id) REFERENCES device_archive(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备接入日志';
"""),
]

for name, sql in table_sqls:
    # Write SQL to temp file and execute
    remote_sql = f'/tmp/create_{name}.sql'
    sftp = client.open_sftp()
    with sftp.file(remote_sql, 'w') as f:
        f.write(sql)
    sftp.close()
    cmd = "mysql -u '{}' -p'{}' -h '{}' '{}' < {}".format(db_user, db_pass, db_host, db_name, remote_sql)
    stdin, stdout, stderr = client.exec_command(cmd)
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if err and 'Warning' not in err:
        print(f'  ! Create {name} ERROR: {err[:200]}')
    else:
        print(f'  ✓ Create {name} OK')

# 6. Migrate existing data to allocation_log
print('Migrating allocation logs...')
cmd = """mysql -u '{}' -p'{}' -h '{}' '{}' -e "INSERT IGNORE INTO device_allocation_log (device_id, unit_id, building_id, floor_id, action, remark) SELECT id as device_id, unit_id, building_id, floor_id, 'allocate' as action, '系统升级：历史数据迁移' as remark FROM device_archive WHERE unit_id IS NOT NULL AND unit_id != ''" """.format(db_user, db_pass, db_host, db_name)
stdin, stdout, stderr = client.exec_command(cmd)
err = stderr.read().decode('utf-8', errors='replace').strip()
if err and 'Warning' not in err:
    print(f'  ! Migrate allocation logs ERROR: {err[:200]}')
else:
    print('  ✓ Migrate allocation logs OK')

client.close()
print('\n✅ SQL fix completed!')
