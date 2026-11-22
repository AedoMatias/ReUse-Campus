const { pool } = require('../config/db');
const AppError = require('../utils/AppError');

const ESTADOS = ['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA'];

// Consulta base: la solicitud + título de la publicación + nombres de los usuarios
const SELECT_SOLICITUD = `
  SELECT s.id, s.publicacionId, s.solicitanteId, s.mensaje, s.fechaSolicitud, s.estado,
         p.titulo AS publicacionTitulo, p.estado AS publicacionEstado, p.modalidad,
         p.usuarioId AS propietarioId, prop.nombre AS propietario,
         sol.nombre AS solicitante
  FROM solicitud s
  JOIN publicacion p ON p.id = s.publicacionId
  JOIN usuario prop  ON prop.id = p.usuarioId
  JOIN usuario sol   ON sol.id  = s.solicitanteId`;

function obtenerId(valor, campo = 'id') {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, `El ${campo} debe ser un número entero positivo`);
  }
  return id;
}

// IMPORTANTE (Tarea 5): cuando exista el login, el usuario que hace la petición
// debe salir del token (req.usuario.id) y no del cuerpo. Solo hay que cambiar esta función.
function usuarioActual(req) {
  function usuarioActual(req) {
  return req.usuario.id;
}
}

async function buscarSolicitud(id, conexion = pool) {
  const [filas] = await conexion.query(`${SELECT_SOLICITUD} WHERE s.id = ?`, [id]);
  if (filas.length === 0) throw new AppError(404, 'Solicitud no encontrada');
  return filas[0];
}

// GET /api/solicitudes?solicitanteId=3&publicacionId=1&estado=PENDIENTE
async function listar(req, res) {
  const { solicitanteId, publicacionId, estado } = req.query;
  const condiciones = [];
  const valores = [];
  // Un usuario normal solo puede consultar sus solicitudes
// o las solicitudes recibidas en sus propias publicaciones.
if (req.usuario.rol !== 'ADMINISTRADOR') {
  condiciones.push(
    '(s.solicitanteId = ? OR p.usuarioId = ?)'
  );
  valores.push(req.usuario.id, req.usuario.id);
}

  if (solicitanteId) {
    condiciones.push('s.solicitanteId = ?');
    valores.push(obtenerId(solicitanteId, 'solicitanteId'));
  }
  if (publicacionId) {
    condiciones.push('s.publicacionId = ?');
    valores.push(obtenerId(publicacionId, 'publicacionId'));
  }
  if (estado) {
    if (!ESTADOS.includes(estado)) throw new AppError(400, `Estado inválido. Use: ${ESTADOS.join(', ')}`);
    condiciones.push('s.estado = ?');
    valores.push(estado);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const [filas] = await pool.query(`${SELECT_SOLICITUD} ${where} ORDER BY s.fechaSolicitud DESC`, valores);
  res.json(filas);
}

// GET /api/solicitudes/:id

async function obtener(req, res) {
  const id = obtenerId(req.params.id);
  const solicitud = await buscarSolicitud(id);

  const esSolicitante = solicitud.solicitanteId === req.usuario.id;
  const esPropietario = solicitud.propietarioId === req.usuario.id;
  const esAdministrador = req.usuario.rol === 'ADMINISTRADOR';

  if (!esSolicitante && !esPropietario && !esAdministrador) {
    throw new AppError(
      403,
      'No tienes permiso para consultar esta solicitud'
    );
  }

  res.json(solicitud);
}

// POST /api/solicitudes  { publicacionId, solicitanteId, mensaje }
async function crear(req, res) {
  const cuerpo = req.body || {};

  // 1. Validación de los datos recibidos
  const errores = [];
  const mensaje = typeof cuerpo.mensaje === 'string' ? cuerpo.mensaje.trim() : '';
  if (mensaje.length < 5 || mensaje.length > 500) errores.push('El mensaje debe tener entre 5 y 500 caracteres');
  if (cuerpo.publicacionId === undefined) errores.push('Falta el publicacionId');
  if (errores.length) throw new AppError(400, 'Datos inválidos', errores);

  const publicacionId = obtenerId(cuerpo.publicacionId, 'publicacionId');
  const solicitanteId = usuarioActual(req);

  // 2. Transacción: las comprobaciones y el INSERT se hacen como una sola operación.
  //    FOR UPDATE bloquea la publicación para que dos solicitudes simultáneas
  //    no pasen las validaciones al mismo tiempo.
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();

    const [usuarios] = await conexion.query('SELECT estado FROM usuario WHERE id = ?', [solicitanteId]);
    if (usuarios.length === 0) throw new AppError(404, 'El usuario solicitante no existe');
    if (usuarios[0].estado !== 'ACTIVO') throw new AppError(403, 'Un usuario bloqueado no puede hacer solicitudes');

    const [publicaciones] = await conexion.query(
      'SELECT usuarioId, estado FROM publicacion WHERE id = ? FOR UPDATE',
      [publicacionId]
    );
    if (publicaciones.length === 0) throw new AppError(404, 'La publicación no existe');
    const publicacion = publicaciones[0];

    // Regla: no se pueden solicitar artículos propios
    if (publicacion.usuarioId === solicitanteId) {
      throw new AppError(403, 'No puedes solicitar un artículo que tú mismo publicaste');
    }

    // Regla: solo se solicitan publicaciones DISPONIBLES
    if (publicacion.estado !== 'DISPONIBLE') {
      throw new AppError(409, `La publicación no está disponible (estado: ${publicacion.estado})`);
    }

    // Regla: no puede haber dos solicitudes PENDIENTES del mismo usuario para la misma publicación
    const [pendientes] = await conexion.query(
      "SELECT id FROM solicitud WHERE publicacionId = ? AND solicitanteId = ? AND estado = 'PENDIENTE'",
      [publicacionId, solicitanteId]
    );
    if (pendientes.length > 0) {
      throw new AppError(409, 'Ya tienes una solicitud pendiente para esta publicación');
    }

    const [resultado] = await conexion.query(
      "INSERT INTO solicitud (publicacionId, solicitanteId, mensaje, estado) VALUES (?, ?, ?, 'PENDIENTE')",
      [publicacionId, solicitanteId, mensaje]
    );

    await conexion.commit();
    res.status(201).json(await buscarSolicitud(resultado.insertId));
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

// PATCH /api/solicitudes/:id/cancelar  { solicitanteId }
async function cancelar(req, res) {
  const id = obtenerId(req.params.id);
  const solicitanteId = usuarioActual(req);

  const solicitud = await buscarSolicitud(id);

  // Regla: solo quien hizo la solicitud puede cancelarla
  if (solicitud.solicitanteId !== solicitanteId) {
    throw new AppError(403, 'Solo puedes cancelar tus propias solicitudes');
  }

  // Regla: solo se cancelan las pendientes.
  // El "AND estado = 'PENDIENTE'" del UPDATE evita cancelar algo que cambió de estado entremedio.
  const [resultado] = await pool.query(
    "UPDATE solicitud SET estado = 'CANCELADA' WHERE id = ? AND estado = 'PENDIENTE'",
    [id]
  );
  if (resultado.affectedRows === 0) {
    throw new AppError(409, `Solo se pueden cancelar solicitudes pendientes (estado actual: ${solicitud.estado})`);
  }

  res.json(await buscarSolicitud(id));
}

module.exports = { listar, obtener, crear, cancelar };
