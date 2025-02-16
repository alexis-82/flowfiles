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
            throw new Error('Unable to parse configuration file');
        }

        const storageLimit = parseInt(storageLimitMatch[1]) * 1024 * 1024 * 1024;
        const fileSizeLimit = parseInt(fileSizeLimitMatch[1]) * 1024 * 1024 * 1024;
        // Aggiorna le costanti globali
        (global as any).STORAGE_LIMIT = storageLimit;
        (global as any).FILE_SIZE_LIMIT = fileSizeLimit;

        return { storageLimit, fileSizeLimit };
    } catch (error) {
        console.error('Error reloading constants:', error);
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
            console.error('Error reading storage settings:', error);
            res.status(500).json({ error: 'Failed to read storage settings' });
        }
    },

    updateStorageSettings: async (req: Request, res: Response) => {
        try {
            const { storageLimit, fileSizeLimit } = req.body;

            if (!storageLimit || !fileSizeLimit || 
                storageLimit < 1 || fileSizeLimit < 1) {
                return res.status(400).json({ 
                    error: 'Invalid storage or file size limit values' 
                });
            }

            const configTemplate = `export const STORAGE_LIMIT = ${storageLimit} * 1024 * 1024 * 1024;
export const FILE_SIZE_LIMIT = ${fileSizeLimit} * 1024 * 1024 * 1024;
export const UPLOAD_DIR = 'uploads';`;

            await fs.promises.writeFile(CONFIG_PATH, configTemplate);
            
            // Ricarica le costanti dopo l'aggiornamento
            const newConstants = await reloadConstants();

            res.json({ 
                message: 'Storage settings updated successfully',
                ...newConstants
            });
        } catch (error) {
            console.error('Error updating storage settings:', error);
            res.status(500).json({ error: 'Failed to update storage settings' });
        }
    }
}; 