import paramiko
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58',22,'root','Zhangcong2255')
# 测试 dotenv 加载
_,o,e=ssh.exec_command('cd /opt/my-fire-api && node -e "require(\"dotenv\").config(); console.log(\"SOCKET:\", process.env.DB_SOCKET_PATH); console.log(\"HOST:\", process.env.DB_HOST);" 2>&1')
out = o.read().decode('utf-8','ignore')
err = e.read().decode('utf-8','ignore')
with open('node_debug.txt','w',encoding='utf-8') as f:
    f.write('DOTENV TEST:\n')
    f.write(out)
    f.write('\nERR:\n')
    f.write(err)
    f.write('\n---\n')
# 测试 mysql2 直接连接
_,o2,e2=ssh.exec_command('cd /opt/my-fire-api && node -e "const mysql=require(\"mysql2/promise\"); const c={socketPath:\"/tmp/mysql.sock\",user:\"root\",password:\"\",database:\"fire_platform\"}; mysql.createConnection(c).then(conn=>conn.query(\"SELECT 1 as ok\").then(([r])=>{console.log(\"MYSQL OK\",JSON.stringify(r));conn.end();process.exit(0);})).catch(e=>{console.error(\"MYSQL ERR\",e.message);process.exit(1);});" 2>&1')
out2 = o2.read().decode('utf-8','ignore')
err2 = e2.read().decode('utf-8','ignore')
with open('node_debug.txt','a',encoding='utf-8') as f:
    f.write('MYSQL2 TEST:\n')
    f.write(out2)
    f.write('\nERR:\n')
    f.write(err2)
    f.write('\n---\n')
# 检查 node_modules 是否存在
_,o3,_=ssh.exec_command('ls /opt/my-fire-api/node_modules/dotenv 2>/dev/null; echo SEP; ls /opt/my-fire-api/node_modules/mysql2 2>/dev/null')
out3 = o3.read().decode('utf-8','ignore')
with open('node_debug.txt','a',encoding='utf-8') as f:
    f.write('MODULES:\n')
    f.write(out3)
    f.write('\n---\n')
# 检查 .env 文件权限
_,o4,_=ssh.exec_command('ls -la /opt/my-fire-api/.env')
out4 = o4.read().decode('utf-8','ignore')
with open('node_debug.txt','a',encoding='utf-8') as f:
    f.write('ENV PERM:\n')
    f.write(out4)
ssh.close()
print('done')
