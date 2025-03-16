import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const config = {
    port: process.env.PORT || 3000,
    uploadDir: path.join(__dirname, '..', 'uploads'),
    env: process.env.NODE_ENV || 'development'
};