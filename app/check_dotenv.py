import paramiko
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58',22,'root','Zhangcong2255')
# 检查 dotenv 模块
_,o,_=ssh.exec_command('ls -la /opt/my-fire-api/node_modules/dotenv 2>&1; echo SEP; ls -la /opt/my-fire-api/node_modules/.package-lock.json 2>/dev/null | head -5')
out = o.read().decode('utf-8','ignore')
with open('dotenv_check.txt','w',encoding='utf-8') as f:
    f.write(out)
# 直接运行 server.js 捕获启动错误
_,o2,e2=ssh.exec_command('cd /opt/my-fire-api && node -e "try { require(\"dotenv\"); console.log(\"dotenv found\"); } catch(e) { console.log(\"dotenv missing\", e.message); }" 2>&1')
out2 = o2.read().decode('utf-8','ignore')
err2 = e2.read().decode('utf-8','ignore')
with open('dotenv_check.txt','a',encoding='utf-8') as f:
    f.write('\nDOTENV REQUIRE TEST:\n')
    f.write(out2)
    f.write('\nERR:\n')
    f.write(err2)
# 检查 err.log 中的模块加载错误
_,o3,_=ssh.exec_command('cat /opt/my-fire-api/logs/err.log 2>/dev/null')
out3 = o3.read().decode('utf-8','ignore')
with open('dotenv_check.txt','a',encoding='utf-8') as f:
    f.write('\nERR LOG:\n')
    f.write(out3)
ssh.close()
print('done')
