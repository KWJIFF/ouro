FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/core/package.json packages/core/
COPY packages/web/package.json packages/web/
RUN npm install --workspace=packages/web --workspace=packages/core
COPY packages/core packages/core
COPY packages/web packages/web
RUN cd packages/web && npm run build
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
