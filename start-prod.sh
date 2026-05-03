#!/bin/bash
cd app
echo "构建前端..."
npm install
npm run build
echo "启动后端..."
cd ../backend
npm install
npm run start
