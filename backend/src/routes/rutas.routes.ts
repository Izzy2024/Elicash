import { Router } from 'express';
import { getRutas, createRuta, updateRuta, getRutaClientes } from '../controllers/rutas.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getRutas);
router.post('/', createRuta);
router.put('/:id', updateRuta);
router.get('/:id/clientes', getRutaClientes);

export default router;
