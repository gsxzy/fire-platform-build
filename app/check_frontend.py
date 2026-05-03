import urllib.request, re, ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def fetch(url, timeout=10):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=timeout, context=ctx)
        return resp.status, resp.read().decode('utf-8', errors='replace')
    except urllib.error.HTTPError as e:
        return e.code, ''
    except Exception as e:
        return -1, str(e)

# 获取首页 HTML
status, html = fetch('http://124.223.35.58/')
print(f'=== HTML Status: {status} ===')

# 提取所有引用的 JS/CSS
js_files = re.findall(r'src=["\']([^"\']+\.(js|css))["\']', html)
css_files = re.findall(r'href=["\']([^"\']+\.(js|css))["\']', html)
all_files = set([f[0] for f in js_files] + [f[0] for f in css_files])

print(f'Found {len(all_files)} static resources:')
for f in sorted(all_files):
    if f.startswith('http'):
        url = f
    else:
        url = 'http://124.223.35.58' + (f if f.startswith('/') else '/' + f)
    s, _ = fetch(url, timeout=5)
    status_icon = 'OK' if s == 200 else f'ERR({s})'
    print(f'  [{status_icon}] {f}')
