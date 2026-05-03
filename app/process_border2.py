from PIL import Image

# Load original small image
img = Image.open(r'D:\wechat\xwechat_files\wxid_ozkfuia8lt3122_a4f4\temp\InputTemp\beab7d0f-b7c0-4147-be97-99415f198575.png').convert('RGBA')
pixels = img.load()
w, h = img.size

# Create mask for shield region
mask = [[False]*h for _ in range(w)]

# Step 1: Find seed pixels (characteristic shield colors)
seeds = []
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if a < 100:
            continue
        # Red/orange flame
        if r > 140 and g < 130 and b < 130:
            seeds.append((x, y))
        # Orange
        elif r > 200 and g > 100 and b < 100:
            seeds.append((x, y))
        # White/bright
        elif r > 230 and g > 230 and b > 230:
            seeds.append((x, y))
        # Beige/light warm
        elif r > 220 and g > 200 and b > 150:
            seeds.append((x, y))
        # Deep blue inside shield
        elif b > 85 and r < 30:
            seeds.append((x, y))

print(f"Found {len(seeds)} seed pixels")

# Step 2: Expand seeds by radius to cover entire shield
radius = 12
for sx, sy in seeds:
    for dx in range(-radius, radius+1):
        for dy in range(-radius, radius+1):
            if dx*dx + dy*dy <= radius*radius:
                nx, ny = sx + dx, sy + dy
                if 0 <= nx < w and 0 <= ny < h:
                    mask[nx][ny] = True

# Step 3: Apply mask - keep shield, remove everything else
for y in range(h):
    for x in range(w):
        if not mask[x][y]:
            pixels[x, y] = (0, 0, 0, 0)

# Step 4: Crop to content
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

print(f"Cropped to: {img.size}")

# Step 5: Scale up with high quality
scale = 512 / max(img.size)
new_size = (int(img.width * scale), int(img.height * scale))
img = img.resize(new_size, Image.LANCZOS)

# Save
output = r'D:\新致远智慧消防平台\fire-platform-build\app\public\logo.png'
img.save(output, 'PNG', optimize=True)
print(f"Saved: {output}, size: {img.size}")

# Also save to dist
img.save(r'D:\新致远智慧消防平台\fire-platform-build\app\dist\logo.png', 'PNG', optimize=True)
