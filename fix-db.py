import subprocess

sql = "ALTER TABLE fire_iot_device ADD COLUMN ctwing_device_id VARCHAR(100) DEFAULT NULL COMMENT 'CTWing设备ID';"

try:
    result = subprocess.run(
        ['mysql', '-uroot', '-pZhangcong2255', 'fire_platform', '-e', sql],
        capture_output=True, text=True, timeout=30
    )
    print('STDOUT:', result.stdout)
    print('STDERR:', result.stderr)
    print('Return code:', result.returncode)
except Exception as e:
    print('Error:', e)
