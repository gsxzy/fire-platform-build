import paramiko
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58',22,'root','Zhangcong2255')
_,o,e=ssh.exec_command('ls -la /tmp/*.sock 2>/dev/null; echo SEP; find /www/server -name "*.sock" 2>/dev/null; echo SEP2; cat /www/server/data/*.err 2>/dev/null | tail -20')
out = o.read().decode('utf-8','ignore')
with open('mysql_sock.txt','w',encoding='utf-8') as f:
    f.write(out)
ssh.close()
print('done')
