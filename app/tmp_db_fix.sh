#!/bin/bash
export MYSQL_PWD='Lywl@2025!#/smart'
mysql -u root smart_fire -e "DESCRIBE devices;" 2>/dev/null | grep -q "unit_name"
if [ $? -ne 0 ]; then
  mysql -u root smart_fire -e "ALTER TABLE devices ADD COLUMN unit_name VARCHAR(100) DEFAULT NULL AFTER device_type;" 2>/dev/null
  echo "Added unit_name column"
else
  echo "unit_name already exists"
fi
