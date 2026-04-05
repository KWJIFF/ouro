FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY packages/web/package.json packages/web/

RUN npm install --workspace=packages/web

COPY packages/web packages/web

RUN cd packages/web && npx next build

EXPOSE 3000

CMD ["npx", "next", "start", "-p", "3000"]
