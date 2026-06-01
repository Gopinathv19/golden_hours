FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . ./

ARG VITE_API_URL="https://gopinathv19-golden-hours-backend.hf.space"
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:1.27-alpine

ENV PORT=7860
ENV VITE_API_URL="https://gopinathv19-golden-hours-backend.hf.space"

COPY --from=build /app/dist /usr/share/nginx/html

RUN rm /etc/nginx/conf.d/default.conf && \
    printf '%s\n' \
    'server {' \
    '  listen 7860;' \
    '  server_name _;' \
    '  root /usr/share/nginx/html;' \
    '  index index.html;' \
    '' \
    '  location / {' \
    '    try_files $uri $uri/ /index.html;' \
    '  }' \
    '}' \
    > /etc/nginx/conf.d/default.conf

EXPOSE 7860

CMD ["/bin/sh", "-c", "printf 'window.__ENV__ = { VITE_API_URL: \"%s\" };\\n' \"$VITE_API_URL\" > /usr/share/nginx/html/env.js && nginx -g 'daemon off;'"]
