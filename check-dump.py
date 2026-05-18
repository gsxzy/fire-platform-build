import json
with open('/root/.pm2/dump.pm2') as f:
    d = json.load(f)
for p in d:
    if p.get('name') == 'fire-platform':
        print(json.dumps(p, indent=2, default=str))
        break
