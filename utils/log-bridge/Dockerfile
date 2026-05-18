FROM node:22-alpine

WORKDIR /app
COPY package.json index.js ./

# No deps — the bridge uses only built-in `dgram` and `fetch`.
USER node

CMD ["node", "index.js"]
