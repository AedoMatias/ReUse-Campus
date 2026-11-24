const { pool } = require('../config/db');
const AppError = require('../utils/AppError');

// Todas estas funciones se ejecutan solo si el usuario es ADMINISTRADOR
// (lo verifican verificarToken + permitirRoles en admin.routes.js).

function obtenerId(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'El id debe ser un número entero positivo');
  }
  return id;
}

// Convierte filas [{ estado, total }] en un objeto { DISPONIBLE: 3, RESERVADA: 1, ... }
function agrupar(filas, estados) {
  const resultado = { total: 0 };
  for (const estado of estados) resultado[estado] = 0;
  for (const fila of filas) {
    resultado[fila.estado] = Number(fila.total);
    resultado.total += Number(fila.total);
  }
  return resultado;
}

// GET /api/admin/estadisticas
async function estadisticas(req, res) {
  const [usuarios] = await pool.query('SELECT estado, COUNT(*) AS total FROM usuario GROUP BY estado');
  const [publicaciones] = await pool.query('SELECT estado, COUNT(*) AS total FROM publicacion GROUP BY estado');
  const [solicitudes] = await pool.query('SELECT estado, COUNT(*) AS total FROM solicitud GROUP BY estado');
  const [entregas] = await pool.query('SELECT estado, COUNT(*) AS total FROM entrega GROUP BY estado');

  res.json({
    usuarios: agrupar(usuarios, ['ACTIVO', 'BLOQUEADO']),
    publicaciones: agrupar(publicaciones, ['DISPONIBLE', 'RESERVADA', 'ENTREGADA', 'CANCELADA']),
    solicitudes: agrupar(solicitudes, ['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA']),
    entregas: agrupar(entregas, ['PENDIENTE', 'COMPLETADA', 'CANCELADA']),
  });
}

// GET /api/admin/usuarios
// Nunca se devuelve la columna password.
async function listarUsuarios(req, res) {
  const [filas] = await pool.query(`
    SELECT u.id, u.nombre, u.correo, u.rol, u.estado,
           COUNT(p.id) AS publicaciones
    FROM usuario u
    LEFT JOIN publicacion p ON p.usuarioId = u.id
    GROUP BY u.id
    ORDER BY u.id`);
  res.json(filas.map((u) => ({ ...u, publicaciones: Number(u.publicaciones) })));
}

// PATCH /api/admin/usuarios/:id/estado   { estado: 'ACTIVO' | 'BLOQUEADO' }
async function cambiarEstadoUsuario(req, res) {
  const id = obtenerId(req.params.id);
  const estado = req.body?.estado;
  if (!['ACTIVO', 'BLOQUEADO'].includes(estado)) {
    throw new AppError(400, 'El estado debe ser ACTIVO o BLOQUEADO');
  }

  const [[usuario]] = await pool.query('SELECT id, rol FROM usuario WHERE id = ?', [id]);
  if (!usuario) throw new AppError(404, 'Usuario no encontrado');

  // Regla: el administrador no puede bloquearse a sí mismo ni a otro administrador
  if (usuario.id === req.usuario.id) throw new AppError(403, 'No puedes cambiar el estado de tu propia cuenta');
  if (usuario.rol === 'ADMINISTRADOR') throw new AppError(403, 'No se puede bloquear a otro administrador');

  await pool.query('UPDATE usuario SET estado = ? WHERE id = ?', [estado, id]);
  const [[actualizado]] = await pool.query('SELECT id, nombre, correo, rol, estado FROM usuario WHERE id = ?', [id]);
  res.json(actualizado);
}

// GET /api/admin/publicaciones?estado=CANCELADA
// A diferencia de la lista pública, incluye todas (también las ocultas).
async function listarPublicaciones(req, res) {
  const { estado } = req.query;
  const estados = ['DISPONIBLE', 'RESERVADA', 'ENTREGADA', 'CANCELADA'];
  const valores = [];
  let where = '';
  if (estado) {
    if (!estados.includes(estado)) throw new AppError(400, `Estado inválido. Use: ${estados.join(', ')}`);
    where = 'WHERE p.estado = ?';
    valores.push(estado);
  }
  const [filas] = await pool.query(`
    SELECT p.id, p.titulo, p.categoria, p.modalidad, p.estado, p.fechaPublicacion, p.usuarioId,
           u.nombre AS propietario,
           (SELECT COUNT(*) FROM solicitud s WHERE s.publicacionId = p.id) AS solicitudes
    FROM publicacion p
    JOIN usuario u ON u.id = p.usuarioId
    ${where}
    ORDER BY p.fechaPublicacion DESC, p.id DESC`, valores);
  res.json(filas.map((p) => ({ ...p, solicitudes: Number(p.solicitudes) })));
}

// PATCH /api/admin/publicaciones/:id/ocultar
// Moderación: la publicación pasa a CANCELADA (deja de verse) y sus
// solicitudes pendientes se rechazan. Todo en una transacción.
async function ocultarPublicacion(req, res) {
  const id = obtenerId(req.params.id);
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [[publicacion]] = await conexion.query('SELECT estado FROM publicacion WHERE id = ? FOR UPDATE', [id]);
    if (!publicacion) throw new AppError(404, 'Publicación no encontrada');

    // Regla: no se ocultan artículos reservados o entregados (hay una entrega en curso o en el historial)
    if (publicacion.estado !== 'DISPONIBLE') {
      throw new AppError(409, `Solo se pueden ocultar publicaciones DISPONIBLES (estado: ${publicacion.estado})`);
    }

    await conexion.query("UPDATE publicacion SET estado = 'CANCELADA' WHERE id = ?", [id]);
    await conexion.query(
      "UPDATE solicitud SET estado = 'RECHAZADA' WHERE publicacionId = ? AND estado = 'PENDIENTE'",
      [id]
    );
    await conexion.commit();
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
  res.json({ mensaje: 'Publicación ocultada' });
}

// DELETE /api/admin/publicaciones/:id
// Solo se borra si no tiene solicitudes; si las tiene se debe ocultar para no perder el historial.
async function eliminarPublicacion(req, res) {
  const id = obtenerId(req.params.id);
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [[publicacion]] = await conexion.query('SELECT id FROM publicacion WHERE id = ? FOR UPDATE', [id]);
    if (!publicacion) throw new AppError(404, 'Publicación no encontrada');

    const [[{ total }]] = await conexion.query('SELECT COUNT(*) AS total FROM solicitud WHERE publicacionId = ?', [id]);
    if (Number(total) > 0) {
      throw new AppError(409, 'La publicación tiene solicitudes asociadas: ocúltala en vez de eliminarla');
    }

    await conexion.query('DELETE FROM publicacion WHERE id = ?', [id]);
    await conexion.commit();
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
  res.json({ mensaje: 'Publicación eliminada' });
}

module.exports = {
  estadisticas,
  listarUsuarios,
  cambiarEstadoUsuario,
  listarPublicaciones,
  ocultarPublicacion,
  eliminarPublicacion,
};
