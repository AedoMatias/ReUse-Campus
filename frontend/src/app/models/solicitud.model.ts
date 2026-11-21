// Tipos de datos de una solicitud (tabla solicitud de MySQL + datos de los JOIN)

export type EstadoSolicitud = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA';

export interface Solicitud {
  id: number;
  publicacionId: number;
  solicitanteId: number;
  mensaje: string;
  fechaSolicitud: string;
  estado: EstadoSolicitud;
  publicacionTitulo: string;
  publicacionEstado: string;
  modalidad: string;
  propietarioId: number;
  propietario: string;
  solicitante: string;
}

// Datos que se envían para crear una solicitud
export interface NuevaSolicitud {
  publicacionId: number;
  solicitanteId: number;
  mensaje: string;
}
