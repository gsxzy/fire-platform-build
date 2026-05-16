#!/bin/bash
mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' wvp -e "SELECT id, device_id, name, status, stream_id, stream_identification, channel_type FROM wvp_device_channel WHERE device_id IN ('34020000001300000001', '34020000001320000002');"
