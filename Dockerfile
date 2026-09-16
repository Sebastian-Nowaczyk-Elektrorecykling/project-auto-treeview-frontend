FROM node:22-alpine

WORKDIR /app

COPY --chown=node:node package.json index.html ./
COPY --chown=node:node assets ./assets
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node src ./src

USER node

ENV HOST=0.0.0.0
ENV PORT=4173

EXPOSE 4173

CMD ["npm", "run", "serve"]
