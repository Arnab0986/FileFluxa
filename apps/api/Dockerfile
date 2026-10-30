FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV PORT=5000
ENV HOME=/home/node

RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    poppler-utils \
    tesseract-ocr \
    ffmpeg \
    imagemagick \
    p7zip-full \
    unzip \
    zip \
    ca-certificates \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node src ./src

RUN mkdir -p /tmp/filefluxa \
    && chown -R node:node /tmp/filefluxa

USER node

EXPOSE 5000

CMD ["node", "src/server.js"]