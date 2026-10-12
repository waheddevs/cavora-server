FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY scripts ./scripts
COPY public ./public
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/views ./src/views
COPY --from=build /app/src/uploads ./src/uploads
COPY --from=build /app/public ./public

RUN chown -R node:node /app/src/uploads

USER node
EXPOSE 3008
CMD ["node", "dist/server.js"]
