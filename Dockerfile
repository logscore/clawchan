FROM oven/bun:1.3.2-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN rm -rf node_modules && \
    bun install && \
    bun run build

FROM oven/bun:1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./

EXPOSE 8080

CMD ["bun", "./build/index.js"]
