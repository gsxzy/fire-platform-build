from PIL import Image, ImageFilter

# Use the original high-quality image
img = Image.open(r'C:\Users\Huawei\Downloads\赋安FSCN8001不上传数据排查.png').convert('RGBA')
print(f"Original size: {img.size}")

# Crop to content (remove excess transparent/blank areas)
bbox = img.getbbox()
padding = 3
bbox = (
    max(0, bbox[0] - padding),
    max(0, bbox[1] - padding),
    min(img.width, bbox[2] + padding),
    min(img.height, bbox[3] + padding)
)
cropped = img.crop(bbox)
print(f"Cropped size: {cropped.size}")

# Scale up for sharp display
scale = 512 / max(cropped.size)
new_size = (int(cropped.width * scale), int(cropped.height * scale))
scaled = cropped.resize(new_size, Image.LANCZOS)

# Mild sharpening
scaled = scaled.filter(ImageFilter.UnsharpMask(radius=1, percent=80, threshold=3))

# Save
scaled.save(r'D:\新致远智慧消防平台\fire-platform-build\app\public\logo.png', 'PNG', optimize=True)
scaled.save(r'D:\新致远智慧消防平台\fire-platform-build\app\dist\logo.png', 'PNG', optimize=True)
print(f"Restored high-quality logo: {scaled.size}")
