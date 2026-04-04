FROM node:20-alpine AS builder

WORKDIR /app

# Install core first
COPY packages/core/package.json packages/core/
COPY packages/core/tsconfig.json packages/core/
COPY packages/core/src packages/core/src

WORKDIR /app/packages/core
RUN npm install

# Install server
WORKDIR /app
COPY packages/server/package.json packages/server/
COPY packages/server/tsconfig.json packages/server/

WORKDIR /app/packages/server
RUN npm install --legacy-peer-deps

# Copy source
COPY packages/server/src packages/server/src
COPY packages/server/tests packages/server/tests

# Type check
RUN npx tsc --noEmit

# --- Runtime ---
FROM node:20-alpine AS runtime

RUN apk add --no-cache curl

WORKDIR /app

COPY --from=builder /app/packages/core /app/packages/core
COPY --from=builder /app/packages/server /app/packages/server

WORKDIR /app/packages/server

# Create plugin directory
RUN mkdir -p /app/tools/plugins

EXPOSE 3001

CMD ["npx", "tsx", "src/index.ts"]
