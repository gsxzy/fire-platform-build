import paramiko
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58',22,'root','Zhangcong2255')
_,o,e=ssh.exec_command('cd /opt/my-fire-api && node server.js 2>&1')
out = o.read().decode('utf-8','ignore')
err = e.read().decode('utf-8','ignore')
with open('server_debug.txt','w',encoding='utf-8') as f:
    f.write('STDOUT:\n' + out + '\nSTDERR:\n' + err)
ssh.close()
print('done')
