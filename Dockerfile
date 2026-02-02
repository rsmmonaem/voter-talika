
# 1. Build Frontend
FROM node:20-slim AS frontend-build
WORKDIR /app
COPY voter-web/package*.json ./voter-web/
RUN cd voter-web && npm install
COPY voter-web/ ./voter-web/
COPY voters.db ./
RUN cd voter-web && npm run build

# 2. Setup Backend & Final Image
FROM node:20-slim
WORKDIR /app
COPY voter-web/package*.json ./
RUN npm install --production
COPY voter-web/server.js ./
COPY --from=frontend-build /app/voters.db ./voters.db
COPY --from=frontend-build /app/voter-web/dist ./dist

# The server serves the frontend
ENV NODE_ENV=production
EXPOSE 7860
CMD ["node", "server.js"]
