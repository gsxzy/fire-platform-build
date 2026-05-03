import re

path = r'D:\新致远智慧消防平台\fire-platform-build\app\backend\fireHostApi.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove sanitizeLike function
old_func = """function sanitizeLike(keyword) {
  if (!keyword || typeof keyword !== 'string') return '';
  return keyword.replace(/[%_\\\\]/g, '\\\\$&');
}
"""
content = content.replace(old_func, '')

# 2. Replace each usage block
# Pattern: where += ' AND (... LIKE ? ...)';\n      const like = `...`;\n      params.push(like, like);
pattern = re.compile(
    r"(\s+where \+= ' AND \(([^)]+)\)';)\n\s+const like = `%\$\{sanitizeLike\(keyword\)\}%`;\n\s+(params\.push\((?:like, )+like\));"
)

def repl(m):
    where_line = m.group(1)
    like_clause = m.group(2)
    push_line = m.group(3)
    
    like_count = like_clause.count('LIKE ?')
    new_clause = like_clause.replace('LIKE ?', "LIKE CONCAT('%', ?, '%')")
    new_where = where_line.replace(like_clause, new_clause)
    new_push = 'params.push(' + ', '.join(['keyword'] * like_count) + ')'
    
    return new_where + '\n      ' + new_push + ';'

content = pattern.sub(repl, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
