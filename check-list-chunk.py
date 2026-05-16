import re

content = open('app/dist/assets/FireControlRoomListPage-BRjOtWoa.js', encoding='utf-8').read()
imports = re.findall(r'from"([^"]+)"', content)
for imp in set(imports):
    print(imp)
