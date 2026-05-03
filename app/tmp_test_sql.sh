#!/bin/bash
export MYSQL_PWD='Lywl@2025!#/smart'
mysql -u root smart_fire -e "SELECT id, device_id, device_name, device_type, unit_name, protocol, ip_address, port, status FROM devices LIMIT 1;" 2>/dev/null
