import express from 'express';
import { settingsController } from '../controllers/settingsController';

const router = express.Router();

router.get('/storage', settingsController.getStorageSettings);
router.post('/storage', settingsController.updateStorageSettings);

export default router; 