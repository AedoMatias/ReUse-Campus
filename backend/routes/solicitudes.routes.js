
const { Router } = require('express');
const controlador = require('../controllers/solicitudes.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = Router();

// Todas las operaciones de solicitudes requieren autenticación
router.use(verificarToken);

router.get('/', controlador.listar);
router.get('/:id', controlador.obtener);
router.post('/', controlador.crear);
router.patch('/:id/cancelar', controlador.cancelar);

module.exports = router;
