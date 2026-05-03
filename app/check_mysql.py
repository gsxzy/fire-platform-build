import paramiko
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58',22,'root','Zhangcong2255')
_,o,e=ssh.exec_command('mysql -uroot -e "SHOW DATABASES;" 2>/dev/null')
out = o.read().decode('utf-8','ignore')
with open('mysql_db.txt','w',encoding='utf-8') as f:
    f.write(out)
_,o2,_=ssh.exec_command('mysql -uroot -e "USE smart_fire; SHOW TABLES;" 2>/dev/null')
out2 = o2.read().decode('utf-8','ignore')
with open('mysql_tables2.txt','w',encoding='utf-8') as f:
    f.write(out2)
ssh.close()
print('done')
