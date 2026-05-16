#!/bin/bash
sed -i '/lua_load_resty_core/d' /www/server/nginx/conf/nginx.conf
sed -i '/lua_package_path/d' /www/server/nginx/conf/nginx.conf
sed -i '/^http {/a\    lua_package_path "/www/server/nginx/lib/lua/?.lua;;";' /www/server/nginx/conf/nginx.conf
/www/server/nginx/sbin/nginx 2>&1
echo "EXIT_CODE=$?"
ps aux | grep 'nginx' | grep -v grep
ss -tlnp | grep ':80 '
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/
echo ""
