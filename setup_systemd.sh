#!/bin/bash
# setup.sh - Script di installazione e configurazione

set -e  # Exit on error

# Verifica che lo script sia eseguito come root
if [ "$EUID" -ne 0 ]; then
    echo "Questo script deve essere eseguito come root"
    exit 1
fi

# Creare le directory necessarie
mkdir -p /opt/filebrowser/{frontend,backend}
mkdir -p /var/log/filebrowser

# Copia i file nei percorsi appropriati
cp -r frontend/* /opt/filebrowser/frontend/ || { echo "Errore nella copia dei file frontend"; exit 1; }
cp -r backend/* /opt/filebrowser/backend/ || { echo "Errore nella copia dei file backend"; exit 1; }

# Installa Node.js 20.x se non è già installato
if ! command -v node &>/dev/null || [ $(node -v | cut -d. -f1 | tr -d 'v') -lt 20 ]; then
    echo "Installazione Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get update
    apt-get install -y nodejs
fi

# Crea il file di servizio systemd per il frontend
cat >/etc/systemd/system/filebrowser-frontend.service <<EOL
[Unit]
Description=File Browser Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/filebrowser/frontend
ExecStart=/usr/bin/npm run preview -- --host 0.0.0.0 --port 8080
Restart=always
Environment=NODE_ENV=production
StandardOutput=append:/var/log/filebrowser/frontend.log
StandardError=append:/var/log/filebrowser/frontend-error.log

[Install]
WantedBy=multi-user.target
EOL

# Crea il file di servizio systemd per il backend
cat >/etc/systemd/system/filebrowser-backend.service <<EOL
[Unit]
Description=File Browser Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/filebrowser/backend
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production
StandardOutput=append:/var/log/filebrowser/backend.log
StandardError=append:/var/log/filebrowser/backend-error.log

[Install]
WantedBy=multi-user.target
EOL

# Installa le dipendenze e compila il frontend
cd /opt/filebrowser/frontend
npm install || { echo "Errore nell'installazione delle dipendenze frontend"; exit 1; }
npm run build || { echo "Errore nella build del frontend"; exit 1; }

# Installa le dipendenze e compila il backend
cd /opt/filebrowser/backend
npm install || { echo "Errore nell'installazione delle dipendenze backend"; exit 1; }
npm run build || { echo "Errore nella build del backend"; exit 1; }

# Imposta i permessi corretti
chown -R www-data:www-data /opt/filebrowser
chown -R www-data:www-data /var/log/filebrowser
chmod 755 /opt/filebrowser
chmod 755 /var/log/filebrowser

# Assicurati che i file di log esistano e abbiano i permessi corretti
touch /var/log/filebrowser/{frontend,frontend-error,backend,backend-error}.log
chown www-data:www-data /var/log/filebrowser/*.log
chmod 644 /var/log/filebrowser/*.log

# Ferma i servizi se sono in esecuzione
systemctl stop filebrowser-frontend.service 2>/dev/null || true
systemctl stop filebrowser-backend.service 2>/dev/null || true

# Ricarica systemd e abilita i servizi
systemctl daemon-reload
systemctl enable filebrowser-frontend
systemctl enable filebrowser-backend
systemctl start filebrowser-frontend
systemctl start filebrowser-backend

# Verifica lo stato dei servizi
echo "Verifica dello stato dei servizi..."
sleep 3
systemctl status filebrowser-frontend --no-pager
systemctl status filebrowser-backend --no-pager

echo -e "\nInstallazione completata!"
echo "Backend disponibile su http://localhost:3000"
echo "Frontend disponibile su http://localhost:8080"
echo "Controlla i log in /var/log/filebrowser/"

# Mostra i comandi utili
echo -e "\nComandi utili:"
echo "systemctl status filebrowser-frontend  # Controlla lo stato del frontend"
echo "systemctl status filebrowser-backend   # Controlla lo stato del backend"
echo "journalctl -u filebrowser-frontend    # Visualizza i log del frontend"
echo "journalctl -u filebrowser-backend     # Visualizza i log del backend"

