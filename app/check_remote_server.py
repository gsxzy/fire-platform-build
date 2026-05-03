import paramiko
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58',22,'root','Zhangcong2255')
# 查看远程 server.js 内容
_,o,_=ssh.exec_command('head -20 /opt/my-fire-api/server.js')
out = o.read().decode('utf-8','ignore')
with open('remote_server.txt','w',encoding='utf-8') as f:
    f.write(out)
# 检查 package.json
_,o2,_=ssh.exec_command('cat /opt/my-fire-api/package.json')
out2 = o2.read().decode('utf-8','ignore')
with open('remote_package.txt','w',encoding='utf-8') as f:
    f.write(out2)
# 查找 dotenv
_,o3,_=ssh.exec_command('find /opt/my-fire-api/node_modules -maxdepth 2 -name "dotenv" -type d 2>/dev/null; echo SEP; npm list -g dotenv 2>/dev/null')
out3 = o3.read().decode('utf-8','ignore')
with open('remote_package.txt','a',encoding='utf-8') as f:
    f.write('\nDOTENV FIND:\n')
    f.write(out3)
# 查看 PM2 启动日志
_,o4,_=ssh.exec_command('cat /opt/my-fire-api/logs/out.log 2>/dev/null | head -20')
out4 = o4.read().decode('utf-8','ignore')
with open('remote_logs.txt','w',encoding='utf-8') as f:
    f.write(out4)
ssh.close()
print('done')
