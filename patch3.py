with open('/opt/my-fire-api-new/dist/app.js','r') as f:
    c = f.read()
old = "logger_1.default.error('[Bootstrap] Failed:', err.message);"
new = "logger_1.default.error('[Bootstrap] Failed:', err.message || err); console.error('[Bootstrap] RAW ERROR:', err);"
if old in c:
    c = c.replace(old, new)
    with open('/opt/my-fire-api-new/dist/app.js','w') as f:
        f.write(c)
    print('patched')
else:
    print('not found')
