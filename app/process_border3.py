from PIL import Image, ImageFilter

# Load original
img = Image.open(r'D:\wechat\xwechat_files\wxid_ozkfuia8lt3122_a4f4\temp\InputTemp\beab7d0f-b7c0-4147-be97-99415f198575.png').convert('RGBA')
pixels = img.load()
w, h = img.size

# Strategy: find exact bounding box of shield by color classification
# Shield colors: red, orange, white, beige, gray, deep-blue
# Frame/background: dark blue background + light blue frame

# First pass: classify pixels
is_shield = [[False]*h for _ in range(w)]

for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if a < 100:
            continue
        
        # Calculate distances to known colors
        # Background center: (29, 36, 51)
        d_bg = ((r-29)**2 + (g-36)**2 + (b-51)**2) ** 0.5
        # Frame center: (40, 60, 90)  
        d_frame = ((r-40)**2 + (g-60)**2 + (b-90)**2) ** 0.5
        
        # Shield characteristics
        is_red = r > 140 and g < 130 and b < 130
        is_orange = r > 200 and g > 100 and b < 100
        is_white = r > 210 and g > 210 and b > 210
        is_beige = r > 210 and g > 190 and b > 140
        is_deep_blue = b > 85 and r < 30
        is_gray = max(r,g,b) - min(r,g,b) < 40 and (r+g+b)/3 > 80
        
        # Shield edge: slightly darker grays/blues that are NOT frame
        is_edge = (r > 50 and g > 70 and b > 100 and r < 100 and g < 120 and b < 160 
                   and d_frame > 25)
        
        if is_red or is_orange or is_white or is_beige or is_deep_blue or is_gray or is_edge:
            is_shield[x][y] = True

# Find bounding box of shield
xmin, ymin, xmax, ymax = w, h, 0, 0
for y in range(h):
    for x in range(w):
        if is_shield[x][y]:
            xmin = min(xmin, x)
            xmax = max(xmax, x)
            ymin = min(ymin, y)
            ymax = max(ymax, y)

# Add small padding
padding = 1
xmin = max(0, xmin - padding)
ymin = max(0, ymin - padding)
xmax = min(w-1, xmax + padding)
ymax = min(h-1, ymax + padding)

print(f"Shield bbox: ({xmin},{ymin}) to ({xmax},{ymax}), size: ({xmax-xmin+1},{ymax-ymin+1})")

# Crop
cropped = img.crop((xmin, ymin, xmax+1, ymax+1))
print(f"Cropped size: {cropped.size}")

# Scale to reasonable size (256px on longer side for sharper result)
scale = 256 / max(cropped.size)
new_size = (int(cropped.width * scale), int(cropped.height * scale))
scaled = cropped.resize(new_size, Image.LANCZOS)

# Apply sharpening
scaled = scaled.filter(ImageFilter.UnsharpMask(radius=1, percent=100, threshold=1))
scaled = scaled.filter(ImageFilter.SHARPEN)

# Save
output = r'D:\新致远智慧消防平台\fire-platform-build\app\public\logo.png'
scaled.save(output, 'PNG', optimize=True)
print(f"Saved: {output}, size: {scaled.size}")

scaled.save(r'D:\新致远智慧消防平台\fire-platform-build\app\dist\logo.png', 'PNG', optimize=True)
