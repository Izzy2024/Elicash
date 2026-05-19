import { Router } from 'express';
import { createLoan, getLoanById, getInstallments, simulateLoan } from '../controllers/loans.controller';
import { generateLoanContract } from '../controllers/pdf.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', createLoan);
router.post('/simulate', simulateLoan);
router.get('/:id', getLoanById);
router.get('/:id/installments', getInstallments);
router.get('/:id/contract', generateLoanContract);

export default router;
