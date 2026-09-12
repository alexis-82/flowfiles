@echo off
echo Iniziando l'aggiornamento di Flowfiles...

REM Salva il percorso corrente
set CURRENT_DIR=%CD%

REM Backup dei file di configurazione se necessario
echo Creazione backup configurazioni...
if exist .env (
    copy .env .env.backup
)

REM Pull delle ultime modifiche
echo Download aggiornamenti...
git fetch origin
git pull origin main

REM Installa dipendenze backend
echo Aggiornamento dipendenze backend...
cd backend
call npm install

REM Build backend
echo Build backend...
call npm run build

REM Installa dipendenze frontend
echo Aggiornamento dipendenze frontend...
cd ../frontend
call npm install

REM Build frontend
echo Build frontend...
call npm run build

REM Torna alla directory principale
cd %CURRENT_DIR%

REM Ripristina configurazioni
if exist .env.backup (
    move /Y .env.backup .env
)

echo Aggiornamento completato!
echo Per applicare le modifiche, riavvia l'applicazione.
pause 