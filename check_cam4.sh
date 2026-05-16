#!/bin/bash
echo '=== WVP log dir ==='
ls -la /opt/wvp/logs/ 2>/dev/null || echo 'no logs dir'
echo '=== WVP config ==='
cat /opt/wvp/application.yml 2>/dev/null | grep -E 'log|sip|server' | head -30
echo '=== journalctl for wvp ==='
journalctl -u wvp --no-pager -n 50 2>/dev/null || echo 'no wvp service'
echo '=== pm2 logs for wvp ==='
pm2 logs wvp --lines 30 2>/dev/null || echo 'no pm2 wvp'
