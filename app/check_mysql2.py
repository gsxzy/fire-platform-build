import paramiko
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58',22,'root','Zhangcong2255')
_,o,e=ssh.exec_command('mysql -uroot -S /tmp/mysql.sock -e "SHOW DATABASES;" 2>&1')
out = o.read().decode('utf-8','ignore')
with open('mysql_db2.txt','w',encoding='utf-8') as f:
    f.write(out)
err = e.read().decode('utf-8','ignore')
with open('mysql_err2.txt','w',encoding='utf-8') as f:
    f.write(err)
ssh.close()
print('done')
