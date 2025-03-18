#!/bin/bash

# Imposta la directory principale del programma come directory corrente
cd "$(dirname "$0")"/../../..
MAIN_DIR="$(pwd)"
echo
echo "Directory principale: $MAIN_DIR"
echo

echo "==================================================="
echo "            AGGIORNAMENTO FLOWFILES"
echo "==================================================="

echo
echo "[1/6] Arresto dei processi di backend e frontend..."
pkill -f node > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Processi Node.js terminati con successo."
else
    echo "Nessun processo Node.js attivo da terminare."
fi

echo
echo "[2/6] Download dell'aggiornamento..."
tempDir="/tmp/flowfiles-update"
zipFile="$tempDir/update.zip"

# Crea cartella temporanea
rm -rf "$tempDir" 2>/dev/null
mkdir -p "$tempDir"

# Scarica l'aggiornamento
wget -q "https://github.com/alexis-82/flowfiles/archive/refs/heads/main.zip" -O "$zipFile"

if [ ! -f "$zipFile" ]; then
    echo "Errore durante il download del file di aggiornamento."
    exit 1
fi

echo
echo "[3/6] Estrazione dei file..."
unzip -q "$zipFile" -d "$tempDir"

if [ $? -ne 0 ]; then
    echo "Errore durante l'estrazione del file zip."
    exit 1
fi

echo
echo "[4/6] Preparazione per la copia dei file..."
extractedDir="$tempDir/flowfiles-main"

# Elimina il file update.sh dalla cartella temporanea
echo "Eliminazione del file update.sh estratto per evitare la sovrascrittura..."
if [ -f "$extractedDir/frontend/public/scripts/update.sh" ]; then
    rm -f "$extractedDir/frontend/public/scripts/update.sh"
    echo "File update.sh eliminato con successo dalla cartella temporanea."
else
    echo "Il file update.sh non è stato trovato nella cartella estratta."
fi

echo
echo "[5/6] Copia dei file nella directory principale..."
rsync -a --exclude='.git' --exclude='node_modules' "$extractedDir/" "$MAIN_DIR/"

echo
echo "[6/6] Pulizia..."
cd "$MAIN_DIR"
rm -rf "$tempDir"

echo
echo "==================================================="
echo "        AGGIORNAMENTO COMPLETATO CON SUCCESSO"
echo "==================================================="
echo "L'installazione delle dipendenze continua in background."
echo "Per avviare l'applicazione, usa lo script start.sh dopo che l'aggiornamento è completato."
echo

exit 0 