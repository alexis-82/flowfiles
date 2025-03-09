import express from 'express';
import { updateController } from '../controllers/updateController';

const router = express.Router();

router.post('/execute-update', async (req, res) => {
    await updateController.executeUpdate(req, res);
});

export default router;