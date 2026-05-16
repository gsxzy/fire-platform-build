#!/bin/bash
echo '=== WVP today log grep camera ==='
grep -n '34020000001300000001\|34020000001300000002\|保活到期\|设备离线\|REGISTER' /opt/wvp/logs/wvp-2026-05-09.0.log 2>/dev/null | tail -n 30
echo '---'
echo '=== WVP console log grep camera ==='
grep -n '34020000001300000001\|34020000001300000002\|保活到期\|设备离线\|REGISTER' /opt/wvp/logs/console.log 2>/dev/null | tail -n 30
echo '---'
echo '=== sip-ban log last 20 lines ==='
tail -n 20 /opt/wvp/logs/sip-ban.log 2>/dev/null
