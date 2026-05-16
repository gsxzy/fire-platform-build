#!/bin/bash
mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' wvp -e "SHOW COLUMNS FROM wvp_device_channel WHERE Field LIKE '%stream%';"
