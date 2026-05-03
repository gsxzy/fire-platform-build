#!/usr/bin/env python3
"""Deploy unit-device lifecycle refactor to 124.223.35.58"""
import os
import sys
import paramiko
import tarfile
import io

sys.stdout.reconfigure(encoding='utf-8')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── 后端文件映射 ──
backend_files = [
    # 新增路由
    ('/opt/my-fire-api/routes/deviceAllocation.js', os.path.join(BASE_DIR, 'backend', 'routes', 'deviceAllocation.js')),
    ('/opt/my-fire-api/routes/deviceAccess.js',     os.path.join(BASE_DIR, 'backend', 'routes', 'deviceAccess.js')),
    # 修改的路由
    ('/opt/my-fire-api/routes/device.js',           os.path.join(BASE_DIR, 'backend', 'routes', 'device.js')),
    ('/opt/my-fire-api/routes/unit.js',             os.path.join(BASE_DIR, 'backend', 'routes', 'unit.js')),
    ('/opt/my-fire-api/routes/index.js',            os.path.join(BASE_DIR, 'backend', 'routes', 'index.js')),
]

# ── SQL 文件映射 ──
sql_files = [
    ('/opt/my-fire-api/sql/device_lifecycle_tables.sql', os.path.join(BASE_DIR, 'sql', 'device_lifecycle_tables.sql')),
]

# ── 前端 dist 部署 ──
def deploy_dist(client, sftp):
    dist_dir = os.path.join(BASE_DIR, 'dist')
    if not os.path.isdir(dist_dir):
        print('WARNING: dist/ not found, skipping frontend deploy.')
        return False

    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w:gz') as tar:
        for root, dirs, files in os.walk(dist_dir):
            for f in files:
                local_path = os.path.join(root, f)
                arcname = os.path.relpath(local_path, dist_dir)
                tar.add(local_path, arcname=arcname)
    buf.seek(0)
    tar_bytes = buf.read()
    print(f'Packed dist ({len(tar_bytes)} bytes)')

    remote_dir = '/www/wwwroot/fire-platform'
    remote_tar = '/tmp/fire-platform-dist.tar.gz'

    with sftp.file(remote_tar, 'wb') as f:
        f.write(tar_bytes)
    print('Uploaded dist archive')

    cmds = [
        f'rm -rf {remote_dir}/*',
        f'tar -xzf {remote_tar} -C {remote_dir}',
        f'rm -f {remote_tar}',
    ]
    for cmd in cmds:
        stdin, stdout, stderr = client.exec_command(cmd)
        err = stderr.read().decode().strip()
        if err:
            print(f'  ! {err}')
    print('Frontend dist deployed')
    return True

# ── 后端文件部署 ──
def deploy_backend(client, sftp):
    for remote, local in backend_files:
        if not os.path.isfile(local):
            print(f'SKIP: local file not found: {local}')
            continue
        with open(local, 'r', encoding='utf-8') as f:
            content = f.read()
        with sftp.file(remote, 'w') as remote_file:
            remote_file.write(content)
        print(f'Uploaded {os.path.basename(local)} -> {remote}')

# ── SQL 执行 ──
def run_sql(client):
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

    # 上传并执行 SQL
    for remote_sql, local_sql in sql_files:
        if not os.path.isfile(local_sql):
            print(f'SKIP SQL: {local_sql} not found')
            continue
        with open(local_sql, 'r', encoding='utf-8') as f:
            content = f.read()
        sftp = client.open_sftp()
        with sftp.file(remote_sql, 'w') as f:
            f.write(content)
        sftp.close()
        print(f'Uploaded SQL: {os.path.basename(local_sql)}')

        cmd = "mysql -u '{}' -p'{}' -h '{}' '{}' < {}".format(db_user, db_pass, db_host, db_name, remote_sql)
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        if out.strip():
            print(f'  SQL out: {out[:300]}')
        if err.strip():
            print(f'  SQL err: {err[:300]}')
        else:
            print(f'  SQL executed OK')

# ── 重启服务 ──
def restart_backend(client):
    print('Restarting backend via PM2...')
    stdin, stdout, stderr = client.exec_command('/www/server/nodejs/v20.20.0/bin/pm2 restart fire-api --update-env')
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    print('PM2 out:', out[:500])
    if err.strip():
        print('PM2 err:', err[:500])

    # 尝试 reload nginx
    print('Reloading nginx...')
    stdin, stdout, stderr = client.exec_command('nginx -t && nginx -s reload')
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if 'successful' in out or 'test is successful' in out:
        print('Nginx reloaded OK')
    else:
        print('Nginx:', out[:200], err[:200])

# ── 主流程 ──
def main():
    print(f'Connecting to {HOST}...')
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    sftp = client.open_sftp()
    print('Connected.')

    try:
        # 1. 前端
        deploy_dist(client, sftp)

        # 2. 后端文件
        deploy_backend(client, sftp)

        # 3. SQL
        run_sql(client)

        # 4. 重启
        restart_backend(client)

        print('\n✅ Deployment completed!')
    finally:
        sftp.close()
        client.close()

if __name__ == '__main__':
    main()
