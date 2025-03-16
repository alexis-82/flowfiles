import express from 'express';
import cors from 'cors';
import fileRoutes from './routes/fileRoutes';
import settingsRoutes from './routes/settingsRoutes';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Crea la cartella uploads se non esiste
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());

// Configura le routes
app.use('/api/files', fileRoutes);
app.use('/api/settings', settingsRoutes);

export default app; 