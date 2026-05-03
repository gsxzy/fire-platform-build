import paramiko
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58',22,'root','Zhangcong2255')
_,o,e=ssh.exec_command('/www/server/mysql/bin/mysqld stop 2>/dev/null; echo SEP; /www/server/mysql/bin/mysqld start 2>/dev/null; echo SEP2; sleep 3; ls -la /tmp/mysql.sock 2>/dev/null')
out = o.read().decode('utf-8','ignore')
with open('fix_mysql.txt','w',encoding='utf-8') as f:
    f.write(out)
ssh.close()
print('done')
