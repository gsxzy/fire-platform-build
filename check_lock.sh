#!/bin/bash
DB_PASS=$(grep '^DB_PASSWORD=' /opt/my-fire-api-new/.env | cut -d= -f2-)
mysql -uroot -p"$DB_PASS" -e "SELECT IS_FREE_LOCK('ctwing_process:99013914869646085145332') AS is_free;"
mysql -uroot -p"$DB_PASS" -e "SELECT IS_USED_LOCK('ctwing_process:99013914869646085145332') AS used_by;"
