#!/bin/bash
mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' wvp -e "SELECT * FROM wvp_device WHERE device_id = '34020000001300000002'\G"
