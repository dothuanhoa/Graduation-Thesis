FROM node:24-alpine AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

RUN mkdir -p /usr/share/nginx/html/notification /usr/share/nginx/html/certification

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]