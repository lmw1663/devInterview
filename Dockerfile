FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx tsc --noEmit

FROM node:18-alpine AS runtime
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/src ./src
COPY --from=build /app/tsconfig.json ./
COPY --from=build /app/prisma ./prisma
RUN npx prisma generate

EXPOSE 3000
CMD ["npx", "ts-node-dev", "--respawn", "src/index.ts"]
