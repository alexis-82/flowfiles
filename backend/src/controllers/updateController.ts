import { Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export const updateController = {
    executeUpdate: async (req: Request, res: Response) => {
        try {
            const { script } = req.body;
            const rootDir = path.join(__dirname, '../../../');
            const scriptPath = path.join(rootDir, script);

            // Verifica che lo script esista
            if (!require('fs').existsSync(scriptPath)) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Script di aggiornamento non trovato' 
                });
            }

            // Rendi lo script eseguibile su sistemi Unix
            if (process.platform !== 'win32') {
                await execAsync(`chmod +x "${scriptPath}"`);
            }

            // Esegui lo script
            const { stdout, stderr } = await execAsync(`"${scriptPath}"`, {
                cwd: rootDir
            });

            if (stderr) {
                console.error('Errore durante l\'esecuzione dello script:', stderr);
            }

            console.log('Output dello script:', stdout);

            res.json({ success: true });
        } catch (error) {
            console.error('Errore durante l\'aggiornamento:', error);
            res.status(500).json({ 
                success: false, 
                error: error instanceof Error ? error.message : 'Errore sconosciuto durante l\'aggiornamento' 
            });
        }
    }
}; 