#!/bin/bash
DB_PASS=$(grep '^DB_PASSWORD=' /opt/my-fire-api-new/.env | cut -d= -f2-)
mysql -uroot -p"$DB_PASS" -e "SELECT raw_json FROM fire_platform.ctwing_raw_log ORDER BY id DESC LIMIT 1;"
