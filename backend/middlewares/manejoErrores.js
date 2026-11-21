const AppError = require('../utils/AppError');

// Ruta que no existe -> 404
function rutaNoEncontrada(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

// Middleware de errores: Express lo reconoce porque recibe 4 parámetros.
// Todos los errores lanzados en los controladores terminan aquí,
// así el cliente siempre recibe un JSON con un código HTTP coherente.
function manejarErrores(err, req, res, next) {
  // Errores controlados por nosotros (validaciones, reglas de negocio)
  if (err instanceof AppError) {
    const cuerpo = { error: err.message };
    if (err.detalles) cuerpo.detalles = err.detalles;
    return res.status(err.status).json(cuerpo);
  }

  // JSON mal escrito en el cuerpo de la petición
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }

  // Errores que vienen de MySQL (segunda barrera: restricciones de la BD)
  switch (err.code) {
    case 'ER_DUP_ENTRY':
      return res.status(409).json({ error: 'El registro ya existe (dato duplicado)' });
    case 'ER_NO_REFERENCED_ROW_2':
      return res.status(400).json({ error: 'Se hace referencia a un registro que no existe' });
    case 'ER_ROW_IS_REFERENCED_2':
      return res.status(409).json({ error: 'No se puede eliminar: el registro está siendo usado' });
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
    case 'WARN_DATA_TRUNCATED':
    case 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD':
      return res.status(400).json({ error: 'Los datos no cumplen las restricciones de la base de datos' });
    case 'ECONNREFUSED':
    case 'ER_ACCESS_DENIED_ERROR':
    case 'ER_BAD_DB_ERROR':
      console.error('Error de conexión con MySQL:', err.message);
      return res.status(503).json({ error: 'No se pudo conectar con la base de datos' });
  }

  // Cualquier otro error: no mostramos detalles internos al cliente
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = { rutaNoEncontrada, manejarErrores };
