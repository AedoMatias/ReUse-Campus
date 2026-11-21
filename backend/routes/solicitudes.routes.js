// Rutas de solicitudes de artículos
const { Router } = require('express');
const controlador = require('../controllers/solicitudes.controller');

const router = Router();

router.get('/', controlador.listar);                 // Listar (filtros: solicitanteId, publicacionId, estado)
router.get('/:id', controlador.obtener);             // Ver una
router.post('/', controlador.crear);                 // Solicitar un artículo
router.patch('/:id/cancelar', controlador.cancelar); // Cancelar una solicitud pendiente

module.exports = router;
