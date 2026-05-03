import paramiko
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58',22,'root','Zhangcong2255')
_,o,e=ssh.exec_command('pkill -9 mysqld; echo done')
out = o.read().decode('utf-8','ignore')
with open('kill_mysql.txt','w',encoding='utf-8') as f:
    f.write(out)
ssh.close()
print('done')
