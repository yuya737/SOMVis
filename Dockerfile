FROM oven/bun:latest as build
WORKDIR /app
COPY . /app

RUN bun install
RUN bun run build

FROM nginx:1.23-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
