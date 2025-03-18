import { Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import logger from '../utils/logger';

const execAsync = promisify(exec);

// Soluzione per __dirname in ambiente ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const updateController = {
    executeUpdate: async (req: Request, res: Response) => {
        try {
            const { script } = req.body;
            logger.info('Richiesta aggiornamento ricevuta per script:', script);
            
            // Directory radice del progetto - saliamo di un ulteriore livello
            const rootDir = path.join(__dirname, '../../../../');
            logger.info('Directory radice del progetto:', rootDir);
            
            // Log per debug struttura directory
            try {
                const frontendPublicPath = path.join(rootDir, 'frontend/public');
                logger.info('frontend/public esiste:', fs.existsSync(frontendPublicPath));
                
                // Se la directory esiste, elenca i contenuti
                if (fs.existsSync(frontendPublicPath)) {
                    const scriptsPath = path.join(frontendPublicPath, 'scripts');
                    if (fs.existsSync(scriptsPath)) {
                        const files = fs.readdirSync(scriptsPath);
                        logger.info('File in frontend/public/scripts:', files);
                    }
                }
            } catch (error) {
                logger.error('Errore durante la verifica delle directory:', error);
            }
            
            // Gestisci il nuovo formato dello script
            let scriptName = '';
            if (typeof script === 'object' && script !== null) {
                // Nuovo formato con oggetto
                logger.info('Ricevuto nuovo formato script con oggetto:', script);
                scriptName = script.name || '';
            } else {
                // Formato vecchio con stringa
                scriptName = typeof script === 'string' ? script : '';
            }
            
            if (!scriptName) {
                logger.error('Nome script non valido');
                return res.status(400).json({
                    success: false,
                    error: 'Nome script non valido'
                });
            }
            
            // Prepara elenco di percorsi possibili
            const possiblePaths = [];
            
            // Aggiungi i percorsi specificati dal frontend
            if (typeof script === 'object' && script !== null && Array.isArray(script.possiblePaths)) {
                for (const possiblePath of script.possiblePaths) {
                    possiblePaths.push(path.join(rootDir, possiblePath));
                }
                logger.info('Percorsi forniti dal frontend:', script.possiblePaths);
            }
            
            // Aggiungi i percorsi standard
            possiblePaths.push(
                // Percorsi relativi alla root
                path.join(rootDir, scriptName),
                path.join(rootDir, 'scripts', scriptName),
                // Percorsi frontend
                path.join(rootDir, 'frontend/public/scripts', scriptName),
                path.join(rootDir, 'frontend/public', scriptName),
                // Percorsi build
                path.join(rootDir, 'frontend/dist/scripts', scriptName),
                path.join(rootDir, 'frontend/dist', scriptName),
                path.join(rootDir, 'dist/scripts', scriptName),
                path.join(rootDir, 'dist', scriptName),
                // Percorsi relativi alla directory corrente
                path.join(process.cwd(), 'scripts', scriptName),
                path.join(process.cwd(), scriptName),
                path.join(process.cwd(), 'public/scripts', scriptName)
            );
            
            logger.info(`Ricerca dello script "${scriptName}" in ${possiblePaths.length} percorsi possibili`);
            
            // Cerca lo script nei percorsi possibili
            let scriptPath = '';
            let scriptFound = false;
            
            for (const possiblePath of possiblePaths) {
                logger.info('Verifico percorso:', possiblePath);
                if (fs.existsSync(possiblePath)) {
                    scriptPath = possiblePath;
                    scriptFound = true;
                    logger.info('Script trovato in:', scriptPath);
                    break;
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
            
            // Esecuzione dello script in modo uniforme su tutti i sistemi
            logger.info('Esecuzione script da directory:', path.dirname(scriptPath));
            const { stdout, stderr } = await execAsync(`"${scriptPath}"`, {
                cwd: rootDir, // Esegui sempre dalla directory principale del progetto
                timeout: 120000 // 120 secondi di timeout
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
        } catch (error) {
            logger.error('Errore durante l\'aggiornamento:', error);
            res.status(500).json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Errore sconosciuto durante l\'aggiornamento' 
            });
        }
    }
}; 