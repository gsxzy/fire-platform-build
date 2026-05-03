import re

path = r'D:\新致远智慧消防平台\fire-platform-build\app\backend\fscn8001Server.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update function signature and body
old_func = """function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}"""

new_func = """function sendJson(req, res, statusCode, data) {
  const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'];
  const origin = req.headers.origin;
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}"""

content = content.replace(old_func, new_func)

# 2. Update all calls: sendJson(res, -> sendJson(req, res,
content = content.replace('sendJson(res,', 'sendJson(req, res,')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
