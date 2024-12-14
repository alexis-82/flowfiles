import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { fileController, renameFile } from '../controllers/fileController';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

router.post('/upload', upload.single('file'), async (req, res) => {
    await fileController.uploadFile(req, res);
});

router.delete('/all', async (req, res) => {
    await fileController.deleteAllFiles(req, res);
});

router.get('/list', async (req, res) => {
    await fileController.getFiles(req, res);
});

router.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, '../../uploads', filename);
    res.download(filepath, filename, (err) => {
        if (err) {
            res.status(404).json({ error: 'File non trovato' });
        }
    });
});

router.delete('/:filename', async (req, res) => {
    await fileController.deleteFile(req, res);
});

router.post('/rename', async (req, res) => {
    await renameFile(req, res);
});

export default router;