import json

data = {
    "unit_code": "UN-TEST-005",
    "name": "测试单位新增5",
    "type": "general",
    "address": "测试地址",
    "contact_name": "测试联系人",
    "contact_phone": "13800138000",
    "risk_level": "low",
    "status": "1"
}

with open("/tmp/test_unit.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)

print("file written")
