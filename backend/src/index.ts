import express from 'express';
import cors from 'cors';
import fileRoutes from './routes/fileRoutes';
import settingsRoutes from './routes/settingsRoutes';
import { reloadConstants } from './controllers/settingsController';
import { UPLOAD_DIR } from './utils/paths';
import fs from 'fs';


const app = express();

// Crea la cartella uploads se non esiste
const uploadsDir = UPLOAD_DIR;
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());

// Configura le routes
app.use('/api/files', fileRoutes);
app.use('/api/settings', settingsRoutes);

// Carica all'avvio i limiti di storage salvati (errori già loggati da reloadConstants)
reloadConstants().catch(() => {});

export default app; 