const { Router } = require('express');
const controlador = require('../controllers/admin.controller');
const { verificarToken } = require('../middlewares/auth.middleware');
const { permitirRoles } = require('../middlewares/roles.middleware');

const router = Router();

// Todo el panel exige sesión iniciada y rol ADMINISTRADOR
router.use(verificarToken, permitirRoles('ADMINISTRADOR'));

router.get('/estadisticas', controlador.estadisticas);
router.get('/usuarios', controlador.listarUsuarios);
router.patch('/usuarios/:id/estado', controlador.cambiarEstadoUsuario);
router.get('/publicaciones', controlador.listarPublicaciones);
router.patch('/publicaciones/:id/ocultar', controlador.ocultarPublicacion);
router.delete('/publicaciones/:id', controlador.eliminarPublicacion);

module.exports = router;
