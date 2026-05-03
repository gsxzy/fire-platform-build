import codecs

with open('src/sections/DeviceArchivePage.tsx', 'rb') as f:
    t = f.read().decode('utf-8-sig')

marker = "options: ["
idx = t.find(marker)
if idx > 0:
    end = t.find(']', idx)
    old = t[idx:end+1]
    new = old.replace("]", ", '摄像头', 'GB28181摄像头']")
    t = t.replace(old, new)
    with open('src/sections/DeviceArchivePage.tsx', 'wb') as f:
        f.write(codecs.BOM_UTF8 + t.encode('utf-8'))
    print('Updated DeviceArchivePage.tsx')
else:
    print('Marker not found')
