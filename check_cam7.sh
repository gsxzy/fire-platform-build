#!/bin/bash
echo '=== WVP DB device check ==='
mysql -uroot -pwvp@2024 -h127.0.0.1 -P3307 wvp -N -e "SELECT device_id, online, ip, port, host_address FROM device WHERE device_id IN ('34020000001300000001','34020000001300000002');" 2>/dev/null
echo '---'
echo '=== WVP application.yml sip config ==='
grep -A5 -B5 'sip:' /opt/wvp/application.yml 2>/dev/null
echo '---'
echo '=== WVP log today 11:30-12:00 ==='
grep -n '2026-05-09 11:' /opt/wvp/logs/wvp-2026-05-09.0.log 2>/dev/null | head -n 5
echo '---'
echo '=== Last 5 lines of today log ==='
tail -n 5 /opt/wvp/logs/wvp-2026-05-09.0.log 2>/dev/null
