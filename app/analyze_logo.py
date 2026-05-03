from PIL import Image
from collections import Counter

img = Image.open(r'D:\wechat\xwechat_files\wxid_ozkfuia8lt3122_a4f4\temp\InputTemp\beab7d0f-b7c0-4147-be97-99415f198575.png').convert('RGBA')
print(f"Size: {img.size}")
print(f"Mode: {img.mode}")

# Sample border pixels
print("\nBorder pixel samples:")
for y in [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 67, 71]:
    for x in [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 97]:
        if x < img.width and y < img.height:
            r, g, b, a = img.getpixel((x, y))
            if a > 50:
                print(f"  ({x:2},{y:2}): RGBA({r:3},{g:3},{b:3},{a:3})")

# Count unique colors
print("\nUnique color groups (rounded to 10):")
color_counts = Counter()
for y in range(img.height):
    for x in range(img.width):
        r, g, b, a = img.getpixel((x, y))
        if a > 100:
            key = (r//10*10, g//10*10, b//10*10)
            color_counts[key] += 1

for c, count in color_counts.most_common(20):
    print(f"  RGB{c}: {count} pixels")
