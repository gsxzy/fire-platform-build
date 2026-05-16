set -o igncr
mysql -uroot -pwvp@2024 -h127.0.0.1 -P3307 wvp -N -e "SELECT device_id,online,ip,port,host_address,create_time,update_time FROM wvp_device WHERE device_id IN ('34020000001300000001','34020000001300000002');" 2>/dev/null
echo '---'
mysql -uroot -pwvp@2024 -h127.0.0.1 -P3307 wvp -N -e "SELECT device_id,online,ip,port,host_address,create_time,update_time FROM wvp_device LIMIT 5;" 2>/dev/null
