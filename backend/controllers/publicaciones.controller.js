const { pool } = require('../config/db');
const AppError = require('../utils/AppError');

// Valores permitidos (los mismos que los ENUM de la base de datos)
const CATEGORIAS = ['LIBROS', 'TECNOLOGIA', 'ROPA', 'MUEBLES', 'UTILES', 'DEPORTES', 'OTROS'];
const MODALIDADES = ['DONACION', 'INTERCAMBIO'];
const ESTADOS = ['DISPONIBLE', 'RESERVADA', 'ENTREGADA', 'CANCELADA'];

// Consulta base: la publicación + el nombre de su dueño (JOIN con usuario)
const SELECT_PUBLICACION = `
  SELECT p.id, p.titulo, p.descripcion, p.categoria, p.modalidad, p.estado,
         p.fechaPublicacion, p.usuarioId, u.nombre AS propietario
  FROM publicacion p
  JOIN usuario u ON u.id = p.usuarioId`;

// Convierte el :id de la URL en número y lo valida
function obtenerId(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'El id debe ser un número entero positivo');
  }
  return id;
}

// Validación de los datos de una publicación (backend = validación obligatoria).
// "parcial" = true permite enviar solo algunos campos (para editar).
function validarPublicacion(datos, parcial = false) {
  const errores = [];
  const limpio = {};

  if (datos.titulo !== undefined || !parcial) {
    const titulo = typeof datos.titulo === 'string' ? datos.titulo.trim() : '';
    if (titulo.length < 3 || titulo.length > 150) errores.push('El título debe tener entre 3 y 150 caracteres');
    else limpio.titulo = titulo;
  }

  if (datos.descripcion !== undefined || !parcial) {
    const descripcion = typeof datos.descripcion === 'string' ? datos.descripcion.trim() : '';
    if (descripcion.length < 10 || descripcion.length > 2000) errores.push('La descripción debe tener entre 10 y 2000 caracteres');
    else limpio.descripcion = descripcion;
  }

  if (datos.categoria !== undefined || !parcial) {
    if (!CATEGORIAS.includes(datos.categoria)) errores.push(`La categoría debe ser una de: ${CATEGORIAS.join(', ')}`);
    else limpio.categoria = datos.categoria;
  }

  if (datos.modalidad !== undefined || !parcial) {
    if (!MODALIDADES.includes(datos.modalidad)) errores.push(`La modalidad debe ser una de: ${MODALIDADES.join(', ')}`);
    else limpio.modalidad = datos.modalidad;
  }

  if (errores.length > 0) throw new AppError(400, 'Datos inválidos', errores);
  return limpio;
}

// Busca una publicación o lanza 404
async function buscarPublicacion(id, conexion = pool) {
  const [filas] = await conexion.query(`${SELECT_PUBLICACION} WHERE p.id = ?`, [id]);
  if (filas.length === 0) throw new AppError(404, 'Publicación no encontrada');
  return filas[0];
}

// GET /api/publicaciones?estado=DISPONIBLE&categoria=LIBROS&modalidad=DONACION&usuarioId=2
async function listar(req, res) {
  const { estado, categoria, modalidad, usuarioId } = req.query;
  const condiciones = [];
  const valores = [];

  if (estado) {
    if (!ESTADOS.includes(estado)) throw new AppError(400, `Estado inválido. Use: ${ESTADOS.join(', ')}`);
    condiciones.push('p.estado = ?');
    valores.push(estado);
  }
  if (categoria) {
    if (!CATEGORIAS.includes(categoria)) throw new AppError(400, `Categoría inválida. Use: ${CATEGORIAS.join(', ')}`);
    condiciones.push('p.categoria = ?');
    valores.push(categoria);
  }
  if (modalidad) {
    if (!MODALIDADES.includes(modalidad)) throw new AppError(400, `Modalidad inválida. Use: ${MODALIDADES.join(', ')}`);
    condiciones.push('p.modalidad = ?');
    valores.push(modalidad);
  }
  if (usuarioId) {
    condiciones.push('p.usuarioId = ?');
    valores.push(obtenerId(usuarioId));
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  // Los "?" son parámetros: mysql2 escapa los valores y así se evita la inyección SQL
  const [filas] = await pool.query(`${SELECT_PUBLICACION} ${where} ORDER BY p.fechaPublicacion DESC`, valores);
  res.json(filas);
}

// GET /api/publicaciones/:id
async function obtener(req, res) {
  const publicacion = await buscarPublicacion(obtenerId(req.params.id));
  res.json(publicacion);
}

// POST /api/publicaciones
// (En la Tarea 5 el usuarioId saldrá del token de login en vez del cuerpo)
async function crear(req, res) {
  const cuerpo = req.body || {};
  const datos = validarPublicacion(cuerpo);
  const usuarioId = req.usuario.id;

  // Regla: el dueño debe existir y estar ACTIVO
  const [usuarios] = await pool.query('SELECT estado FROM usuario WHERE id = ?', [usuarioId]);
  if (usuarios.length === 0) throw new AppError(404, 'El usuario no existe');
  if (usuarios[0].estado !== 'ACTIVO') throw new AppError(403, 'Un usuario bloqueado no puede publicar');

  // El estado no lo elige el cliente: toda publicación nueva parte DISPONIBLE
  const [resultado] = await pool.query(
    `INSERT INTO publicacion (titulo, descripcion, categoria, modalidad, estado, usuarioId)
     VALUES (?, ?, ?, ?, 'DISPONIBLE', ?)`,
    [datos.titulo, datos.descripcion, datos.categoria, datos.modalidad, usuarioId]
  );

  const nueva = await buscarPublicacion(resultado.insertId);
  res.status(201).json(nueva);
}

// PUT /api/publicaciones/:id
async function actualizar(req, res) {
  const id = obtenerId(req.params.id);
  const datos = validarPublicacion(req.body || {}, true);
  if (Object.keys(datos).length === 0) {
    throw new AppError(400, 'Envía al menos un campo: titulo, descripcion, categoria o modalidad');
  }

  // Regla: solo se puede editar mientras está DISPONIBLE
  const actual = await buscarPublicacion(id);
    // Solo el propietario puede editar su publicación
if (actual.usuarioId !== req.usuario.id) {
  throw new AppError(403, 'Solo puedes editar tus propias publicaciones');
}
  if (actual.estado !== 'DISPONIBLE') {
    throw new AppError(409, `No se puede editar una publicación en estado ${actual.estado}`);
  }

  // Arma "titulo = ?, categoria = ?" solo con los campos enviados
  const columnas = Object.keys(datos).map((campo) => `${campo} = ?`).join(', ');
  await pool.query(`UPDATE publicacion SET ${columnas} WHERE id = ?`, [...Object.values(datos), id]);

  res.json(await buscarPublicacion(id));
}

// DELETE /api/publicaciones/:id
async function eliminar(req, res) {
  const id = obtenerId(req.params.id);

  // Transacción: varias operaciones que se aplican todas juntas o ninguna
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();

    // FOR UPDATE bloquea la fila mientras decidimos, para evitar cambios simultáneos
  const [filas] = await conexion.query(
  'SELECT estado, usuarioId FROM publicacion WHERE id = ? FOR UPDATE',
  [id]
);

if (filas.length === 0) {
  throw new AppError(404, 'Publicación no encontrada');
}

const { estado, usuarioId } = filas[0];

// Solo el propietario puede eliminar su publicación
if (usuarioId !== req.usuario.id) {
  throw new AppError(403, 'Solo puedes eliminar tus propias publicaciones');
}

    const [[{ total }]] = await conexion.query(
      `SELECT (SELECT COUNT(*) FROM solicitud WHERE publicacionId = ?) +
              (SELECT COUNT(*) FROM entrega   WHERE publicacionId = ?) AS total`,
      [id, id]
    );

    let respuesta;
    if (Number(total) === 0) {
      // Sin historial asociado: se borra de verdad
      await conexion.query('DELETE FROM publicacion WHERE id = ?', [id]);
      respuesta = { mensaje: 'Publicación eliminada' };
    } else {
      // Con solicitudes: se da de baja (CANCELADA) para conservar el historial
      // y las solicitudes pendientes pasan a RECHAZADA
      await conexion.query("UPDATE publicacion SET estado = 'CANCELADA' WHERE id = ?", [id]);
      await conexion.query(
        "UPDATE solicitud SET estado = 'RECHAZADA' WHERE publicacionId = ? AND estado = 'PENDIENTE'",
        [id]
      );
      respuesta = { mensaje: 'La publicación tenía solicitudes: se dio de baja (CANCELADA) para conservar el historial' };
    }

    await conexion.commit();
    res.json(respuesta);
  } catch (error) {
    await conexion.rollback(); // si algo falla, se deshace todo
    throw error;
  } finally {
    conexion.release();
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, CATEGORIAS, MODALIDADES };
