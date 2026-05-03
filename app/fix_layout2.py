import re
path = r"D:\新致远智慧消防平台\fire-platform-build\app\src\sections\FireControlRoomPage.tsx"
with open(path, "r", encoding="utf-8-sig") as f:
    content = f.read()

# Add carousel state before return
state_insert = '''  const [infoIndex, setInfoIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setInfoIndex(i => (i + 1) % 3), 3000);
    return () => clearInterval(t);
  }, []);
'''

# Find position to insert (before return)
return_pos = content.find("  return (")
if return_pos == -1:
    print("return not found")
    exit(1)

# Check if already inserted
if "infoIndex" not in content[:return_pos]:
    content = content[:return_pos] + state_insert + content[return_pos:]
    print("Inserted carousel state")
else:
    print("Carousel state already exists")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
