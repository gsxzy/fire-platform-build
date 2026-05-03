import paramiko
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58',22,'root','Zhangcong2255')
_,o,e=ssh.exec_command('ps aux | grep mysqld | grep -v grep; echo SEP; ls -la /tmp/mysql.sock 2>/dev/null; echo SEP2; /www/server/mysql/bin/mysql -uroot -e "SHOW DATABASES;" 2>&1')
out = o.read().decode('utf-8','ignore')
with open('mysql_status.txt','w',encoding='utf-8') as f:
    f.write(out)
ssh.close()
print('done')
