from PIL import Image, ImageFilter

# Load image
img = Image.open(r'C:\Users\Huawei\Downloads\赋安FSCN8001不上传数据排查.png').convert('RGBA')
print(f"Original size: {img.size}")

# Find bounding box of non-transparent pixels
bbox = img.getbbox()
print(f"Bounding box: {bbox}")

# Add small padding
padding = 3
bbox = (
    max(0, bbox[0] - padding),
    max(0, bbox[1] - padding),
    min(img.width, bbox[2] + padding),
    min(img.height, bbox[3] + padding)
)

# Crop to content
cropped = img.crop(bbox)
print(f"Cropped size: {cropped.size}")

# Scale up for sharper edges when displayed larger
scale = 512 / max(cropped.size)
new_size = (int(cropped.width * scale), int(cropped.height * scale))
print(f"Scaled size: {new_size}")

# Use LANCZOS for high-quality upscaling
scaled = cropped.resize(new_size, Image.LANCZOS)

# Enhance edges with mild unsharp mask for crisp display at any size
scaled = scaled.filter(ImageFilter.UnsharpMask(radius=1, percent=80, threshold=3))

# Save with maximum quality
output_path = r'D:\新致远智慧消防平台\fire-platform-build\app\public\logo.png'
scaled.save(output_path, 'PNG', optimize=True)
print(f"Saved to: {output_path}")

# Save copy for dist
scaled.save(r'D:\新致远智慧消防平台\fire-platform-build\app\dist\logo.png', 'PNG', optimize=True)
print("Saved to dist/logo.png")

# Verify
result = Image.open(output_path)
print(f"Final: {result.size}, mode={result.mode}")
