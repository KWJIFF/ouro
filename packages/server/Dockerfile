FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/
RUN npm install --workspace=packages/server --workspace=packages/core
COPY packages/core packages/core
COPY packages/server packages/server
EXPOSE 3001
CMD ["npx", "tsx", "packages/server/src/index.ts"]
