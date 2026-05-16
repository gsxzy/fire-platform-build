import re, os

content = open('/www/wwwroot/fire-platform/assets/FireControlRoomPage-Du4qEtlc.js').read()
imports = re.findall(r'from"([^"]+)"', content)
base = '/www/wwwroot/fire-platform/assets'
missing = []
for imp in set(imports):
    path = os.path.join(base, imp)
    if not os.path.isfile(path):
        missing.append(imp)
if missing:
    for m in missing:
        print('MISSING:', m)
else:
    print('All imports found')
