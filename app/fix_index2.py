import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Read current index.js
stdin, stdout, stderr = client.exec_command('cat /opt/my-fire-api/routes/index.js')
content = stdout.read().decode('utf-8', errors='replace')

# Simple replacement: swap the order of legacyRouter and stubRouter
content = content.replace(
    'router.use(legacyRouter);\n\n// 补充业务模块路由（兼容前端所有页面）\nrouter.use(stubRouter);',
    '// 补充业务模块路由（兼容前端所有页面）—— 必须先挂载，避免被 legacyRouter 的通配符拦截\nrouter.use(stubRouter);\n\n// 遗留兼容业务路由（数据迁移过渡）\n// 注意：fireHostApi.js 内部有自己的认证逻辑，此处放在 authMiddleware 之后即可\nrouter.use(legacyRouter);'
)

stdin, stdout, stderr = client.exec_command("cat > /opt/my-fire-api/routes/index.js << 'EOF'\n" + content + "\nEOF")
print('Fixed index.js')
client.close()
