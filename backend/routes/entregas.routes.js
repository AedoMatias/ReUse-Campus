const { Router } = require('express');
const controlador = require('../controllers/entregas.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = Router();

// Todas las operaciones de entregas requieren iniciar sesión
router.use(verificarToken);

router.get('/', controlador.listar);
router.get('/:id', controlador.obtener);
router.patch('/:id/confirmar', controlador.confirmar);

module.exports = router;
