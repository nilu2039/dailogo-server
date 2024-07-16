FROM node:21-alpine AS base

RUN npm install -g pnpm
RUN npm install -g pm2

WORKDIR /app

COPY package.json .
COPY pnpm-lock.yaml .

RUN pnpm install

FROM base AS dev

COPY . .

FROM dev AS build

RUN pnpm build

FROM base AS prod

COPY --from=build /app/dist /app