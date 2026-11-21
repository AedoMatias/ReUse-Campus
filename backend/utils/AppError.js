// Error "controlado" de la aplicación: lleva el código HTTP que se debe responder.
// Ejemplo: throw new AppError(404, 'Publicación no encontrada');
class AppError extends Error {
  constructor(status, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles; // lista opcional de errores de validación
  }
}

module.exports = AppError;
