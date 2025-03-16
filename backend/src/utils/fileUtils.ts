import fs from 'fs';
import path from 'path';

export const calculateDirectorySize = (dir: string): number => {
    let totalSize = 0;
    const items = fs.readdirSync(dir);

    for (const item of items) {
        if (item === '.gitkeep') continue;
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            totalSize += calculateDirectorySize(fullPath);
        } else {
            totalSize += stats.size;
        }
    }

    return totalSize;
}; 