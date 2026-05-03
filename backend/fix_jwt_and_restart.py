import paramiko
import secrets
import base64
import sys

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'
REMOTE_API = '/opt/my-fire-api'

# Generate a secure random JWT secret
jwt_secret = base64.b64encode(secrets.token_bytes(48)).decode('ascii')
print('Generated JWT_SECRET:', jwt_secret[:10] + '...')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

try:
    # Read current .env
    stdin, stdout, stderr = client.exec_command('cat ' + REMOTE_API + '/.env')
    env_content = stdout.read().decode('utf-8', errors='replace')
    
    # Replace JWT_SECRET line
    new_env = []
    replaced = False
    for line in env_content.split('\n'):
        if line.startswith('JWT_SECRET='):
            new_env.append('JWT_SECRET=' + jwt_secret)
            replaced = True
        else:
            new_env.append(line)
    if not replaced:
        new_env.append('JWT_SECRET=' + jwt_secret)
    
    # Write back
    new_env_str = '\n'.join(new_env)
    sftp = client.open_sftp()
    with sftp.file(REMOTE_API + '/.env', 'w') as f:
        f.write(new_env_str.encode('utf-8'))
    sftp.close()
    print('Updated .env with new JWT_SECRET')
    
    # Restart PM2
    stdin, stdout, stderr = client.exec_command('/www/server/nodejs/v20.20.0/bin/pm2 restart fire-api 2>&1')
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    print('PM2 restart output:', out[:200] if out else '(no output)')
    if err.strip():
        print('PM2 err:', err[:200])
    
    # Wait and check health
    import time
    time.sleep(3)
    
    stdin, stdout, stderr = client.exec_command('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5003/health')
    status_code = stdout.read().decode('utf-8', errors='replace').strip()
    print('Health check HTTP code:', status_code)
    
    stdin, stdout, stderr = client.exec_command('/www/server/nodejs/v20.20.0/bin/pm2 show fire-api 2>&1 | grep status')
    pm2_status = stdout.read().decode('utf-8', errors='replace').strip()
    print('PM2 status:', pm2_status)
    
    print('\nDone!')
finally:
    client.close()
