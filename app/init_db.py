import paramiko
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58',22,'root','Zhangcong2255')

# Create database if not exists
_,o,_=ssh.exec_command('/www/server/mysql/bin/mysql -uroot -S /tmp/mysql.sock -e "CREATE DATABASE IF NOT EXISTS fire_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"')
print(o.read().decode('utf-8','ignore'))

# Execute SQL script
sftp = ssh.open_sftp()
sftp.put('sql/fire_host.sql', '/tmp/fire_host.sql')
sftp.close()

_,o,e=ssh.exec_command('/www/server/mysql/bin/mysql -uroot -S /tmp/mysql.sock fire_platform < /tmp/fire_host.sql 2>&1')
out = o.read().decode('utf-8','ignore')
with open('init_db.txt','w',encoding='utf-8') as f:
    f.write(out)
err = e.read().decode('utf-8','ignore')
with open('init_db_err.txt','w',encoding='utf-8') as f:
    f.write(err)

# Verify tables
_,o,_=ssh.exec_command('/www/server/mysql/bin/mysql -uroot -S /tmp/mysql.sock fire_platform -e "SHOW TABLES;"')
with open('tables.txt','w',encoding='utf-8') as f:
    f.write(o.read().decode('utf-8','ignore'))

ssh.close()
print('done')
