#!/bin/bash
python3 -c "
import json
lines = open('/opt/my-fire-api-new/logs/combined-2026-05-20.log').readlines()
match = [l for l in lines if 'processCtwingMessage 失败' in l]
if match:
    d = json.loads(match[-1])
    print('message:', d.get('message'))
    print('stack:', d.get('stack'))
else:
    print('no match')
"
