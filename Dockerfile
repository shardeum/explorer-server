# syntax=docker/dockerfile:1

## global args
ARG NODE_VERSION=18.19.1
ARG NODE_ENV=production

FROM node:${NODE_VERSION}
SHELL [ "/bin/bash", "-cex" ]

## ENVs
ENV NODE_ENV=${NODE_ENV}

# Create app directory
WORKDIR /app

# Bundle app source
COPY . .

# Install node_modules
RUN \
  --mount=type=cache,target=/root/.cache \
  --mount=type=cache,target=/root/.npm \
  <<EOF
npm install
npm install pm2 -g
EOF

ENTRYPOINT [ "/app/entrypoint.sh" ]
