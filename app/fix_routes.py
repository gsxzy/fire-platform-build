import re

path = r'D:\新致远智慧消防平台\fire-platform-build\app\backend\fireHostApi.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Comment out migrated device routes in fireHostApi.js
# Routes to comment out:
# - GET /devices/:id
# - POST /devices
# - PUT /devices/:id
# - DELETE /devices/:id

# Pattern: router.get('/devices/:id', async (req, res) => { ... });
# Pattern: router.post('/devices', async (req, res) => { ... });
# Pattern: router.put('/devices/:id', async (req, res) => { ... });
# Pattern: router.delete('/devices/:id', async (req, res) => { ... });

patterns = [
    r"// GET /api/devices/:id - 通用设备详情\nrouter\.get\('/devices/:id', async \(req, res\) => \{[\s\S]*?\}\);",
    r"// POST /api/devices - 新增通用设备\nrouter\.post\('/devices', async \(req, res\) => \{[\s\S]*?\}\);",
    r"// PUT /api/devices/:id - 编辑通用设备\nrouter\.put\('/devices/:id', async \(req, res\) => \{[\s\S]*?\}\);",
    r"// DELETE /api/devices/:id - 删除通用设备\nrouter\.delete\('/devices/:id', async \(req, res\) => \{[\s\S]*?\}\);",
]

for pattern in patterns:
    match = re.search(pattern, content)
    if match:
        block = match.group(0)
        commented = '\n'.join('// [MIGRATED] ' + line for line in block.split('\n'))
        content = content.replace(block, commented)
        print('Commented out migrated route block')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
