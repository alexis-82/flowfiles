import { Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';

const execAsync = promisify(exec);

export const updateController = {
    executeUpdate: async (req: Request, res: Response) => {
        try {
            const { script } = req.body;
            logger.info('Richiesta aggiornamento ricevuta per script:', script);
            
            // Directory radice del progetto
            const rootDir = path.join(__dirname, '../../../');
            logger.info('Directory radice del progetto:', rootDir);
            
            // Prova diversi percorsi possibili per trovare lo script
            let scriptPath = path.join(rootDir, script);
            let scriptFound = fs.existsSync(scriptPath);
            
            // Se non lo trova nel percorso originale, prova altre possibili posizioni
            if (!scriptFound) {
                logger.info('Script non trovato al percorso specificato, provo percorsi alternativi');
                
                // Prova a cercare lo script direttamente nella directory public/scripts
                const alternativePaths = [
                    path.join(rootDir, 'frontend/public', path.basename(script)),
                    path.join(rootDir, 'frontend/public/scripts', path.basename(script)),
                    path.join(rootDir, 'public/scripts', path.basename(script)),
                    path.join(rootDir, 'public', path.basename(script))
                ];
                
                for (const altPath of alternativePaths) {
                    logger.info('Verifico percorso alternativo:', altPath);
                    if (fs.existsSync(altPath)) {
                        scriptPath = altPath;
                        scriptFound = true;
                        logger.info('Script trovato in percorso alternativo:', scriptPath);
                        break;
                    }
                }
            }

            // Verifica che lo script esista
            if (!scriptFound) {
                logger.error('Script non trovato in nessun percorso testato');
                return res.status(404).json({ 
                    success: false, 
                    error: 'Script di aggiornamento non trovato' 
                });
            }

            logger.info('Script trovato, esecuzione in corso da: ', scriptPath);

            // Rendi lo script eseguibile su sistemi Unix
            if (process.platform !== 'win32') {
                logger.info('Sistema Unix rilevato, rendendo lo script eseguibile...');
                await execAsync(`chmod +x "${scriptPath}"`);
            }

            // Verifica se Git è installato
            try {
                await execAsync('git --version');
                logger.info('Git è installato correttamente');
            } catch (error) {
                logger.error('Git non è installato o non è accessibile:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Git non è installato o non è accessibile nel sistema'
                });
            }
            
            // Su Windows, esegui lo script in una finestra visibile
            if (process.platform === 'win32') {
                logger.info('Esecuzione script in una finestra visibile (Windows)');
                
                // Crea un batch wrapper temporaneo che esegue lo script e mantiene la finestra aperta
                const wrapperPath = path.join(path.dirname(scriptPath), 'update_visible.bat');
                const wrapperContent = `@echo off
echo Esecuzione dello script di aggiornamento in corso...
echo La finestra rimarrà aperta per mostrare tutto il processo

REM Verifica se lo script è in esecuzione in una directory di sistema
echo %CD% | findstr /I /C:"Windows\\System32" > nul
if %errorlevel% equ 0 (
    echo ERRORE: Questo script non può essere eseguito dalla directory di sistema Windows\\System32.
    echo Per ragioni di sicurezza, sarà forzato l'uso della directory principale.
)

REM Determina percorsi basati sullo script e non sul punto di esecuzione
set "SCRIPT_DIR=%~dp0"
set "ABSOLUTE_ROOT=${rootDir.replace(/\\/g, "\\\\")}"

REM Torna sempre alla directory principale del programma, indipendentemente da dove viene eseguito
cd /d "%ABSOLUTE_ROOT%"
echo [INFO] Directory principale (forzata): %CD%

REM Esegui lo script principale passando il percorso assoluto
call "%SCRIPT_DIR%${path.basename(scriptPath)}" "%ABSOLUTE_ROOT%"

echo.
echo Esecuzione completata. Premere un tasto per chiudere questa finestra.
pause > nul
`;
                
                fs.writeFileSync(wrapperPath, wrapperContent);
                logger.info('Wrapper script creato in:', wrapperPath);
                
                // Esegui il wrapper con start per aprire una nuova finestra, forzando la directory di lavoro
                const startCommand = `start "Aggiornamento FlowFiles" /D "${rootDir}" cmd /k "${wrapperPath}"`;
                logger.info('Esecuzione comando:', startCommand);
                
                // Esegui start senza attendere il completamento
                exec(startCommand, { cwd: rootDir });
                
                // Invia la risposta immediatamente
                return res.json({
                    success: true,
                    message: 'Script di aggiornamento avviato in una finestra separata',
                    output: 'Lo script di aggiornamento è stato avviato in una finestra separata. Al termine, premi un tasto per chiudere la finestra.'
                });
            } else {
                // Su sistemi non-Windows, continua con l'esecuzione normale
                logger.info('Esecuzione script da directory:', path.dirname(scriptPath));
                const { stdout, stderr } = await execAsync(`"${scriptPath}"`, {
                    cwd: rootDir, // Esegui sempre dalla directory principale del progetto
                    timeout: 120000 // 120 secondi di timeout (aumentato per dare più tempo)
                });

                if (stderr && stderr.trim() !== '') {
                    // Alcuni messaggi di warning in stderr possono essere normali
                    // Ignora i warning di npm
                    const isNpmWarning = stderr.includes('npm WARN') || stderr.includes('npm notice');
                    const isGitWarning = stderr.includes('warning: ');
                    
                    if (isNpmWarning || isGitWarning) {
                        logger.warn('Warning durante l\'esecuzione dello script (non fatale):', stderr);
                    } else {
                        logger.error('Errore durante l\'esecuzione dello script:', stderr);
                        return res.status(500).json({
                            success: false,
                            error: stderr,
                            output: stdout
                        });
                    }
                }

                logger.info('Output dello script:', stdout);
                
                // Controlla se l'output contiene un messaggio di successo
                const isSuccess = stdout.includes('completato con successo') || !stderr || stderr.trim() === '';
                
                if (!isSuccess) {
                    logger.warn('Esecuzione completata ma senza conferma di successo');
                } else {
                    logger.info('Aggiornamento completato con successo');
                }

                // Invia la risposta con l'output dello script
                res.json({ 
                    success: true,
                    message: 'Script eseguito correttamente',
                    output: stdout 
                });
            }
        } catch (error) {
            logger.error('Errore durante l\'aggiornamento:', error);
            res.status(500).json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Errore sconosciuto durante l\'aggiornamento' 
            });
        }
    }
}; 