#!/usr/bin/env python3
"""
智慧消防平台 - 最小化 API 服务
提供登录和基础 API 功能
"""

from flask import Flask, jsonify, request
import bcrypt
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta
import jwt
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'smart-fire-platform-secret-key-2025')

# PostgreSQL 连接配置
DB_CONFIG = {
    'host': '127.0.0.1',
    'port': 5432,
    'database': 'fire_safety',
    'user': 'postgres',
    'password': 'postgres'
}

def get_db():
    return psycopg2.connect(**DB_CONFIG)

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '')
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({"error": "用户名和密码不能为空"}), 400
    
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT id, username, password, real_name, email, phone, status, roles, is_super_admin FROM users WHERE username = %s", (username,))
        user = cur.fetchone()
        cur.close()
        conn.close()
        
        if not user:
            return jsonify({"error": "登录失败，请稍后重试"}), 401
        
        if user['status'] != 'active':
            return jsonify({"error": "账户已被禁用"}), 403
        
        # 验证 bcrypt 密码
        if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            return jsonify({"error": "登录失败，请稍后重试"}), 401
        
        # 生成 JWT token
        token = jwt.encode({
            'userId': user['id'],
            'username': user['username'],
            'exp': datetime.utcnow() + timedelta(days=7)
        }, app.config['SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            "accessToken": token,
            "tokenType": "Bearer",
            "expiresIn": 604800,
            "userInfo": {
                "id": user['id'],
                "username": user['username'],
                "realName": user['real_name'] or user['username'],
                "email": user['email'] or '',
                "phone": user['phone'] or '',
                "avatar": '',
                "roles": user['roles'] or ['admin'],
                "isSuperAdmin": user['is_super_admin'] or False
            }
        })
    except Exception as e:
        print(f"[LOGIN ERROR] {e}")
        return jsonify({"error": "登录失败，请稍后重试"}), 500

@app.route('/api/auth/profile', methods=['GET'])
def profile():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({"error": "未授权"}), 401
    
    try:
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT id, username, real_name, email, phone, status, roles, is_super_admin FROM users WHERE id = %s", (payload['userId'],))
        user = cur.fetchone()
        cur.close()
        conn.close()
        
        if not user:
            return jsonify({"error": "用户不存在"}), 404
        
        return jsonify({
            "id": user['id'],
            "username": user['username'],
            "realName": user['real_name'] or user['username'],
            "email": user['email'] or '',
            "phone": user['phone'] or '',
            "avatar": '',
            "roles": user['roles'] or ['admin'],
            "isSuperAdmin": user['is_super_admin'] or False
        })
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "token已过期"}), 401
    except Exception as e:
        print(f"[PROFILE ERROR] {e}")
        return jsonify({"error": "请求失败"}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=False)
