import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import logger from '../utils/logger';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const TRASH_DIR = path.join(UPLOAD_DIR, '.trash');
const VAULT_DIR = path.join(UPLOAD_DIR, '.vault');

// Assicurati che la directory uploads, trash e vault esistano
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(TRASH_DIR)) {
    fs.mkdirSync(TRASH_DIR, { recursive: true });
}
if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
}

const VAULT_CONFIG_PATH = path.join(VAULT_DIR, '.vault-config.json');

// Inizializza il file di configurazione della vault se non esiste
if (!fs.existsSync(VAULT_CONFIG_PATH)) {
    fs.writeFileSync(VAULT_CONFIG_PATH, JSON.stringify({ 
        passwordHash: null,
        created: new Date().toISOString()
    }));
}

const sanitizePath = (userPath: string): string => {
    // Rimuove eventuali '..' per prevenire directory traversal
    const normalizedPath = path.normalize(userPath).replace(/^(\.\.[\/\\])+/, '');
    return normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;
};

const getFilesRecursively = (dir: string, basePath: string = '', filterSpecialDirs: boolean = true): any[] => {
    const items = fs.readdirSync(dir)
        .filter(filename => {
            // Filtra sempre i file e directory speciali
            if (filterSpecialDirs && (filename === '.gitkeep' || filename === '.trash' || filename === '.vault')) {
                return false;
            }
            
            // Se siamo nella directory .vault, nascondi anche .vault-config.json
            if (path.basename(dir) === '.vault' && filename === '.vault-config.json') {
                return false;
            }
            
            return true;
        })
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
                const children = getFilesRecursively(fullPath, relativePath, filterSpecialDirs);
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
        // Ignora i file e le directory speciali
        if (item === '.gitkeep' || item === '.trash' || item === '.vault') continue;
        
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

export const createFolder = async (req: Request, res: Response) => {
    try {
        const { name, path: folderPath = '/' } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Nome cartella richiesto' });
        }

        const sanitizedPath = sanitizePath(folderPath);
        const sanitizedName = sanitizePath(name);
        const fullPath = path.join(UPLOAD_DIR, sanitizedPath, sanitizedName);

        if (fs.existsSync(fullPath)) {
            return res.status(400).json({ error: 'La cartella esiste già' });
        }

        fs.mkdirSync(fullPath, { recursive: true });
        logger.info(`Cartella creata: ${fullPath}`);
        
        res.json({ message: 'Cartella creata con successo', path: path.join(sanitizedPath, sanitizedName).replace(/\\/g, '/') });
    } catch (error) {
        logger.error('Errore durante la creazione della cartella:', error);
        res.status(500).json({ error: 'Errore durante la creazione della cartella' });
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

    createFolder: createFolder,

    createFile: async (req: Request, res: Response) => {
        try {
            const { name, path: filePath = '/' } = req.body;
            
            if (!name) {
                return res.status(400).json({ error: 'Nome file non specificato' });
            }

            const sanitizedPath = sanitizePath(filePath);
            const sanitizedName = sanitizePath(name);
            const fullPath = path.join(UPLOAD_DIR, sanitizedPath, sanitizedName);

            if (fs.existsSync(fullPath)) {
                return res.status(409).json({ error: 'Esiste già un file con questo nome' });
            }

            // Create an empty file
            await fs.promises.writeFile(fullPath, '', 'utf8');

            const stats = fs.statSync(fullPath);
            const fileInfo = {
                name: path.basename(name),
                size: '0 KB',
                date: stats.mtime.toISOString().split('T')[0],
                type: 'file' as const,
                path: path.join(sanitizedPath, sanitizedName).replace(/\\/g, '/')
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
                .filter(filename => filename !== '.gitkeep' && 
                                  filename !== '.trash' && 
                                  filename !== '.vault');
                
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
    },

    uploadFolder: async (req: Request, res: Response) => {
        logger.info('Tentativo di caricamento cartella', { 
            filename: req.file?.originalname 
        });
        try {
            if (!req.file) {
                logger.warn('Tentativo di caricamento cartella senza file');
                return res.status(400).json({ error: 'Nessuna cartella caricata' });
            }

            const uploadPath = req.body.path || '/';
            const targetDir = path.join(UPLOAD_DIR, sanitizePath(uploadPath));

            if (!fs.existsSync(targetDir)) {
                return res.status(404).json({ error: 'Cartella di destinazione non trovata' });
            }

            const zipFilePath = req.file.path;
            const extractDir = path.join(targetDir, path.parse(req.file.originalname).name); // Estrai nella cartella con lo stesso nome dello zip

            // Crea la directory di estrazione se non esiste
            if (!fs.existsSync(extractDir)) {
                fs.mkdirSync(extractDir, { recursive: true });
            }

            // Estrai il contenuto dello zip
            const zip = new AdmZip(zipFilePath);
            zip.extractAllTo(extractDir, true);

            // Elimina il file zip temporaneo
            fs.unlinkSync(zipFilePath);

            // Invia una risposta di successo
            res.status(200).json({ message: 'Cartella caricata con successo' });
        } catch (error) {
            logger.error('Errore durante il caricamento della cartella', { 
                error, 
                filename: req.file?.originalname 
            });
            res.status(500).json({ 
                error: 'Errore durante il caricamento della cartella',
                details: error instanceof Error ? error.message : 'Unknown error',
                filename: req.file?.originalname
            });
        }
    },

    moveToVault: async (req: Request, res: Response) => {
        try {
            const { path: filepath } = req.body;
            if (!filepath) {
                return res.status(400).json({ error: 'Percorso file non specificato' });
            }

            const sourcePath = path.join(UPLOAD_DIR, sanitizePath(filepath));
            const vaultPath = path.join(VAULT_DIR, path.basename(filepath));

            if (!fs.existsSync(sourcePath)) {
                return res.status(404).json({ error: 'File o cartella non trovato' });
            }

            // Se il file/cartella esiste già nella cassaforte, aggiungi un suffisso numerico
            let finalVaultPath = vaultPath;
            let counter = 1;
            while (fs.existsSync(finalVaultPath)) {
                const ext = path.extname(vaultPath);
                const nameWithoutExt = path.basename(vaultPath, ext);
                finalVaultPath = path.join(VAULT_DIR, `${nameWithoutExt}_${counter}${ext}`);
                counter++;
            }

            const stats = fs.statSync(sourcePath);
            const isDirectory = stats.isDirectory();

            if (isDirectory) {
                // Se è una directory, copiamo ricorsivamente tutti i contenuti
                await fs.promises.mkdir(finalVaultPath, { recursive: true });
                const copyRecursive = async (src: string, dest: string) => {
                    const entries = await fs.promises.readdir(src, { withFileTypes: true });
                    for (const entry of entries) {
                        const srcPath = path.join(src, entry.name);
                        const destPath = path.join(dest, entry.name);
                        if (entry.isDirectory()) {
                            await fs.promises.mkdir(destPath, { recursive: true });
                            await copyRecursive(srcPath, destPath);
                        } else {
                            await fs.promises.copyFile(srcPath, destPath);
                        }
                    }
                };
                await copyRecursive(sourcePath, finalVaultPath);
                // Dopo aver copiato tutto, eliminiamo la directory originale
                await fs.promises.rm(sourcePath, { recursive: true });
            } else {
                // Se è un file, lo spostiamo semplicemente
                await fs.promises.rename(sourcePath, finalVaultPath);
            }

            return res.status(200).json({
                success: true,
                message: isDirectory ? 'Directory moved to vault' : 'File moved to vault',
                shouldNavigateHome: isDirectory
            });
        } catch (error) {
            logger.error('Error moving to vault:', error);
            return res.status(500).json({
                success: false,
                message: 'Error moving file to vault',
                error: (error as Error).message
            });
        }
    },

    getVaultFiles: async (_req: Request, res: Response) => {
        try {
            const items = getFilesRecursively(VAULT_DIR, '', false);
            res.status(200).json(items);
        } catch (error) {
            res.status(500).json({ error: 'Errore durante il recupero dei file dalla cassaforte' });
        }
    },

    restoreFromVault: async (req: Request, res: Response) => {
        try {
            const filename = req.params.filename;
            const vaultPath = path.join(VAULT_DIR, filename);
            const restorePath = path.join(UPLOAD_DIR, filename);

            if (!fs.existsSync(vaultPath)) {
                return res.status(404).json({ error: 'File non trovato nella cassaforte' });
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

            await fs.promises.rename(vaultPath, finalRestorePath);
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

    deleteFromVault: async (req: Request, res: Response) => {
        try {
            const filename = req.params.filename;
            const vaultPath = path.join(VAULT_DIR, filename);

            if (!fs.existsSync(vaultPath)) {
                return res.status(404).json({ error: 'File non trovato nella cassaforte' });
            }

            const stats = fs.statSync(vaultPath);
            if (stats.isDirectory()) {
                await fs.promises.rm(vaultPath, { recursive: true });
            } else {
                await fs.promises.unlink(vaultPath);
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

    downloadVaultFile: async (req: Request, res: Response) => {
        try {
            const filename = req.params.filename;
            const vaultPath = path.join(VAULT_DIR, filename);

            if (!fs.existsSync(vaultPath)) {
                return res.status(404).json({ error: 'File non trovato nella cassaforte' });
            }

            const stats = fs.statSync(vaultPath);
            if (stats.isDirectory()) {
                return res.status(400).json({ error: 'Non è possibile scaricare una cartella' });
            }

            res.download(vaultPath);
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: 'Error downloading file',
                error: (error as Error).message 
            });
        }
    },

    setVaultPassword: async (req: Request, res: Response) => {
        try {
            const { currentPassword, newPassword } = req.body;
            
            if (!newPassword || newPassword.length < 8) {
                return res.status(400).json({ 
                    error: 'La password deve essere di almeno 8 caratteri' 
                });
            }

            const vaultConfig = JSON.parse(fs.readFileSync(VAULT_CONFIG_PATH, 'utf8'));
            
            // Se esiste già una password, verifica quella corrente
            if (vaultConfig.passwordHash) {
                if (!currentPassword) {
                    return res.status(400).json({ 
                        error: 'È richiesta la password corrente' 
                    });
                }
                
                const isValid = await bcrypt.compare(
                    currentPassword, 
                    vaultConfig.passwordHash
                );
                
                if (!isValid) {
                    return res.status(401).json({ 
                        error: 'Password corrente non valida' 
                    });
                }
            }

            // Genera il salt e hash della nuova password
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(newPassword, salt);

            // Aggiorna la configurazione
            vaultConfig.passwordHash = hash;
            vaultConfig.lastModified = new Date().toISOString();
            
            fs.writeFileSync(VAULT_CONFIG_PATH, JSON.stringify(vaultConfig, null, 2));

            res.status(200).json({ 
                message: 'Password della cassaforte impostata con successo' 
            });
        } catch (error) {
            logger.error('Errore durante l\'impostazione della password della vault', error);
            res.status(500).json({ 
                error: 'Errore durante l\'impostazione della password' 
            });
        }
    },

    checkVaultStatus: async (req: Request, res: Response) => {
        try {
            const vaultConfig = JSON.parse(fs.readFileSync(VAULT_CONFIG_PATH, 'utf8'));
            res.status(200).json({ 
                isConfigured: !!vaultConfig.passwordHash 
            });
        } catch (error) {
            logger.error('Errore durante il controllo dello stato della vault', error);
            res.status(500).json({ 
                error: 'Errore durante il controllo dello stato della cassaforte' 
            });
        }
    },

    resetVaultPassword: async (req: Request, res: Response) => {
        try {
            // Leggi il file di configurazione
            const vaultConfig = JSON.parse(fs.readFileSync(VAULT_CONFIG_PATH, 'utf8'));
            
            // Resetta la password (imposta passwordHash a null)
            vaultConfig.passwordHash = null;
            vaultConfig.lastModified = new Date().toISOString();
            vaultConfig.resetDate = new Date().toISOString();
            
            // Salva la configurazione
            fs.writeFileSync(VAULT_CONFIG_PATH, JSON.stringify(vaultConfig, null, 2));

            // Rimuovi tutti i token JWT attivi (opzionale)
            // In questo caso gli utenti dovranno riautenticarsi

            res.status(200).json({ 
                message: 'Password della cassaforte resettata con successo' 
            });
        } catch (error) {
            logger.error('Errore durante il reset della password della vault', error);
            res.status(500).json({ 
                error: 'Errore durante il reset della password' 
            });
        }
    }
};
