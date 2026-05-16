#!/bin/bash
mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' wvp -e "SELECT * FROM wvp_device_channel WHERE id = 3\G"
