FROM node:22-alpine

WORKDIR /app

COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
RUN mkdir -p var && chown node:node var

USER node

ENV HOST=0.0.0.0
ENV PORT=8787
ENV TREE_DATA_FILE=/app/var/tree.json

EXPOSE 8787

CMD ["npm", "start"]
