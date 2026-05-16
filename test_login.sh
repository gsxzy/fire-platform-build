#!/bin/bash
curl -s -X POST http://127.0.0.1:5003/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}'
echo ""
