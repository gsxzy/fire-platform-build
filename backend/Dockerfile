# ═══════════════════════════════════════════════════════════════════
# 新致远智慧消防云平台 - 后端服务 Docker镜像
# ═══════════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .
RUN npm run build 2>/dev/null || true

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache tzdata && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY .env .env
RUN mkdir -p uploads logs
EXPOSE 5003
ENV NODE_ENV=production
CMD ["node", "dist/app.js"]
