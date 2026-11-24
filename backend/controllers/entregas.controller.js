const { pool } = require('../config/db');
const AppError = require('../utils/AppError');

const ESTADOS = ['PENDIENTE', 'COMPLETADA', 'CANCELADA'];

// Consulta base: la entrega + título de la publicación + nombres de propietario y receptor
const SELECT_ENTREGA = `
  SELECT e.id, e.publicacionId, e.solicitudId, e.propietarioId, e.receptorId,
         e.fechaAcuerdo, e.fechaEntrega, e.estado,
         p.titulo AS publicacionTitulo, p.categoria, p.modalidad, p.estado AS publicacionEstado,
         prop.nombre AS propietario, rec.nombre AS receptor
  FROM entrega e
  JOIN publicacion p ON p.id = e.publicacionId
  JOIN usuario prop  ON prop.id = e.propietarioId
  JOIN usuario rec   ON rec.id  = e.receptorId`;

function obtenerId(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'El id debe ser un número entero positivo');
  }
  return id;
}

async function buscarEntrega(id, conexion = pool) {
  const [filas] = await conexion.query(`${SELECT_ENTREGA} WHERE e.id = ?`, [id]);
  if (filas.length === 0) throw new AppError(404, 'Entrega no encontrada');
  return filas[0];
}

// Solo participan en una entrega el propietario (entrega) y el receptor (recibe).
function esParticipante(entrega, usuario) {
  return entrega.propietarioId === usuario.id || entrega.receptorId === usuario.id;
}

// GET /api/entregas?estado=PENDIENTE
// Sin filtro devuelve el historial completo del usuario (pendientes, completadas y canceladas).
async function listar(req, res) {
  const { estado } = req.query;
  const condiciones = [];
  const valores = [];

  // Un usuario normal solo ve las entregas en las que participa; el administrador ve todas.
  if (req.usuario.rol !== 'ADMINISTRADOR') {
    condiciones.push('(e.propietarioId = ? OR e.receptorId = ?)');
    valores.push(req.usuario.id, req.usuario.id);
  }
  if (estado) {
    if (!ESTADOS.includes(estado)) throw new AppError(400, `Estado inválido. Use: ${ESTADOS.join(', ')}`);
    condiciones.push('e.estado = ?');
    valores.push(estado);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  // Las entregadas se ordenan por fecha de entrega; las pendientes, por fecha de acuerdo.
  const [filas] = await pool.query(
    `${SELECT_ENTREGA} ${where} ORDER BY COALESCE(e.fechaEntrega, e.fechaAcuerdo) DESC, e.id DESC`,
    valores
  );
  res.json(filas);
}

// GET /api/entregas/:id
async function obtener(req, res) {
  const entrega = await buscarEntrega(obtenerId(req.params.id));
  if (!esParticipante(entrega, req.usuario) && req.usuario.rol !== 'ADMINISTRADOR') {
    throw new AppError(403, 'No tienes permiso para consultar esta entrega');
  }
  res.json(entrega);
}

// PATCH /api/entregas/:id/confirmar
// Marca la entrega como COMPLETADA y la publicación como ENTREGADA en una sola transacción:
// o se guardan los dos cambios, o ninguno.
async function confirmar(req, res) {
  const id = obtenerId(req.params.id);
  const conexion = await pool.getConnection();
  let respuesta;
  try {
    await conexion.beginTransaction();

    // FOR UPDATE bloquea la fila: si dos personas confirman a la vez,
    // la segunda espera y luego ve que ya está COMPLETADA.
    const [[entrega]] = await conexion.query(
      'SELECT publicacionId, propietarioId, receptorId, estado FROM entrega WHERE id = ? FOR UPDATE',
      [id]
    );
    if (!entrega) throw new AppError(404, 'Entrega no encontrada');

    // Regla: solo los participantes pueden confirmar
    if (!esParticipante(entrega, req.usuario)) {
      throw new AppError(403, 'Solo el propietario o el receptor pueden confirmar esta entrega');
    }

    // Regla: no se confirma dos veces ni una entrega cancelada
    if (entrega.estado !== 'PENDIENTE') {
      throw new AppError(409, `La entrega ya no está pendiente (estado: ${entrega.estado})`);
    }

    const [[publicacion]] = await conexion.query(
      'SELECT estado FROM publicacion WHERE id = ? FOR UPDATE',
      [entrega.publicacionId]
    );
    if (publicacion.estado !== 'RESERVADA') {
      throw new AppError(409, `La publicación no está reservada (estado: ${publicacion.estado})`);
    }

    await conexion.query(
      "UPDATE entrega SET estado = 'COMPLETADA', fechaEntrega = NOW() WHERE id = ?",
      [id]
    );
    await conexion.query(
      "UPDATE publicacion SET estado = 'ENTREGADA' WHERE id = ?",
      [entrega.publicacionId]
    );

    respuesta = await buscarEntrega(id, conexion);
    await conexion.commit();
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
  res.json(respuesta);
}

module.exports = { listar, obtener, confirmar };
