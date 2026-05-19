import { Router } from 'express';
import { getClients, createClient, getClientById, updateClient } from '../controllers/clients.controller';
import { generateClientStatement } from '../controllers/pdf.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getClients);
router.post('/', createClient);
router.get('/:id', getClientById);
router.put('/:id', updateClient);
router.get('/:id/estado-cuenta', generateClientStatement);

export default router;
