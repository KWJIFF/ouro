FROM node:20-alpine AS builder

WORKDIR /app

# Install core
COPY packages/core/package.json packages/core/
COPY packages/core/src packages/core/src
WORKDIR /app/packages/core
RUN npm install

# Install web
WORKDIR /app
COPY packages/web/package.json packages/web/
COPY packages/web/next.config.js packages/web/
COPY packages/web/tsconfig.json packages/web/
COPY packages/web/tailwind.config.ts packages/web/
COPY packages/web/postcss.config.js packages/web/

WORKDIR /app/packages/web
RUN npm install --legacy-peer-deps

# Copy source and build
COPY packages/web/src packages/web/src
COPY packages/web/public packages/web/public

RUN npx next build

# --- Runtime ---
FROM node:20-alpine AS runtime

WORKDIR /app/packages/web

COPY --from=builder /app/packages/web/.next .next
COPY --from=builder /app/packages/web/public public
COPY --from=builder /app/packages/web/node_modules node_modules
COPY --from=builder /app/packages/web/package.json .

EXPOSE 3000

CMD ["npx", "next", "start"]
