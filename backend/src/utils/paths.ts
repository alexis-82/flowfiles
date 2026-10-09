import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const getDirname = (importMetaUrl: string) => {
    return path.dirname(fileURLToPath(importMetaUrl));
};

export const getConfigPath = () => {
    const dirname = getDirname(import.meta.url);
    const isBuilt = dirname.includes('dist');

    if (isBuilt) {
        return path.resolve(dirname, '../../config/constants.mjs');
    }

    // In dev, look in src/config
    return path.resolve(dirname, '../config/constants.ts');
};

// Root del backend (cartella con package.json), indipendente da dove tsup
// mette il bundle: in produzione il codice gira da dist/bin/www, quindi i
// percorsi relativi a __dirname finivano dentro dist/, cancellata a ogni build.
const findBackendRoot = () => {
    let dir = getDirname(import.meta.url);
    while (!fs.existsSync(path.join(dir, 'package.json'))) {
        const parent = path.dirname(dir);
        if (parent === dir) return process.cwd();
        dir = parent;
    }
    return dir;
};

export const BACKEND_ROOT = findBackendRoot();
export const UPLOAD_DIR = path.join(BACKEND_ROOT, 'uploads');
export const LOGS_DIR = path.join(BACKEND_ROOT, 'logs');

// Limiti di storage scelti dall'utente: fuori da dist/, sopravvivono alle build
export const STORAGE_SETTINGS_PATH = path.join(BACKEND_ROOT, 'data', 'storage-settings.mjs');
