@echo off
setlocal enabledelayedexpansion

REM Imposta la directory principale del programma come directory corrente
cd /d %~dp0..\..\..
set "MAIN_DIR=%CD%"
echo.
echo Directory principale: %MAIN_DIR%
echo.

echo ===================================================
echo            AGGIORNAMENTO FLOWFILES
echo ===================================================

echo.
echo [1/6] Arresto dei processi di backend e frontend...
taskkill /F /IM node.exe /T >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Processi Node.js terminati con successo.
) else (
    echo Nessun processo Node.js attivo da terminare.
)

echo.
echo [2/6] Download dell'aggiornamento...
set "tempDir=%TEMP%\flowfiles-update"
set "zipFile=%tempDir%\update.zip"

REM Crea cartella temporanea
if exist "%tempDir%" rmdir /S /Q "%tempDir%"
mkdir "%tempDir%"

REM Scarica l'aggiornamento
powershell -Command "& {Invoke-WebRequest -Uri 'https://github.com/alexis-82/flowfiles/archive/refs/heads/main.zip' -OutFile '%zipFile%'}"

if not exist "%zipFile%" (
    echo Errore durante il download del file di aggiornamento.
    goto :error
)

echo.
echo [3/6] Estrazione dei file...
powershell -Command "& {Expand-Archive -Path '%zipFile%' -DestinationPath '%tempDir%' -Force}"

if %ERRORLEVEL% NEQ 0 (
    echo Errore durante l'estrazione del file zip.
    goto :error
)

echo.
echo [4/6] Preparazione per la copia dei file...
set "extractedDir=%tempDir%\flowfiles-main"

REM Elimina il file update.bat dalla cartella temporanea
echo Eliminazione del file update.bat estratto per evitare la sovrascrittura...
if exist "%extractedDir%\frontend\public\scripts\update.bat" (
    del /F /Q "%extractedDir%\frontend\public\scripts\update.bat"
    echo File update.bat eliminato con successo dalla cartella temporanea.
) else (
    echo Il file update.bat non è stato trovato nella cartella estratta.
)

echo.
echo [5/6] Copia dei file nella directory principale...
robocopy "%extractedDir%" "." /E /XD .git node_modules

echo.
echo [6/6] Pulizia...
cd /d "%MAIN_DIR%"
rmdir /S /Q "%tempDir%"

echo.
echo ===================================================
echo        AGGIORNAMENTO COMPLETATO CON SUCCESSO
echo ===================================================
echo L'installazione delle dipendenze continua in background.
echo Per avviare l'applicazione, usa lo script start.bat dopo che l'aggiornamento è completato.
echo.
goto :end

:error
echo.
echo ===================================================
echo       ERRORE DURANTE L'AGGIORNAMENTO
echo ===================================================
pause
exit /b 1

:end
echo Premere un tasto per uscire...
pause > nul
exit