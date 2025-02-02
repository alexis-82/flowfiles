import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import logger from '../utils/logger';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const TRASH_DIR = path.join(UPLOAD_DIR, '.trash');

// Assicurati che la directory uploads e trash esistano
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(TRASH_DIR)) {
    fs.mkdirSync(TRASH_DIR, { recursive: true });
}

const sanitizePath = (userPath: string): string => {
    // Rimuove eventuali '..' per prevenire directory traversal
    const normalizedPath = path.normalize(userPath).replace(/^(\.\.[\/\\])+/, '');
    return normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;
};

const getFilesRecursively = (dir: string, basePath: string = ''): any[] => {
    const items = fs.readdirSync(dir)
        .filter(filename => filename !== '.gitkeep' && filename !== '.trash')
        .map(filename => {
            const fullPath = path.join(dir, filename);
            const relativePath = path.join(basePath, filename);
            const stats = fs.statSync(fullPath);
            const isDirectory = stats.isDirectory();

            const item = {
                name: filename,
                size: isDirectory ? '-' : stats.size / (1024 * 1024) < 1 
                    ? `${(stats.size / 1024).toFixed(1)} KB`
                    : `${(stats.size / (1024 * 1024)).toFixed(1)} MB`,
                date: stats.mtime.toISOString().split('T')[0],
                type: isDirectory ? 'folder' : 'file',
                path: relativePath.replace(/\\/g, '/'),
            };

            if (isDirectory) {
                const children = getFilesRecursively(fullPath, relativePath);
                if (children.length > 0) {
                    (item as any).children = children;
                }
            }

            return item;
        })
        .sort((a, b) => {
            // Prima le cartelle, poi i file
            if (a.type === 'folder' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'folder') return 1;
            // Ordine alfabetico all'interno dello stesso tipo
            return a.name.localeCompare(b.name);
        });

    return items;
};

const calculateDirectorySize = (dir: string): number => {
    let totalSize = 0;
    const items = fs.readdirSync(dir);

    for (const item of items) {
        if (item === '.gitkeep') continue;
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            totalSize += calculateDirectorySize(fullPath);
        } else {
            totalSize += stats.size;
        }
    }

    return totalSize;
};

export const renameFile = async (req: Request, res: Response) => {
    try {
        const { oldName, newName } = req.body;
        
        if (!oldName || !newName) {
            return res.status(400).json({ error: 'Nome non valido' });
        }

        const oldPath = path.join(UPLOAD_DIR, sanitizePath(oldName));
        const newPath = path.join(UPLOAD_DIR, sanitizePath(newName));

        if (!fs.existsSync(oldPath)) {
            return res.status(404).json({ error: 'File o cartella non trovato' });
        }

        if (fs.existsSync(newPath)) {
            return res.status(409).json({ error: 'Esiste già un file o una cartella con questo nome' });
        }

        await fs.promises.rename(oldPath, newPath);
        res.status(200).json({ message: 'Rinominato con successo' });
    } catch (error) {
        console.error('Errore durante la rinomina:', error);
        res.status(500).json({ error: 'Errore durante la rinomina' });
    }
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

            const uploadPath = req.body.path || '/';
            const targetDir = path.join(UPLOAD_DIR, sanitizePath(uploadPath));

            if (!fs.existsSync(targetDir)) {
                return res.status(404).json({ error: 'Cartella di destinazione non trovata' });
            }

            const oldPath = req.file.path;
            const newPath = path.join(targetDir, req.file.originalname);
            await fs.promises.rename(oldPath, newPath);

            const fileSize = req.file.size;
            const sizeInMB = fileSize / (1024 * 1024);
            const sizeInKB = fileSize / 1024;

            const fileInfo = {
                name: req.file.originalname,
                size: sizeInMB < 1 
                    ? `${sizeInKB.toFixed(1)} KB`
                    : `${sizeInMB.toFixed(1)} MB`,
                date: new Date().toISOString().split('T')[0],
                type: 'file',
                path: path.join(uploadPath, req.file.originalname).replace(/\\/g, '/'),
            };

            logger.info('File caricato con successo', fileInfo);
            res.status(200).json(fileInfo);
        } catch (error) {
            logger.error('Errore durante il caricamento del file', { 
                error, 
                filename: req.file?.originalname 
            });
            res.status(500).json({ 
                error: 'Errore durante il caricamento del file',
                details: error instanceof Error ? error.message : 'Unknown error',
                filename: req.file?.originalname
            });
        }
    },

    getFiles: async (req: Request, res: Response) => {
        try {
            const requestedPath = req.query.path as string || '/';
            const targetDir = path.join(UPLOAD_DIR, sanitizePath(requestedPath));

            if (!fs.existsSync(targetDir)) {
                return res.status(404).json({ error: 'Cartella non trovata' });
            }

            const items = getFilesRecursively(targetDir, requestedPath);
            res.status(200).json(items);
        } catch (error) {
            res.status(500).json({ error: 'Errore durante il recupero degli elementi' });
        }
    },

    deleteFile: async (req: Request, res: Response, filename?: string) => {
        try {
            const filepath = sanitizePath(req.params.filename);
            const fullPath = path.join(UPLOAD_DIR, filepath);
            const trashPath = path.join(TRASH_DIR, path.basename(filepath));

            if (!fs.existsSync(fullPath)) {
                return res.status(404).json({ error: 'File o cartella non trovato' });
            }

            const stats = fs.statSync(fullPath);
            const isDirectory = stats.isDirectory();
            
            // Se il file/cartella esiste già nel cestino, aggiungi un suffisso numerico
            let finalTrashPath = trashPath;
            let counter = 1;
            while (fs.existsSync(finalTrashPath)) {
                const ext = path.extname(trashPath);
                const nameWithoutExt = path.basename(trashPath, ext);
                finalTrashPath = path.join(TRASH_DIR, `${nameWithoutExt}_${counter}${ext}`);
                counter++;
            }

            // Sposta nel cestino invece di eliminare
            await fs.promises.rename(fullPath, finalTrashPath);

            return res.status(200).json({ 
                success: true, 
                message: isDirectory ? 'Directory moved to trash' : 'File moved to trash',
                shouldNavigateHome: isDirectory
            });

        } catch (error) {
            return res.status(500).json({ 
                success: false, 
                message: 'Error moving file to trash',
                error: (error as Error).message 
            });
        }
    },

    createFolder: async (req: Request, res: Response) => {
        try {
            const { name } = req.body;
            
            if (!name) {
                return res.status(400).json({ error: 'Nome cartella non specificato' });
            }

            const folderPath = path.join(UPLOAD_DIR, sanitizePath(name));

            if (fs.existsSync(folderPath)) {
                return res.status(409).json({ error: 'Esiste già una cartella con questo nome' });
            }

            fs.mkdirSync(folderPath, { recursive: true });

            const stats = fs.statSync(folderPath);
            const folderInfo = {
                name: path.basename(name),
                size: '-',
                date: stats.mtime.toISOString().split('T')[0],
                type: 'folder',
                path: name.replace(/\\/g, '/'),
                children: []
            };

            res.status(200).json(folderInfo);
        } catch (error) {
            console.error('Errore durante la creazione della cartella:', error);
            res.status(500).json({ error: 'Errore durante la creazione della cartella' });
        }
    },

    createFile: async (req: Request, res: Response) => {
        try {
            const { name } = req.body;
            
            if (!name) {
                return res.status(400).json({ error: 'Nome file non specificato' });
            }

            const filePath = path.join(UPLOAD_DIR, sanitizePath(name));

            if (fs.existsSync(filePath)) {
                return res.status(409).json({ error: 'Esiste già un file con questo nome' });
            }

            // Create an empty file
            await fs.promises.writeFile(filePath, '', 'utf8');

            const stats = fs.statSync(filePath);
            const fileInfo = {
                name: path.basename(name),
                size: '0 KB',
                date: stats.mtime.toISOString().split('T')[0],
                type: 'file' as const,
                path: name.replace(/\\/g, '/')
            };

            res.status(200).json(fileInfo);
        } catch (error) {
            console.error('Errore durante la creazione del file:', error);
            res.status(500).json({ error: 'Errore durante la creazione del file' });
        }
    },

    renameFile: renameFile,

    deleteAllFiles: async (req: Request, res: Response) => {
        try {
            const items = fs.readdirSync(UPLOAD_DIR)
                .filter(filename => filename !== '.gitkeep' && filename !== '.trash');
                
            for (const item of items) {
                const itemPath = path.join(UPLOAD_DIR, item);
                const trashPath = path.join(TRASH_DIR, item);
                
                // Se il file/cartella esiste già nel cestino, aggiungi un suffisso numerico
                let finalTrashPath = trashPath;
                let counter = 1;
                while (fs.existsSync(finalTrashPath)) {
                    const ext = path.extname(trashPath);
                    const nameWithoutExt = path.basename(trashPath, ext);
                    finalTrashPath = path.join(TRASH_DIR, `${nameWithoutExt}_${counter}${ext}`);
                    counter++;
                }

                // Sposta nel cestino invece di eliminare
                await fs.promises.rename(itemPath, finalTrashPath);
            }
            
            res.status(200).json({ 
                message: 'Tutti gli elementi sono stati spostati nel cestino',
                shouldNavigateHome: true 
            });
        } catch (error) {
            res.status(500).json({ error: 'Errore durante lo spostamento degli elementi nel cestino' });
        }
    },

    async getStorageInfo(req: Request, res: Response) {
        try {
            const totalSize = calculateDirectorySize(UPLOAD_DIR);
            const storageLimit = (global as any).STORAGE_LIMIT || 1024 * 1024 * 1024; // 1GB di default se non definito
            const usedStoragePercentage = (totalSize / storageLimit) * 100;
            
            res.json({
                totalStorage: storageLimit,
                usedStorage: totalSize,
                usedPercentage: Math.min(100, parseFloat(usedStoragePercentage.toFixed(2))),
                freeStorage: Math.max(0, storageLimit - totalSize)
            });
        } catch (error) {
            logger.error('Error getting storage info:', error);
            res.status(500).json({ error: 'Failed to get storage information' });
        }
    },

    getTrashFiles: async (_req: Request, res: Response) => {
        try {
            const items = getFilesRecursively(TRASH_DIR);
            res.status(200).json(items);
        } catch (error) {
            res.status(500).json({ error: 'Errore durante il recupero degli elementi nel cestino' });
        }
    },

    restoreFromTrash: async (req: Request, res: Response) => {
        try {
            const filename = req.params.filename;
            const trashPath = path.join(TRASH_DIR, filename);
            const restorePath = path.join(UPLOAD_DIR, filename);

            if (!fs.existsSync(trashPath)) {
                return res.status(404).json({ error: 'File non trovato nel cestino' });
            }

            // Se esiste già un file con lo stesso nome nella destinazione
            let finalRestorePath = restorePath;
            let counter = 1;
            while (fs.existsSync(finalRestorePath)) {
                const ext = path.extname(restorePath);
                const nameWithoutExt = path.basename(restorePath, ext);
                finalRestorePath = path.join(UPLOAD_DIR, `${nameWithoutExt}_${counter}${ext}`);
                counter++;
            }

            await fs.promises.rename(trashPath, finalRestorePath);
            res.status(200).json({ 
                success: true, 
                message: 'File restored successfully' 
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: 'Error restoring file',
                error: (error as Error).message 
            });
        }
    },

    deleteFromTrash: async (req: Request, res: Response) => {
        try {
            const filename = req.params.filename;
            const trashPath = path.join(TRASH_DIR, filename);

            if (!fs.existsSync(trashPath)) {
                return res.status(404).json({ error: 'File non trovato nel cestino' });
            }

            const stats = fs.statSync(trashPath);
            if (stats.isDirectory()) {
                await fs.promises.rm(trashPath, { recursive: true });
            } else {
                await fs.promises.unlink(trashPath);
            }

            res.status(200).json({ 
                success: true, 
                message: 'File permanently deleted' 
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: 'Error deleting file',
                error: (error as Error).message 
            });
        }
    },

    emptyTrash: async (_req: Request, res: Response) => {
        try {
            const items = fs.readdirSync(TRASH_DIR);
            for (const item of items) {
                const itemPath = path.join(TRASH_DIR, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    await fs.promises.rm(itemPath, { recursive: true });
                } else {
                    await fs.promises.unlink(itemPath);
                }
            }
            
            res.status(200).json({ 
                success: true,
                message: 'Trash emptied successfully'
            });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                message: 'Error emptying trash',
                error: (error as Error).message 
            });
        }
    },

    saveFile: async (req: Request, res: Response) => {
        try {
            const { path: filePath, content } = req.body;
            const fullPath = path.join(UPLOAD_DIR, sanitizePath(filePath));

            // Se il contenuto è HTML e il file non è un file HTML, estrai solo il testo
            const ext = path.extname(filePath).toLowerCase();
            const isHtmlFile = ext === '.html';
            
            let finalContent = content;
            if (!isHtmlFile && typeof content === 'string' && content.includes('</')) {
                // Se sembra HTML ma non è un file HTML, rimuovi i tag HTML
                finalContent = content.replace(/<[^>]*>/g, '');
            }

            await fs.promises.writeFile(fullPath, finalContent, 'utf8');
            
            res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error saving file:', error);
            res.status(500).json({ error: 'Errore durante il salvataggio del file' });
        }
    },

    downloadFolderAsZip: async (req: Request, res: Response) => {
        try {
            const folderPath = req.params[0];
            const fullPath = path.join(UPLOAD_DIR, sanitizePath(folderPath));
            
            if (!fs.existsSync(fullPath)) {
                return res.status(404).json({ error: 'Cartella non trovata' });
            }

            const stats = fs.statSync(fullPath);
            if (!stats.isDirectory()) {
                return res.status(400).json({ error: 'Il percorso specificato non è una cartella' });
            }

            // Crea un nome per il file zip basato sul nome della cartella
            const zipFileName = `${path.basename(folderPath)}.zip`;
            
            // Imposta gli header per il download
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

            // Crea un nuovo archivio zip
            const archive = archiver('zip', {
                zlib: { level: 9 } // Massima compressione
            });

            // Gestione degli errori
            archive.on('error', (err) => {
                logger.error('Error creating zip:', err);
                res.status(500).json({ error: 'Errore durante la creazione del file zip' });
            });

            // Pipe dell'archivio alla response
            archive.pipe(res);

            // Aggiungi la cartella all'archivio
            archive.directory(fullPath, path.basename(folderPath));

            // Finalizza l'archivio
            await archive.finalize();

        } catch (error) {
            logger.error('Error in downloadFolderAsZip:', error);
            res.status(500).json({ error: 'Errore durante il download della cartella' });
        }
    }
};
