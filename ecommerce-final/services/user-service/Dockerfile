# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
# Chỉ cài production dependencies → image nhỏ hơn ~60%
COPY package*.json ./
RUN npm install --legacy-peer-deps --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Chạy với user non-root để bảo mật
USER node
EXPOSE 3001
CMD ["node", "dist/main"]
