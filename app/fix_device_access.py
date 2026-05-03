import codecs

with open('src/sections/DeviceAccessPage.tsx', 'rb') as f:
    content = f.read()

text = content.decode('utf-8-sig')

# Add camera categories after iot-sensor
old = "  'iot-sensor': { label: 'IoT传感器', icon: Signal, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },\n  /* 数据库种子中的额外分类 */"
new = "  'iot-sensor': { label: 'IoT传感器', icon: Signal, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },\n  'camera': { label: '摄像头', icon: CameraIcon, color: 'text-blue-400', bg: 'bg-blue-500/10' },\n  'gb28181-camera': { label: '国标摄像头', icon: Video, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },\n  /* 数据库种子中的额外分类 */"

if old in text:
    text = text.replace(old, new)
    with open('src/sections/DeviceAccessPage.tsx', 'wb') as f:
        f.write(codecs.BOM_UTF8 + text.encode('utf-8'))
    print('Updated categoryConfig')
else:
    print('Old text not found')
    # Debug: find iot-sensor line
    for i, line in enumerate(text.split('\n')):
        if 'iot-sensor' in line:
            print(f'Line {i}: {repr(line)}')
