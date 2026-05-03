import paramiko
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58',22,'root','Zhangcong2255')
# 检查 PM2 配置
_,o,_=ssh.exec_command('cat /opt/my-fire-api/ecosystem.config.js 2>/dev/null; echo SEP; pm2 describe fire-api 2>/dev/null')
out = o.read().decode('utf-8','ignore')
with open('pm2_config.txt','w',encoding='utf-8') as f:
    f.write(out)
# 检查进程环境变量
_,o2,_=ssh.exec_command('cat /proc/$(pm2 pid fire-api)/environ 2>/dev/null | tr "\\0" "\\n" | grep -i DB')
out2 = o2.read().decode('utf-8','ignore')
with open('pm2_env.txt','w',encoding='utf-8') as f:
    f.write(out2)
# 直接测试 node 连接
_,o3,_=ssh.exec_command('cd /opt/my-fire-api && node -e "require(\"dotenv\").config(); console.log(process.env.DB_SOCKET_PATH); console.log(process.env.DB_HOST);"')
out3 = o3.read().decode('utf-8','ignore')
with open('node_env.txt','w',encoding='utf-8') as f:
    f.write(out3)
# 测试 mysql2 连接
_,o4,_=ssh.exec_command('cd /opt/my-fire-api && node -e "require(\"dotenv\").config(); const mysql=require(\"mysql2/promise\"); const c={socketPath:process.env.DB_SOCKET_PATH,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME}; mysql.createConnection(c).then(conn=>conn.query(\"SELECT 1\").then(([r])=>{console.log(\"OK\",r);conn.end();})).catch(e=>console.error(\"ERR\",e.message));"')
out4 = o4.read().decode('utf-8','ignore')
with open('node_mysql_test.txt','w',encoding='utf-8') as f:
    f.write(out4)
ssh.close()
print('done')
