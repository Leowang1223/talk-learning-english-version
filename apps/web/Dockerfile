# 多階段建置：建置階段
FROM node:18-alpine AS builder

# 設定工作目錄
WORKDIR /app

# 複製 package 檔案
COPY package*.json ./

# 安裝所有依賴（包括開發依賴）
RUN npm install

# 複製前端原始碼
COPY . ./

# 建置 Next.js 應用
RUN npm run build

# 生產環境階段
FROM node:18-alpine AS runner

# 設定工作目錄
WORKDIR /app

# 設定環境變數
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 創建非 root 用戶
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 複製建置結果
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# 設定正確的權限
RUN chown -R nextjs:nodejs /app
RUN chmod -R 755 /app

# 切換到非 root 用戶
USER nextjs

# 暴露端口
EXPOSE 3000

# 設定環境變數
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 安裝生產依賴
RUN npm ci --only=production

# 啟動應用
CMD ["npm", "start"]
