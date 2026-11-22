
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// Registrar un nuevo usuario
async function registrar(req, res, next) {
  try {
    const { nombre, correo, password } = req.body;

    if (
      typeof nombre !== 'string' ||
      typeof correo !== 'string' ||
      typeof password !== 'string' ||
      nombre.trim().length < 2 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim()) ||
      password.length < 8
    ) {
      return res.status(400).json({
        mensaje: 'Ingresa nombre, correo y contraseña válidos (mínimo 8 caracteres).'
      });
    }

    const correoNormalizado = correo.trim().toLowerCase();

    const [existentes] = await pool.query(
      'SELECT id FROM usuario WHERE correo = ?',
      [correoNormalizado]
    );

    if (existentes.length > 0) {
      return res.status(409).json({
        mensaje: 'El correo ya está registrado.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [resultado] = await pool.query(
      'INSERT INTO usuario (nombre, correo, password, rol, estado) VALUES (?, ?, ?, ?, ?)',
      [nombre.trim(), correoNormalizado, passwordHash, 'USUARIO', 'ACTIVO']
    );

    return res.status(201).json({
      mensaje: 'Usuario registrado correctamente.',
      usuario: {
        id: resultado.insertId,
        nombre: nombre.trim(),
        correo: correoNormalizado,
        rol: 'USUARIO'
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'El correo ya está registrado.'
      });
    }

    next(error);
  }
}

// Iniciar sesión
async function login(req, res, next) {
  try {
    const { correo, password } = req.body;

    if (
      typeof correo !== 'string' ||
      typeof password !== 'string' ||
      !correo.trim() ||
      !password
    ) {
      return res.status(400).json({
        mensaje: 'Debes ingresar correo y contraseña.'
      });
    }

    const [usuarios] = await pool.query(
      'SELECT id, nombre, correo, password, rol, estado FROM usuario WHERE correo = ?',
      [correo.trim().toLowerCase()]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        mensaje: 'Credenciales incorrectas.'
      });
    }

    const usuario = usuarios[0];
    const passwordCorrecta = await bcrypt.compare(password, usuario.password);

    if (!passwordCorrecta) {
      return res.status(401).json({
        mensaje: 'Credenciales incorrectas.'
      });
    }

    if (usuario.estado !== 'ACTIVO') {
      return res.status(403).json({
        mensaje: 'La cuenta está bloqueada.'
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('Falta configurar JWT_SECRET en backend/.env');
    }

    const token = jwt.sign(
      { id: usuario.id },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.json({
      mensaje: 'Inicio de sesión exitoso.',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { registrar, login };
