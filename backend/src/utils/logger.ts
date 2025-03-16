import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configura il formato dei log
const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

// Crea il logger
const logger = winston.createLogger({
    format: logFormat,
    transports: [
        // Log su file con rotazione giornaliera
        new winston.transports.DailyRotateFile({
            filename: path.join(__dirname, '../../logs/app-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'info'
        }),
        // Log degli errori su file separato
        new winston.transports.DailyRotateFile({
            filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'error'
        }),
        // Log su console
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

export default {
    info: (message: string, data?: any) => {
        logger.info(message, { data });
    },
    error: (message: string, data?: any) => {
        logger.error(message, { data });
    },
    warn: (message: string, data?: any) => {
        logger.warn(message, { data });
    }
};