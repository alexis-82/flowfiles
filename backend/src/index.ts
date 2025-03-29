import express from 'express';
import cors from 'cors';
import fileRoutes from './routes/fileRoutes';
import settingsRoutes from './routes/settingsRoutes';
import updateRoutes from './routes/updateRoutes';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DEBUG: Stampa i percorsi per diagnostica
console.log('DEBUG - __dirname:', __dirname);
console.log('DEBUG - Percorso relativo frontend:', path.join(__dirname, '../../frontend/dist'));
console.log('DEBUG - Percorso assoluto frontend alternativo:', '/opt/filebrowser/frontend/dist');

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
app.use('/api/update', updateRoutes);

// Route della root per fornire informazioni
app.get('/', (req, res) => {
    res.send(`
    <html>
        <head>
            <title>File Browser API Server</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                code {
                    background-color: #f4f4f4;
                    padding: 2px 5px;
                    border-radius: 3px;
                }
                h1 {
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 10px;
                }
            </style>
        </head>
        <body>
            <h1>File Browser - Server API</h1>
            <p>Questo è il server API del File Browser. Il frontend è disponibile all'indirizzo: 
            <a href="http://192.168.1.20:8080">http://192.168.1.20:8080</a></p>
            
            <h2>Endpoint API disponibili:</h2>
            <ul>
                <li><code>/api/files</code> - Gestione file e cartelle</li>
                <li><code>/api/settings</code> - Gestione impostazioni</li>
                <li><code>/api/update</code> - Gestione aggiornamenti</li>
            </ul>
            
            <p>Per accedere all'applicazione completa, utilizzare il frontend.</p>
        </body>
    </html>
    `);
});

export default app;