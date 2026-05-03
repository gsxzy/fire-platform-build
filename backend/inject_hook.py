with open(r'D:\新致远智慧消防平台\fire-platform-build\backend\dist\app.js', 'rb') as f:
    content = f.read()

hook = b'"use strict";\n'
hook += b"var __path = require('path');\n"
hook += b"var __Module = require('module');\n"
hook += b"var __originalResolveFilename = __Module._resolveFilename;\n"
hook += b"__Module._resolveFilename = function (request, parent, isMain) {\n"
hook += b"  if (request.startsWith('@/')) {\n"
hook += b"    request = __path.join(__dirname, request.replace('@/', ''));\n"
hook += b"  }\n"
hook += b"  return __originalResolveFilename.call(this, request, parent, isMain);\n"
hook += b"};\n"

content = content.replace(b'"use strict";', hook, 1)

with open(r'D:\新致远智慧消防平台\fire-platform-build\backend\dist\app.js', 'wb') as f:
    f.write(content)

print('Hook injected successfully')
