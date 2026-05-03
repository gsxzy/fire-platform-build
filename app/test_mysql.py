import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

# Test SHOW CREATE TABLE
cmd = 'mysql -N'
stdin, stdout, stderr = ssh.exec_command(cmd)
stdin.write("SHOW CREATE TABLE fire_platform.bus_panel;\n")
stdin.channel.shutdown_write()
exit_code = stdout.channel.recv_exit_status()
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print('EXIT:', exit_code)
print('ERR:', repr(err))
print('OUT LEN:', len(out))
print('OUT:')
print(repr(out[:1000]))

# Test SHOW TABLES
cmd2 = 'mysql -N'
stdin2, stdout2, stderr2 = ssh.exec_command(cmd2)
stdin2.write("SHOW TABLES FROM fire_platform;\n")
stdin2.channel.shutdown_write()
exit_code2 = stdout2.channel.recv_exit_status()
out2 = stdout2.read().decode('utf-8', errors='replace')
print('\n\nTABLES EXIT:', exit_code2)
print('TABLES:', repr(out2[:500]))

ssh.close()
