with open('/opt/my-fire-api-new/dist/app.js', 'r') as f:
    content = f.read()

old = "logger_1.default.error('[Bootstrap] Failed:', err.message);"
new = "console.error('[Bootstrap] Failed:', err); logger_1.default.error('[Bootstrap] Failed:', err.message);"

content = content.replace(old, new)

with open('/opt/my-fire-api-new/dist/app.js', 'w') as f:
    f.write(content)

print('Patched catch block')
