import json

data = {
    "unit_code": "UN-TEST-FULL-001",
    "name": "测试完整单位",
    "type": "general",
    "supervision_level": "general",
    "address": "测试地址完整",
    "contact_name": "测试联系人",
    "contact_phone": "13800138000",
    "contact_email": "test@example.com",
    "legal_person": "测试法人",
    "license_no": "1234567890",
    "area": 1000,
    "lng": 116.397,
    "lat": 39.916,
    "risk_level": "low",
    "status": "1",
    "remark": "测试备注"
}

with open("/tmp/test_unit_full.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("file written")
