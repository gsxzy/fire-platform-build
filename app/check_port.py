import paramiko
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58',22,'root','Zhangcong2255')
_,o,_=ssh.exec_command('ss -tlnp | grep 5003; echo SEP; ps aux | grep "node server.js" | grep -v grep; echo SEP2; curl -s http://127.0.0.1:5003/ 2>/dev/null')
out = o.read().decode('utf-8','ignore')
with open('port_check.txt','w',encoding='utf-8') as f:
    f.write(out)
ssh.close()
print('done')
