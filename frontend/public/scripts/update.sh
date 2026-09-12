#!/bin/bash

echo "Iniziando l'aggiornamento di Flowfiles..."

# Salva il percorso corrente
CURRENT_DIR=$(pwd)

# Backup dei file di configurazione se necessario
echo "Creazione backup configurazioni..."
if [ -f ".env" ]; then
    cp .env .env.backup
fi

# Pull delle ultime modifiche
echo "Download aggiornamenti..."
git fetch origin
git pull origin main

# Installa dipendenze backend
echo "Aggiornamento dipendenze backend..."
cd backend
npm install

# Build backend
echo "Build backend..."
npm run build

# Installa dipendenze frontend
echo "Aggiornamento dipendenze frontend..."
cd ../frontend
npm install

# Build frontend
echo "Build frontend..."
npm run build

# Torna alla directory principale
cd $CURRENT_DIR

# Ripristina configurazioni
if [ -f ".env.backup" ]; then
    mv .env.backup .env
fi

echo "Aggiornamento completato!"
echo "Per applicare le modifiche, riavvia l'applicazione." 