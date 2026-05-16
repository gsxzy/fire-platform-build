#!/bin/bash
mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' wvp -e "SHOW COLUMNS FROM wvp_device WHERE Field = 'stream_mode';"
mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' wvp -e "SELECT device_id, stream_mode FROM wvp_device WHERE device_id = '34020000001300000002';"
