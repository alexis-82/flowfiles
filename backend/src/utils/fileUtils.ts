import fs from 'fs';
import path from 'path';

export function calculateDirectorySize(directoryPath: string): number {
    let totalSize = 0;
    const files = fs.readdirSync(directoryPath);
    
    for (const file of files) {
        const filePath = path.join(directoryPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
            totalSize += stats.size;
        }
    }
    
    return totalSize;
} 