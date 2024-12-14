FROM node:20-alpine

# Imposta il gruppo e l'utente node come default
USER node

# Imposta la directory di lavoro
WORKDIR /app

# Copia i file di configurazione
COPY --chown=node:node package*.json ./

# Installa le dipendenze come utente node
RUN npm ci

# Copia il resto dei sorgenti
COPY --chown=node:node . .

# Genera la build di produzione
RUN npm run build

# Espone la porta
EXPOSE 80

# Comando di avvio
# CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "80"]
CMD ["npm", "run", "preview"]

