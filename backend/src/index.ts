import express, {Request, Response} from 'express'
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import fileRoutes from './routes/fileRoutes';
import { generateServerInfoHtml } from './utils/htmlGenerator'
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { requestLogger } from './middleware/requestLogger';
import logger from './utils/logger';

const app = express();

logger.info('Applicazione avviata');

// Assicurati che la directory uploads esista
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    logger.info('Directory uploads creata:', { path: uploadsDir });
}

app.use(cors());
app.use(express.json());
app.use('/api/files', fileRoutes);

const publicPath = join(__dirname, "..", "..", 'public');
console.log('Serving static files from:', publicPath);

app.use(express.static(publicPath, {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

app.use(requestLogger);

app.get('/', (_req: Request, res: Response) => {
    const {html} = generateServerInfoHtml()
    res.send(html)
})

export default app; 