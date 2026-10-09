import { Request, Response } from 'express';
import fs from 'fs';
import { getConfigPath } from '../utils/paths';

const CONFIG_PATH = getConfigPath();

// Funzione per ricaricare le costanti
export const reloadConstants = async () => {
    try {
        const configContent = await fs.promises.readFile(CONFIG_PATH, 'utf8');
        const storageLimitMatch = configContent.match(/STORAGE_LIMIT = (\d+) \* 1024/);
        const fileSizeLimitMatch = configContent.match(/FILE_SIZE_LIMIT = (\d+) \* 1024/);

        if (!storageLimitMatch || !fileSizeLimitMatch) {
            throw new Error('Impossibile analizzare il file di configurazione');
        }

        const storageLimit = parseInt(storageLimitMatch[1]) * 1024 * 1024 * 1024;
        const fileSizeLimit = parseInt(fileSizeLimitMatch[1]) * 1024 * 1024 * 1024;
        // Aggiorna le costanti globali
        (global as any).STORAGE_LIMIT = storageLimit;
        (global as any).FILE_SIZE_LIMIT = fileSizeLimit;

        return { storageLimit, fileSizeLimit };
    } catch (error) {
        console.error('Errore durante il ricaricamento delle costanti:', error);
        throw error;
    }
};

export const settingsController = {
    getStorageSettings: async (_req: Request, res: Response) => {
        try {
            const { storageLimit, fileSizeLimit } = await reloadConstants();
            res.json({
                storageLimit,
                fileSizeLimit
            });
        } catch (error) {
            console.error('Errore durante la lettura delle impostazioni di storage:', error);
            res.status(500).json({ error: 'Impossibile leggere le impostazioni di storage' });
        }
    },


    updateStorageSettings: async (req: Request, res: Response) => {
        try {
            const { storageLimit, fileSizeLimit } = req.body;

            if (!storageLimit || !fileSizeLimit || 
                storageLimit < 1 || fileSizeLimit < 1) {
                return res.status(400).json({ 
                    error: 'Valori di limite di storage o file non validi' 
                });

            }

            const configTemplate = `export const STORAGE_LIMIT = ${storageLimit} * 1024 * 1024 * 1024;
export const FILE_SIZE_LIMIT = ${fileSizeLimit} * 1024 * 1024 * 1024;
export const UPLOAD_DIR = 'uploads';`;

            await fs.promises.writeFile(CONFIG_PATH, configTemplate);
            
            // Ricarica le costanti dopo l'aggiornamento
            const newConstants = await reloadConstants();

            res.json({ 
                message: 'Impostazioni di storage aggiornate con successo',
                ...newConstants
            });

        } catch (error) {
            console.error('Errore durante l\'aggiornamento delle impostazioni di storage:', error);
            res.status(500).json({ error: 'Impossibile aggiornare le impostazioni di storage' });
        }
    }

}; 