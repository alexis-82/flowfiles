@echo off
setlocal enabledelayedexpansion

:: Verifica privilegi amministrativi
@REM net session >nul 2>&1
@REM if %errorLevel% neq 0 (
@REM     echo Questo script deve essere eseguito come amministratore
@REM     echo Eseguire il prompt dei comandi come amministratore e riprovare
@REM     pause
@REM     exit /b 1
@REM )

:: Funzione per verificare e installare Node.js
call :check_nodejs
if %errorlevel% neq 0 (
    exit /b 1
)

:: Build backend
echo Controllo backend...
cd backend

echo Installazione dipendenze backend...
call npm install
if %errorlevel% neq 0 (
    echo Errore durante l'installazione delle dipendenze del backend
    cd ..
    pause
    exit /b 1
)

echo Build del backend...
call npm run build
if %errorlevel% neq 0 (
    echo Errore durante la build del backend
    cd ..
    pause
    exit /b 1
)

:: Build frontend
echo Controllo frontend...
cd ..\frontend

echo Installazione dipendenze frontend...
call npm install
if %errorlevel% neq 0 (
    echo Errore durante l'installazione delle dipendenze del frontend
    cd ..
    pause
    exit /b 1
)

echo Build del frontend...
call npm run build
if %errorlevel% neq 0 (
    echo Errore durante la build del frontend
    cd ..
    pause
    exit /b 1
)

:: Avvio backend in background
echo Avvio del backend...
cd ..\backend
start "Backend Server" cmd /c npm start

:: Avvio frontend
echo Avvio del frontend...
cd ..\frontend
call npm run preview

:: Fine dello script
cd ..
goto :eof

:check_nodejs
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js non trovato. Installare Node.js da https://nodejs.org/
    echo Dopo l'installazione, eseguire nuovamente questo script
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node -v') do set nodeversion=%%i
    echo Node.js già installato. Versione: !nodeversion!
    exit /b 0
) 