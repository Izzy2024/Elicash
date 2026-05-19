import { Router } from 'express';
import { getCobrosHoy, registerPayment, getMorosos } from '../controllers/cobros.controller';
import { generatePaymentReceipt } from '../controllers/pdf.controller';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/morosos', getMorosos);
router.get('/hoy', getCobrosHoy);
router.post('/payments', registerPayment);
router.get('/payments/:id/receipt', generatePaymentReceipt);

export default router;
