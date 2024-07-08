FROM node:21 as base

RUN npm install -g pnpm

WORKDIR /app

COPY package.json .
COPY pnpm-lock.yaml .

RUN pnpm install

FROM base as dev

COPY . .

FROM dev as build

RUN pnpm build

FROM base as prod

COPY --from=build /app/dist /app