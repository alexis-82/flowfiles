import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateDirectorySize } from '../utils/fileUtils';
import { fileController, renameFile } from '../controllers/fileController';
import fs from 'fs';
import logger from '../utils/logger';
import { verifyVaultPassword, validateVaultToken } from '../middleware/vaultAuth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (_req, file, cb) => {
        cb(null, file.originalname);
    }
});

const STORAGE_LIMIT = 2 * 1024 * 1024 * 1024; // 2GB in bytes

const upload = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024 * 1024, // 2GB limite per file
    },
    fileFilter: async (req, _file, cb) => {
        try {
            const totalSize = calculateDirectorySize(path.join(__dirname, '../../uploads'));
            const fileSize = parseInt(req.headers['content-length'] || '0');

            console.log('Current total size:', totalSize, 'bytes');
            console.log('Incoming file size:', fileSize, 'bytes');
            console.log('Storage limit:', STORAGE_LIMIT, 'bytes');
            if (totalSize + fileSize > STORAGE_LIMIT) {
                return cb(new Error(`Storage limit exceeded. Available: ${STORAGE_LIMIT - totalSize} bytes`));
            }
            cb(null, true);
        } catch (error) {
            console.error('Error in fileFilter:', error);
            cb(null, false);
        }
    }
});

router.post('/upload', upload.single('file'), async (req, res) => {
    await fileController.uploadFile(req, res);
});

router.delete('/all', async (req, res) => {
    await fileController.deleteAllFiles(req, res);
});

router.get('/list', async (req, res) => {
    await fileController.getFiles(req, res);
});

router.get('/download/*', async (req: express.Request, res: express.Response):Promise<any> => {
    const filepath = req.params[0];
    const fullPath = path.join(__dirname, '../../uploads', filepath);
    
    // Controlla se il file esiste
    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: 'File non trovato' });
    }

    // Se è una cartella, usa il download come zip
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
        return fileController.downloadFolderAsZip(req, res);
    }

    // Ottieni l'estensione del file
    const ext = path.extname(filepath).toLowerCase();
    const isTextFile = ['.txt', '.md', '.json', '.js', '.jsx', '.ts', '.tsx', '.css', 
                       '.html', '.xml', '.yml', '.yaml', '.ini', '.conf', '.sh', 
                       '.bat', '.ps1', '.py', '.java', '.cpp', '.c', '.h', '.hpp', 
                       '.sql', '.env', '.gitignore'].includes(ext);

    if (isTextFile) {
        // Per i file di testo, leggi e invia il contenuto
        fs.readFile(fullPath, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).json({ error: 'Errore nella lettura del file' });
            }
            res.setHeader('Content-Type', 'text/plain');
            res.send(data);
        });
    } else {
        // Per gli altri file, usa il download normale
        res.download(fullPath, path.basename(filepath), (err) => {
            if (err) {
                console.error('Errore durante il download:', err);
                res.status(500).json({ error: 'Errore durante il download del file' });
            }
        });
    }
});
router.delete('/:filename', async (req, res) => {
    const filename = req.params.filename;
    await fileController.deleteFile(req, res, filename);
});

router.post('/rename', async (req, res) => {
    await renameFile(req, res);
});

router.post('/folder', async (req, res) => {
    await fileController.createFolder(req, res);
});

router.post('/create', async (req, res) => {
    await fileController.createFile(req, res);
});

router.get('/storage', async (req, res) => {
    await fileController.getStorageInfo(req, res);
});

router.get('/trash', async (req, res) => {
    await fileController.getTrashFiles(req, res);
});

router.delete('/trash/empty', async (req, res) => {
    await fileController.emptyTrash(req, res);
});

router.post('/trash/restore/:filename', async (req, res) => {
    await fileController.restoreFromTrash(req, res);
});

router.delete('/trash/:filename', async (req, res) => {
    await fileController.deleteFromTrash(req, res);
});

router.post('/save', async (req, res) => {
    await fileController.saveFile(req, res);
});

router.post('/log-error', async (req: express.Request, res: express.Response) => {
    const { message, details } = req.body;
    logger.error('Frontend Error:', { message, details });
    res.status(200).json({ success: true });
});

router.post('/upload-folder', upload.single('zipFile'), async (req, res) => {
    await fileController.uploadFolder(req, res);
});

// Rotte per la cassaforte che non richiedono autenticazione
router.post('/vault/set-password', async (req, res) => {
    await fileController.setVaultPassword(req, res);
});
router.get('/vault/status', async (req, res) => {
    await fileController.checkVaultStatus(req, res);
});
router.post('/vault/reset-password', async (req, res) => {
    await fileController.resetVaultPassword(req, res);
});

// Rotta di autenticazione
router.post('/vault/auth', async (req: express.Request, res: express.Response) => {
    await verifyVaultPassword(req, res);
});

// Proteggi tutte le altre rotte della cassaforte con il middleware
router.use('/vault', validateVaultToken);

router.post('/vault/move', async (req, res) => {
    await fileController.moveToVault(req, res);
});

router.get('/vault', async (req, res) => {
    await fileController.getVaultFiles(req, res);
});

router.post('/vault/restore/:filename', async (req, res) => {
    await fileController.restoreFromVault(req, res);
});

router.delete('/vault/:filename', async (req, res) => {
    await fileController.deleteFromVault(req, res);
});

router.get('/vault/download/:filename', async (req, res) => {
    await fileController.downloadVaultFile(req, res);
});

export default router;