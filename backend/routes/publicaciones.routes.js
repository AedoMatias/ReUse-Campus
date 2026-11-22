
const { Router } = require('express');
const controlador = require('../controllers/publicaciones.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = Router();

// Consultas públicas
router.get('/', controlador.listar);
router.get('/:id', controlador.obtener);

// Operaciones que requieren iniciar sesión
router.post('/', verificarToken, controlador.crear);
router.put('/:id', verificarToken, controlador.actualizar);
router.delete('/:id', verificarToken, controlador.eliminar);

module.exports = router;
