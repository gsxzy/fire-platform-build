import paramiko
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58',22,'root','Zhangcong2255')

sftp = ssh.open_sftp()
sftp.put('backend/server.js', '/opt/my-fire-api/server.js')
sftp.close()

# Kill old process and start new one
_,o,e=ssh.exec_command('pkill -f "node /opt/my-fire-api/server.js"; sleep 1; cd /opt/my-fire-api && nohup node server.js > app.log 2>&1 &')
out = o.read().decode('utf-8','ignore')

# Check status
_,o,_=ssh.exec_command('sleep 2; ss -tlnp | grep 5003; echo SEP; cat /opt/my-fire-api/app.log | tail -15')
out = o.read().decode('utf-8','ignore')
with open('server_status.txt','w',encoding='utf-8') as f:
    f.write(out)

ssh.close()
print('done')
