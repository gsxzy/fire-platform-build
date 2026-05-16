#!/bin/bash
mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' wvp -e "SELECT id, device_id, name, status, gb_device_id FROM wvp_device_channel WHERE device_id = '34020000001300000002';"
