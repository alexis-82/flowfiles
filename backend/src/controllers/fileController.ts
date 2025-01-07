import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import logger from '../utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Assicurati che la directory uploads esista
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const renameFile = async (req: Request, res: Response) => {
    try {
        const { oldName, newName } = req.body;
        
        // Verifica che i nomi dei file siano validi
        if (!oldName || !newName) {
            return res.status(400).json({ error: 'Nome file non valido' });
        }

        const oldPath = path.join(UPLOAD_DIR, oldName);
        const newPath = path.join(UPLOAD_DIR, newName);

        if (!fs.existsSync(oldPath)) {
            return res.status(404).json({ error: 'File non trovato' });
        }

        // Verifica se esiste già un file con il nuovo nome
        if (fs.existsSync(newPath)) {
            return res.status(409).json({ error: 'Esiste già un file con questo nome' });
        }

        await fs.promises.rename(oldPath, newPath);
        res.status(200).json({ message: 'File rinominato con successo' });
    } catch (error) {
        console.error('Errore durante la rinomina del file:', error);
        res.status(500).json({ error: 'Errore durante la rinomina del file' });
    }
};

// Funzione di utilità per calcolare la dimensione totale della directory
const calculateDirectorySize = (directoryPath: string): number => {
    let totalSize = 0;
    const files = fs.readdirSync(directoryPath);
    
    for (const file of files) {
        if (file === '.gitkeep') continue;
        const filePath = path.join(directoryPath, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
    }
    
    return totalSize;
};

export const fileController = {
    uploadFile: async (req: Request, res: Response) => {
        logger.info('Tentativo di caricamento file', { 
            filename: req.file?.originalname 
        });
        try {
            if (!req.file) {
                logger.warn('Tentativo di caricamento senza file');
                return res.status(400).json({ error: 'Nessun file caricato' });
            }

            const fileSize = req.file.size;
            const sizeInMB = fileSize / (1024 * 1024);
            const sizeInKB = fileSize / 1024;

            const fileInfo = {
                name: req.file.originalname,
                // Se il file è più piccolo di 1MB, mostra KB, altrimenti mostra MB
                size: sizeInMB < 1 
                    ? `${sizeInKB.toFixed(1)} KB`
                    : `${sizeInMB.toFixed(1)} MB`,
                date: new Date().toISOString().split('T')[0]
            };

            logger.info('File caricato con successo', fileInfo);
            res.status(200).json(fileInfo);
        } catch (error) {
            logger.error('Errore durante il caricamento del file', { 
                error, 
                filename: req.file?.originalname 
            });
            res.status(500).json({ error: 'Errore durante il caricamento del file' });
        }
    },

    getFiles: async (req: Request, res: Response) => {
        try {
            const files = fs.readdirSync(UPLOAD_DIR)
                .filter(filename => filename !== '.gitkeep')
                .map(filename => {
                    const stats = fs.statSync(path.join(UPLOAD_DIR, filename));
                    const sizeInMB = stats.size / (1024 * 1024);
                    const sizeInKB = stats.size / 1024;

                    return {
                        name: filename,
                        size: sizeInMB < 1 
                            ? `${sizeInKB.toFixed(1)} KB`
                            : `${sizeInMB.toFixed(1)} MB`,
                        date: stats.mtime.toISOString().split('T')[0]
                    };
                });

            res.status(200).json(files);
        } catch (error) {
            res.status(500).json({ error: 'Errore durante il recupero dei file' });
        }
    },

    deleteFile: async (req: Request, res: Response) => {
        try {
            const filename = req.params.filename;
            const filepath = path.join(UPLOAD_DIR, filename);

            if (!fs.existsSync(filepath)) {
                return res.status(404).json({ error: 'File non trovato' });
            }

            fs.unlinkSync(filepath);
            res.status(200).json({ message: 'File eliminato con successo' });
        } catch (error) {
            res.status(500).json({ error: 'Errore durante l\'eliminazione del file' });
        }
    },

    renameFile: renameFile,

    deleteAllFiles: async (req: Request, res: Response) => {
        try {
            const files = fs.readdirSync(UPLOAD_DIR)
                .filter(filename => filename !== '.gitkeep');
                
            for (const file of files) {
                const filepath = path.join(UPLOAD_DIR, file);
                fs.unlinkSync(filepath);
            }
            
            res.status(200).json({ message: 'Tutti i file sono stati eliminati' });
        } catch (error) {
            res.status(500).json({ error: 'Errore durante l\'eliminazione dei file' });
        }
    },

    getStorageInfo: async (req: Request, res: Response) => {
        try {
            const totalSize = calculateDirectorySize(UPLOAD_DIR);
            // Impostiamo un limite di 1GB per lo storage
            // 500MB: const STORAGE_LIMIT = 500 * 1024 * 1024;
           // 2GB: const STORAGE_LIMIT = 2 * 1024 * 1024 * 1024;
            // 5GB: const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024;
            const storageLimit = 1024 * 1024 * 1024; // 1GB in bytes
            const usedPercentage = (totalSize / storageLimit) * 100;
            
            res.status(200).json({
                used: totalSize,
                total: storageLimit,
                percentage: Math.min(100, Math.round(usedPercentage * 10) / 10)
            });
        } catch (error) {
            res.status(500).json({ error: 'Errore durante il recupero delle informazioni sullo storage' });
        }
    }
};
