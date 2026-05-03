import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Read current index.js
stdin, stdout, stderr = client.exec_command('cat /opt/my-fire-api/routes/index.js')
content = stdout.read().decode('utf-8', errors='replace')

# Add stub router import and mount
if "const stubRouter = require('./stub');" not in content:
    content = content.replace(
        "const legacyRouter = require('../fireHostApi');",
        "const legacyRouter = require('../fireHostApi');\nconst stubRouter = require('./stub');"
    )

if "router.use(stubRouter);" not in content:
    content = content.replace(
        "router.use(legacyRouter);",
        "router.use(legacyRouter);\n\n// 补充业务模块路由（兼容前端所有页面）\nrouter.use(stubRouter);"
    )

# Write back
stdin, stdout, stderr = client.exec_command("cat > /opt/my-fire-api/routes/index.js << 'EOF'\n" + content + "\nEOF")
print('Updated routes/index.js')
print(stderr.read().decode('utf-8', errors='replace'))
client.close()
