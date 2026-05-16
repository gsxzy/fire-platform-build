#!/bin/bash
echo '=== WVP today log grep camera ==='
grep -E '34020000001300000001|34020000001300000002|保活到期|设备离线|REGISTER' /opt/wvp/logs/wvp-2026-05-09.0.log 2>/dev/null | tail -30
echo '---'
echo '=== WVP console log grep camera ==='
grep -E '34020000001300000001|34020000001300000002|保活到期|设备离线|REGISTER' /opt/wvp/logs/console.log 2>/dev/null | tail -30
echo '---'
echo '=== sip-ban log ==='
cat /opt/wvp/logs/sip-ban.log 2>/dev/null | tail -20
