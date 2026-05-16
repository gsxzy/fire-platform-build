#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE3LCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNzc4MzA0MzQwLCJleHAiOjE3NzgzOTA3NDB9.q33-4PGewW0Yq19JQFdjHMoCiGKQ5VfxcXc2eXT9emI"
curl -s "http://127.0.0.1:5003/api/subsystems" -H "Authorization: Bearer $TOKEN"
echo ""
