FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/

RUN npm install --workspace=packages/core --workspace=packages/server

# Copy source
COPY packages/core packages/core
COPY packages/server packages/server
COPY tsconfig.base.json .

# Build core
RUN cd packages/core && npx tsc

EXPOSE 3001

CMD ["npx", "tsx", "packages/server/src/index.ts"]
