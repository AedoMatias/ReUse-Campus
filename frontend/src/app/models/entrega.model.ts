// Tipos de datos de una entrega (tabla entrega de MySQL + datos de los JOIN)

export type EstadoEntrega = 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA';

export interface Entrega {
  id: number;
  publicacionId: number;
  solicitudId: number;
  propietarioId: number;
  receptorId: number;
  fechaAcuerdo: string;
  fechaEntrega: string | null;
  estado: EstadoEntrega;
  publicacionTitulo: string;
  categoria: string;
  modalidad: string;
  publicacionEstado: string;
  propietario: string;
  receptor: string;
}
