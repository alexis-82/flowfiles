import { UPLOAD_DIR } from './utils/paths';

export const config = {
    port: process.env.PORT || 3000,
    uploadDir: UPLOAD_DIR,
    env: process.env.NODE_ENV || 'development'
};