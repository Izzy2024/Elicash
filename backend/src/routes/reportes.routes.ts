import { Router } from 'express';
import { getDia, getCartera, getGanancias, getSemana, exportExcelReport } from '../controllers/reportes.controller';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/dia', getDia);
router.get('/cartera', getCartera);
router.get('/ganancias', getGanancias);
router.get('/semana', getSemana);
router.get('/excel', exportExcelReport);

export default router;
