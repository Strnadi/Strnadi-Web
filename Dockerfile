FROM oven/bun:alpine AS build
WORKDIR /usr/src/app

COPY package.json .
RUN bun install

COPY src src
COPY public public
COPY index.html tsconfig*.json vite.config.ts .env .env.sentry-build-plugin ./

ENV NODE_ENV=production
RUN bun run build

FROM nginx:alpine AS production
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
