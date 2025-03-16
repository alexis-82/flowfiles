import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';
const TOKEN_EXPIRY = parseInt(process.env.TOKEN_EXPIRY || '30');
const VAULT_CONFIG_PATH = path.join(__dirname, '../../uploads/.vault/.vault-config.json');

export const verifyVaultPassword = async (req: Request, res: Response) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Password richiesta' });
        }

        // Leggi la configurazione della cassaforte
        const vaultConfig = JSON.parse(fs.readFileSync(VAULT_CONFIG_PATH, 'utf8'));
        
        if (!vaultConfig.passwordHash) {
            return res.status(401).json({ error: 'Cassaforte non configurata' });
        }

        const isValid = await bcrypt.compare(password, vaultConfig.passwordHash);

        if (!isValid) {
            return res.status(401).json({ error: 'Password non valida' });
        }

        // Genera token JWT
        const token = jwt.sign({}, JWT_SECRET, {
            expiresIn: `${TOKEN_EXPIRY}m`
        });

        res.json({ token });
    } catch (error) {
        console.error('Errore durante la verifica della password:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
};

export const validateVaultToken = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            res.status(401).json({ error: 'Token di autenticazione mancante' });
            return;
        }

        const token = authHeader.split(' ')[1];
        
        jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: 'Token scaduto' });
            return;
        }
        res.status(401).json({ error: 'Token non valido' });
        return;
    }
}; 