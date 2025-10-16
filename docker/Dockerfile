FROM oven/bun:alpine AS build
WORKDIR /usr/src/app

COPY patches patches
COPY package.json .env ./
RUN bun install

COPY src src
COPY public public
COPY plugins plugins
COPY index.html tsconfig*.json vite.config.ts ./

ARG ENVIRONMENT="production"
ENV NODE_ENV=${ENVIRONMENT}
RUN bun run build --mode $NODE_ENV

FROM nginx:strnadi-custom AS production
COPY ./deployment/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
