#!/bin/bash
mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' wvp -e "UPDATE wvp_device_channel SET stream_id = '34020000001300000002_34020000001320000002' WHERE device_id = '34020000001320000002';"
mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' wvp -e "SELECT id, device_id, stream_id FROM wvp_device_channel WHERE device_id IN ('34020000001300000001', '34020000001320000002');"
