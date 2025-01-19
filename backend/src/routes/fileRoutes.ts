import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateDirectorySize } from '../utils/fileUtils';
import { fileController, renameFile } from '../controllers/fileController';

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

const STORAGE_LIMIT = 1024 * 1024 * 1024; // 2GB in bytes

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
router.get('/download/*', (req: express.Request, res: express.Response) => {
    const filepath = req.params[0];
    const fullPath = path.join(__dirname, '../../uploads', filepath);
    res.download(fullPath, path.basename(filepath), (err) => {
        if (err) {
            res.status(404).json({ error: 'File non trovato' });
        }
    });
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

export default router;