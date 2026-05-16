#!/bin/bash
killall mysqld 2>/dev/null
sleep 2
/www/server/mysql/bin/mysqld_safe --skip-grant-tables &
sleep 4
/www/server/mysql/bin/mysql -u root -e "FLUSH PRIVILEGES; ALTER USER 'root'@'localhost' IDENTIFIED BY 'Zhangcong2255'; FLUSH PRIVILEGES;"
echo "Password reset done"
killall mysqld 2>/dev/null
sleep 2
/www/server/mysql/bin/mysqld_safe --defaults-file=/etc/my.cnf &
sleep 4
mysql -u root -pZhangcong2255 -e 'SELECT 1' 2>&1 | head -3
