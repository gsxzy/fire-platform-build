#!/bin/bash
DB_PASS=$(grep '^DB_PASSWORD=' /opt/my-fire-api-new/.env | cut -d= -f2-)
mysql -uroot -p"$DB_PASS" -e "SELECT id, user, host, db, command, time, state, info FROM information_schema.processlist WHERE id=17373;"
