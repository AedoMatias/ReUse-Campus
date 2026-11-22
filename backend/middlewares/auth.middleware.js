
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

async function verificarToken(req, res, next) {
  try {
    const autorizacion = req.headers.authorization;

    if (!autorizacion || !autorizacion.startsWith('Bearer ')) {
      return res.status(401).json({
        mensaje: 'Debes iniciar sesión para continuar.'
      });
    }

    const token = autorizacion.split(' ')[1];

    if (!token || !process.env.JWT_SECRET) {
      return res.status(401).json({
        mensaje: 'Token no válido.'
      });
    }

    let datos;

    try {
      datos = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256']
      });
    } catch (error) {
      return res.status(401).json({
        mensaje: 'Token inválido o expirado.'
      });
    }

    // Consultar el usuario para verificar su estado actual
    const [usuarios] = await pool.query(
      'SELECT id, nombre, correo, rol, estado FROM usuario WHERE id = ?',
      [datos.id]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        mensaje: 'El usuario ya no existe.'
      });
    }

    const usuario = usuarios[0];

    if (usuario.estado !== 'ACTIVO') {
      return res.status(403).json({
        mensaje: 'Tu cuenta está bloqueada.'
      });
    }

    // Disponible para los siguientes controladores
    req.usuario = usuario;

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { verificarToken };
