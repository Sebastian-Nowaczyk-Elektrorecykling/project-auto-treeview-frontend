FROM node:22-alpine

WORKDIR /contract

COPY --chown=node:node package.json openapi.json ./
COPY --chown=node:node examples ./examples
COPY --chown=node:node test ./test

USER node

CMD ["npm", "test"]
