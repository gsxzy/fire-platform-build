import paramiko
ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58',22,'root','Zhangcong2255')
_,o,_=ssh.exec_command('iptables -L -n 2>/dev/null | grep 8889; echo SEP; firewall-cmd --list-ports 2>/dev/null; echo SEP2; curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8889/')
out = o.read().decode('utf-8','ignore')
with open('fw_check.txt','w',encoding='utf-8') as f:
    f.write(out)
ssh.close()
print('done')
