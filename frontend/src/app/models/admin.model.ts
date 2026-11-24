// Tipos de datos del panel de administrador

export type EstadoUsuario = 'ACTIVO' | 'BLOQUEADO';

export interface UsuarioAdmin {
  id: number;
  nombre: string;
  correo: string;
  rol: 'USUARIO' | 'ADMINISTRADOR';
  estado: EstadoUsuario;
  publicaciones: number;
}

export interface PublicacionAdmin {
  id: number;
  titulo: string;
  categoria: string;
  modalidad: string;
  estado: string;
  fechaPublicacion: string;
  usuarioId: number;
  propietario: string;
  solicitudes: number;
}

// Cada grupo trae el total y la cantidad por estado, p. ej. { total: 5, DISPONIBLE: 3, ... }
export type Conteo = Record<string, number>;

export interface Estadisticas {
  usuarios: Conteo;
  publicaciones: Conteo;
  solicitudes: Conteo;
  entregas: Conteo;
}
