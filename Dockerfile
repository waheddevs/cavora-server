FROM node:20-alpine AS build

WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci
COPY tsconfig.json ./
COPY public ./public
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/views ./src/views
COPY --from=build /app/src/uploads ./src/uploads
COPY --from=build /app/public ./public

RUN chown -R node:node /app/src/uploads

USER node
EXPOSE 3008
CMD ["node", "dist/server.js"]
