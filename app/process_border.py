from PIL import Image
import math

# Load the image
img = Image.open(r'D:\wechat\xwechat_files\wxid_ozkfuia8lt3122_a4f4\temp\InputTemp\beab7d0f-b7c0-4147-be97-99415f198575.png').convert('RGBA')
pixels = img.load()
width, height = img.size

# Color centers for background and border frame
bg_center = (29, 36, 51)
frame_center = (40, 60, 90)

def color_distance(c1, c2):
    return math.sqrt((c1[0]-c2[0])**2 + (c1[1]-c2[1])**2 + (c1[2]-c2[2])**2)

# Process each pixel
for y in range(height):
    for x in range(width):
        r, g, b, a = pixels[x, y]
        if a < 100:
            continue
        
        dist_bg = color_distance((r, g, b), bg_center)
        dist_frame = color_distance((r, g, b), frame_center)
        
        # If pixel is close to background or frame color, make it transparent
        if dist_bg < 12 or dist_frame < 38:
            pixels[x, y] = (0, 0, 0, 0)

# Crop to content (remove transparent edges)
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

# Scale up for better quality
scale = 512 / max(img.size)
new_size = (int(img.width * scale), int(img.height * scale))
img = img.resize(new_size, Image.LANCZOS)

# Save
output = r'D:\新致远智慧消防平台\fire-platform-build\app\public\logo.png'
img.save(output, 'PNG', optimize=True)
print(f"Saved: {output}, size: {img.size}")

# Also save to dist
img.save(r'D:\新致远智慧消防平台\fire-platform-build\app\dist\logo.png', 'PNG', optimize=True)
