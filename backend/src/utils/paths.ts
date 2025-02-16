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