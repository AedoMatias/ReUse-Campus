// Rutas de publicaciones: conectan cada URL + método HTTP con su controlador.
const { Router } = require('express');
const controlador = require('../controllers/publicaciones.controller');

const router = Router();

router.get('/', controlador.listar);          // Listar (con filtros opcionales)
router.get('/:id', controlador.obtener);      // Ver una
router.post('/', controlador.crear);          // Crear
router.put('/:id', controlador.actualizar);   // Editar
router.delete('/:id', controlador.eliminar);  // Eliminar o dar de baja

module.exports = router;
