import os
import re

root = r'D:\新致远智慧消防平台\fire-platform-build\app\src'

# Map old keys to new keys with sfp_ prefix
key_map = {
    "'token'": "'sfp_token'",
    '"token"': '"sfp_token"',
    "'refreshToken'": "'sfp_refreshToken'",
    '"refreshToken"': '"sfp_refreshToken"',
    "'userInfo'": "'sfp_userInfo'",
    '"userInfo"': '"sfp_userInfo"',
    "'wvp_token'": "'sfp_wvp_token'",
    '"wvp_token"': '"sfp_wvp_token"',
    "'sidebar_collapsed'": "'sfp_sidebar_collapsed'",
    '"sidebar_collapsed"': '"sfp_sidebar_collapsed"',
    "'sidebar_favorites'": "'sfp_sidebar_favorites'",
    '"sidebar_favorites"': '"sfp_sidebar_favorites"',
    "'alarm_confirmed_ids'": "'sfp_alarm_confirmed_ids'",
    '"alarm_confirmed_ids"': '"sfp_alarm_confirmed_ids"',
}

# Also update const TOKEN_KEY = 'token' style definitions
const_map = {
    "TOKEN_KEY = 'token'": "TOKEN_KEY = 'sfp_token'",
    "REFRESH_KEY = 'refreshToken'": "REFRESH_KEY = 'sfp_refreshToken'",
    "USER_INFO_KEY = 'userInfo'": "USER_INFO_KEY = 'sfp_userInfo'",
    "STORAGE_KEY = 'alarm_confirmed_ids'": "STORAGE_KEY = 'sfp_alarm_confirmed_ids'",
}

for dirpath, dirnames, filenames in os.walk(root):
    for filename in filenames:
        if not filename.endswith(('.tsx', '.ts', '.jsx', '.js')):
            continue
        filepath = os.path.join(dirpath, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        original = content
        for old, new in key_map.items():
            content = content.replace(old, new)
        for old, new in const_map.items():
            content = content.replace(old, new)
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print('Updated', filepath)

print('Done')
