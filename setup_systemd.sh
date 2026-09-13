#!/bin/bash
# setup.sh - Script di installazione e configurazione

set -e  # Exit on error

# Verifica che lo script sia eseguito come root
if [ "$EUID" -ne 0 ]; then
    echo "Questo script deve essere eseguito come root"
    exit 1
fi

# Creare le directory necessarie
mkdir -p /opt/flowfiles/{frontend,backend}
mkdir -p /var/log/flowfiles

# Copia i file nei percorsi appropriati
cp -r frontend/* /opt/flowfiles/frontend/ || { echo "Errore nella copia dei file frontend"; exit 1; }
cp -r backend/* /opt/flowfiles/backend/ || { echo "Errore nella copia dei file backend"; exit 1; }

# Installa lo script di aggiornamento come /usr/local/bin/flowfiles-update
if [ -f scripts/flowfiles-update.sh ]; then
    install -m 0755 scripts/flowfiles-update.sh /usr/local/bin/flowfiles-update
    echo "Script di aggiornamento installato: /usr/local/bin/flowfiles-update"
fi

# Installa i pacchetti necessari all'aggiornamento
apt-get install -y wget unzip rsync

# Installa Node.js 20.x se non è già installato
if ! command -v node &>/dev/null || [ $(node -v | cut -d. -f1 | tr -d 'v') -lt 20 ]; then
    echo "Installazione Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get update
    apt-get install -y nodejs
fi

# Crea il file di servizio systemd per il frontend
cat >/etc/systemd/system/flowfiles-frontend.service <<EOL
[Unit]
Description=File Browser Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/flowfiles/frontend
ExecStart=/usr/bin/npm run preview -- --host 0.0.0.0 --port 8080
Restart=always
Environment=NODE_ENV=production
StandardOutput=append:/var/log/flowfiles/frontend.log
StandardError=append:/var/log/flowfiles/frontend-error.log

[Install]
WantedBy=multi-user.target
EOL

# Crea il file di servizio systemd per il backend
cat >/etc/systemd/system/flowfiles-backend.service <<EOL
[Unit]
Description=File Browser Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/flowfiles/backend
ExecStart=/usr/bin/npm start
Restart=always
# Permette allo script update.sh (spawnato detached) di sopravvivere quando
# l'update killa il processo Node del backend: systemd termina solo il main
# process invece dell'intero cgroup.
KillMode=process
Environment=NODE_ENV=production
StandardOutput=append:/var/log/flowfiles/backend.log
StandardError=append:/var/log/flowfiles/backend-error.log

[Install]
WantedBy=multi-user.target
EOL

# Installa le dipendenze e compila il frontend
cd /opt/flowfiles/frontend
npm install || { echo "Errore nell'installazione delle dipendenze frontend"; exit 1; }
npm run build || { echo "Errore nella build del frontend"; exit 1; }

# Installa le dipendenze e compila il backend
cd /opt/flowfiles/backend
npm install || { echo "Errore nell'installazione delle dipendenze backend"; exit 1; }
npm run build || { echo "Errore nella build del backend"; exit 1; }

# Imposta i permessi corretti
chown -R www-data:www-data /opt/flowfiles
chown -R www-data:www-data /var/log/flowfiles
chmod 755 /opt/flowfiles
chmod 755 /var/log/flowfiles

# Assicurati che i file di log esistano e abbiano i permessi corretti
touch /var/log/flowfiles/{frontend,frontend-error,backend,backend-error}.log
chown www-data:www-data /var/log/flowfiles/*.log
chmod 644 /var/log/flowfiles/*.log

# Ferma i servizi se sono in esecuzione
systemctl stop flowfiles-frontend.service 2>/dev/null || true
systemctl stop flowfiles-backend.service 2>/dev/null || true

# Ricarica systemd e abilita i servizi
systemctl daemon-reload
systemctl enable flowfiles-frontend
systemctl enable flowfiles-backend
systemctl start flowfiles-frontend
systemctl start flowfiles-backend

# Verifica lo stato dei servizi
echo "Verifica dello stato dei servizi..."
sleep 3
systemctl status flowfiles-frontend --no-pager
systemctl status flowfiles-backend --no-pager

echo -e "\nInstallazione completata!"
echo "Backend disponibile su http://localhost:3000"
echo "Frontend disponibile su http://localhost:8080"
echo "Controlla i log in /var/log/flowfiles/"

# Mostra i comandi utili
echo -e "\nComandi utili:"
echo "systemctl status flowfiles-frontend  # Controlla lo stato del frontend"
echo "systemctl status flowfiles-backend   # Controlla lo stato del backend"
echo "journalctl -u flowfiles-frontend    # Visualizza i log del frontend"
echo "journalctl -u flowfiles-backend     # Visualizza i log del backend"
