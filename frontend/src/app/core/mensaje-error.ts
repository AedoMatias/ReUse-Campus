import { HttpErrorResponse } from '@angular/common/http';

// Convierte un error HTTP en un mensaje legible para mostrar en pantalla.
// El backend responde { error: '...', detalles?: [...] }.
export function mensajeError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor. ¿Está encendido el backend en el puerto 3000?';
    }
    const cuerpo = err.error as { error?: string; detalles?: string[] } | null;
    if (cuerpo?.detalles?.length) return `${cuerpo.error}: ${cuerpo.detalles.join('. ')}`;
    if (cuerpo?.error) return cuerpo.error;
    return `Error ${err.status}: ${err.statusText}`;
  }
  return 'Ocurrió un error inesperado';
}
