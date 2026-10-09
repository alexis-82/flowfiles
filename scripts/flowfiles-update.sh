#!/bin/bash
# flowfiles-update - Aggiorna un'installazione FlowFiles gestita da systemd.
#
# Prerequisiti:
#   - Installazione fatta con setup_systemd.sh (percorsi /opt/flowfiles/*)
#   - Servizi systemd: flowfiles-backend.service, flowfiles-frontend.service
#   - Deve essere eseguito come root (sudo)

set -e

INSTALL_DIR="/opt/flowfiles"
SERVICE_USER="www-data"
TEMP_DIR="/tmp/flowfiles-update-$$"
REPO_ZIP="https://github.com/alexis-82/flowfiles/archive/refs/heads/main.zip"

if [ "$EUID" -ne 0 ]; then
    echo "Errore: eseguire come root (sudo flowfiles-update)"
    exit 1
fi

if [ ! -d "$INSTALL_DIR" ]; then
    echo "Errore: $INSTALL_DIR non trovato. FlowFiles non è installato con setup_systemd.sh."
    exit 1
fi

cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

echo "==================================================="
echo "            AGGIORNAMENTO FLOWFILES"
echo "==================================================="

echo
echo "[1/6] Arresto dei servizi..."
systemctl stop flowfiles-frontend flowfiles-backend

echo
echo "[2/6] Download della nuova versione..."
mkdir -p "$TEMP_DIR"
wget -q --show-progress "$REPO_ZIP" -O "$TEMP_DIR/update.zip"

echo
echo "[3/6] Estrazione..."
unzip -q "$TEMP_DIR/update.zip" -d "$TEMP_DIR"
EXTRACTED_DIR="$TEMP_DIR/flowfiles-main"

echo
echo "[4/6] Copia dei sorgenti (preservando uploads/, logs/, .env)..."
# I pattern con "/" iniziale sono relativi alla sorgente (già dentro backend/ o frontend/)
rsync -a \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='/uploads' \
    --exclude='/logs' \
    --exclude='/.env' \
    --exclude='/data' \
    --exclude='/dist' \
    "$EXTRACTED_DIR/backend/" "$INSTALL_DIR/backend/"
rsync -a \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='/dist' \
    "$EXTRACTED_DIR/frontend/" "$INSTALL_DIR/frontend/"

# Migrazione: fino alla 1.4.5 gli upload finivano in backend/dist/uploads,
# che la build cancella. Li spostiamo in backend/uploads prima della build.
OLD_UPLOADS="$INSTALL_DIR/backend/dist/uploads"
if [ -d "$OLD_UPLOADS" ] && [ -n "$(ls -A "$OLD_UPLOADS")" ]; then
    echo "Migrazione upload da dist/uploads a uploads/..."
    mkdir -p "$INSTALL_DIR/backend/uploads"
    rsync -a "$OLD_UPLOADS/" "$INSTALL_DIR/backend/uploads/"
    rm -rf "$OLD_UPLOADS"
fi

# Stessa migrazione per i limiti di storage salvati dall'utente
OLD_SETTINGS="$INSTALL_DIR/backend/dist/config/constants.mjs"
NEW_SETTINGS="$INSTALL_DIR/backend/data/storage-settings.mjs"
if [ -f "$OLD_SETTINGS" ] && [ ! -f "$NEW_SETTINGS" ]; then
    echo "Migrazione limiti di storage in data/..."
    mkdir -p "$(dirname "$NEW_SETTINGS")"
    cp "$OLD_SETTINGS" "$NEW_SETTINGS"
fi

echo
echo "[5/6] Fix permessi + installazione dipendenze + build..."
# rsync ha copiato come root: rendiamo tutto scrivibile da $SERVICE_USER
# prima di lanciare npm come utente non privilegiato.
chown -R "$SERVICE_USER":"$SERVICE_USER" "$INSTALL_DIR"

# npm cache dir per l'utente di servizio (evita errori "cannot write to /var/www/.npm")
SERVICE_HOME="$(getent passwd "$SERVICE_USER" | cut -d: -f6)"
NPM_CACHE_DIR="$SERVICE_HOME/.npm"
mkdir -p "$NPM_CACHE_DIR"
chown -R "$SERVICE_USER":"$SERVICE_USER" "$NPM_CACHE_DIR"

cd "$INSTALL_DIR/backend"
sudo -u "$SERVICE_USER" npm install --no-audit --no-fund
sudo -u "$SERVICE_USER" npm run build

cd "$INSTALL_DIR/frontend"
sudo -u "$SERVICE_USER" npm install --no-audit --no-fund
# Aumenta heap di Node per evitare OOM su server con poca RAM
sudo -u "$SERVICE_USER" NODE_OPTIONS="--max-old-space-size=1024" npm run build

echo
echo "[6/6] Riavvio dei servizi..."
systemctl reset-failed flowfiles-backend flowfiles-frontend 2>/dev/null || true
systemctl start flowfiles-backend flowfiles-frontend

sleep 2
echo
echo "==================================================="
echo "         AGGIORNAMENTO COMPLETATO"
echo "==================================================="
systemctl is-active flowfiles-backend && echo "  backend:  attivo"  || echo "  backend:  NON attivo (controlla journalctl)"
systemctl is-active flowfiles-frontend && echo "  frontend: attivo" || echo "  frontend: NON attivo (controlla journalctl)"
