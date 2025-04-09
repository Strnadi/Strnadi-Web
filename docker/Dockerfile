FROM oven/bun:alpine AS build
WORKDIR /usr/src/app

COPY package.json .env ./
RUN bun install

COPY src src
COPY public public
COPY index.html tsconfig*.json vite.config.ts ./

ENV NODE_ENV=production
RUN bun run build

FROM nginx:strnadi-custom AS production
COPY ./deployment/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
