# syntax=docker/dockerfile:1
ARG NODE_VERSION=18.16.1
ARG NODE_ENV=production
FROM node:${NODE_VERSION}
SHELL [ "/bin/bash", "-cex" ]
ENV NODE_ENV=${NODE_ENV}
WORKDIR /app
COPY . .
RUN npm install; \
npm install pm2 -g
ENTRYPOINT [ "/app/entrypoint.sh" ]
