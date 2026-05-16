#!/bin/bash
mysql -uroot -pZhangcong2255 fire_platform -N -e "SELECT device_id,status,ip,last_online FROM fire_device WHERE device_id LIKE '3402000000130000000%';" 2>/dev/null
echo ''
echo '=== WVP sip server log (last 20 lines) ==='
tail -20 /opt/wvp/logs/wvp.log 2>/dev/null || echo 'no wvp.log'
echo ''
echo '=== tcpdump 15s for non-scanner REGISTER ==='
timeout 15 tcpdump -i any -n port 5060 and udp 2>&1 | grep -vE '81\.16|194\.164|scanner|OPTIONS|INVITE.*1550' | head -20 || echo 'no non-scanner packets'
