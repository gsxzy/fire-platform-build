import re
path = r'D:\新致远智慧消防平台\fire-platform-build\app\src\sections\FireControlRoomPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

m = re.search(r'emptyText="([^"]*)"', content)
if m:
    val = m.group(1)
    print('emptyText value:', repr(val))
    print('Length:', len(val))
    for c in val:
        if ord(c) < 32:
            print('Special char found:', repr(c))
