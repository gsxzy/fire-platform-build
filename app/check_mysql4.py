import paramiko
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58',22,'root','Zhangcong2255')
_,o,e=ssh.exec_command('service mysqld restart 2>&1; echo SEP; sleep 2; ls -la /tmp/mysql.sock; echo SEP2; mysql -uroot -S /tmp/mysql.sock -e "SHOW DATABASES;" 2>&1')
out = o.read().decode('utf-8','ignore')
with open('mysql_fix2.txt','w',encoding='utf-8') as f:
    f.write(out)
ssh.close()
print('done')
