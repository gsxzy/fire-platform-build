import os, re, glob
from collections import defaultdict

files = []
files += glob.glob('backend/src/controllers/*.ts')
files += glob.glob('backend/src/services/*.ts')
files += glob.glob('app/src/sections/*.tsx')
files += ['app/src/api/services.ts']

results = []

for f in files:
    rel = f.replace('\\\\', '/')
    with open(f, 'r', encoding='utf-8') as fp:
        lines = fp.readlines()
    
    imports = []
    i = 0
    while i < min(80, len(lines)):
        line = lines[i]
        if re.match(r'^\s*import\s+', line):
            import_text = line
            if '{' in line and '}' not in line:
                j = i + 1
                while j < len(lines) and '}' not in import_text:
                    import_text += ' ' + lines[j].strip()
                    j += 1
                i = j - 1
            imports.append(import_text)
        i += 1
    
    for imp in imports:
        imp = imp.strip()
        if re.match(r'^\s*import\s+type\s+', imp):
            continue
        if re.match(r'^\s*import\s+[\"\']', imp):
            continue
        
        m = re.search(r'from\s+[\"\']([^\"\']+)[\"\']', imp)
        if not m:
            continue
        module = m.group(1)
        
        ids = []
        
        named = re.search(r'\{([^}]+)\}', imp)
        if named:
            for part in named.group(1).split(','):
                part = part.strip()
                if not part:
                    continue
                if ' as ' in part:
                    ids.append(part.split(' as ')[1].strip())
                else:
                    ids.append(part)
        
        dm = re.match(r'^\s*import\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:,|\s+from)', imp)
        if dm:
            dname = dm.group(1)
            if dname != 'type':
                ids.append(dname)
        
        ns = re.search(r'\*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)', imp)
        if ns:
            ids.append(ns.group(1))
        
        for id_name in ids:
            if id_name == 'React':
                continue
            
            used = False
            pattern = r'\b' + re.escape(id_name) + r'\b'
            for line in lines:
                if re.match(r'^\s*import\s+', line):
                    continue
                if re.search(pattern, line):
                    used = True
                    break
            
            if not used:
                results.append((rel, module, id_name))

by_file = defaultdict(list)
for r in results:
    by_file[r[0]].append((r[1], r[2]))

for f in sorted(by_file.keys()):
    print(f'=== {f} ===')
    for mod, id_name in by_file[f]:
        print(f'  {id_name} (from {mod})')
    print('')

print(f'--- Total {len(results)} unused imports ---')
