#!/bin/bash
mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' wvp -e "SELECT device_id, stream_mode, password, transport, ssrc_check FROM wvp_device WHERE device_id = '34020000001300000001'\G"
