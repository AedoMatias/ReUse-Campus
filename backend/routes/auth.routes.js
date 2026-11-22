
const express = require('express');
const router = express.Router();

const {
  registrar,
  login
} = require('../controllers/auth.controller');

const { verificarToken } = require('../middlewares/auth.middleware');
const { permitirRoles } = require('../middlewares/roles.middleware');

// Rutas públicas
router.post('/registro', registrar);
router.post('/login', login);

// Ruta para cualquier usuario autenticado
router.get('/perfil', verificarToken, (req, res) => {
  res.json({
    mensaje: 'Perfil obtenido correctamente.',
    usuario: req.usuario
  });
});

// Ruta exclusiva para administradores
router.get(
  '/admin',
  verificarToken,
  permitirRoles('ADMINISTRADOR'),
  (req, res) => {
    res.json({
      mensaje: 'Acceso autorizado para administrador.'
    });
  }
);

module.exports = router;
