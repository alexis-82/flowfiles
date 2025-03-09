import express, {Request, Response} from 'express';
import cors from 'cors';
import fileRoutes from './routes/fileRoutes';
import settingsRoutes from './routes/settingsRoutes';
import updateRoutes from './routes/updateRoutes';
import { generateServerInfoHtml } from './utils/htmlGenerator';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { requestLogger } from './middleware/requestLogger';
import logger from './utils/logger';
import path from 'path';
import { reloadConstants } from './controllers/settingsController';

const app = express();

logger.info('Applicazione avviata');

// Carica le costanti all'avvio
reloadConstants().catch(error => {
    logger.error('Error loading constants:', error);
});

app.use(cors());
app.use(express.json({ limit: '2gb' }));
app.use(express.urlencoded({ limit: '2gb', extended: true }));
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use('/api/files', fileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/update', updateRoutes); // Aggiungi le rotte per l'aggiornamento
app.use(express.static(join(__dirname, 'public')));

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
    const {html} = generateServerInfoHtml();
    res.send(html);
});

app.use('/downloads', express.static(path.join(__dirname, '../downloads')));

export default app; 