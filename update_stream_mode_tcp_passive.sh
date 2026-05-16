#!/bin/bash
mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' wvp -e "UPDATE wvp_device SET stream_mode = 'TCP_PASSIVE' WHERE device_id LIKE '340200000013%'; SELECT device_id, stream_mode FROM wvp_device;"
