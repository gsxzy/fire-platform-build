#!/bin/bash
cd /tmp
unzip -o backend-deploy.zip -d /opt/my-fire-api-new/dist/
pm2 restart fire-api-new
sleep 2
pm2 status fire-api-new
curl -s http://127.0.0.1:5003/api/health | head -c 200
echo ""
grep -o 'src="[^"]*"' /www/wwwroot/fire-platform/index.html | head -3
echo ""
echo "部署完成"
