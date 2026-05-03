import paramiko
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58',22,'root','Zhangcong2255')
# 测试无密码连接
_,o,e=ssh.exec_command('mysql -uroot -S /tmp/mysql.sock -e "SELECT 1;" 2>&1')
out = o.read().decode('utf-8','ignore')
err = e.read().decode('utf-8','ignore')
with open('db_test.txt','w',encoding='utf-8') as f:
    f.write('NO PASSWORD:\n')
    f.write(out)
    f.write('\nERR:\n')
    f.write(err)
    f.write('\n---\n')
# 测试本地 TCP 连接
_,o2,e2=ssh.exec_command('mysql -uroot -h127.0.0.1 -P3306 -e "SELECT 1;" 2>&1')
out2 = o2.read().decode('utf-8','ignore')
err2 = e2.read().decode('utf-8','ignore')
with open('db_test.txt','a',encoding='utf-8') as f:
    f.write('TCP LOCALHOST:\n')
    f.write(out2)
    f.write('\nERR:\n')
    f.write(err2)
    f.write('\n---\n')
# 检查 MySQL 端口监听
_,o3,_=ssh.exec_command('ss -tlnp | grep 3306; echo SEP; netstat -tlnp 2>/dev/null | grep 3306')
out3 = o3.read().decode('utf-8','ignore')
with open('db_test.txt','a',encoding='utf-8') as f:
    f.write('PORT LISTEN:\n')
    f.write(out3)
    f.write('\n---\n')
# 检查 .env 中是否有其他配置覆盖
_,o4,_=ssh.exec_command('cat /opt/my-fire-api/.env')
out4 = o4.read().decode('utf-8','ignore')
with open('db_test.txt','a',encoding='utf-8') as f:
    f.write('ENV FILE:\n')
    f.write(out4)
ssh.close()
print('done')
