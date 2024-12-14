FROM node:alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Crea la directory per i log e imposta i permessi
RUN mkdir -p logs && chown -R node:node logs

EXPOSE 3000
CMD ["npm", "start"]
