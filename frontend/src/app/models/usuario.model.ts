
export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: 'USUARIO' | 'ADMINISTRADOR';
}

export interface RespuestaLogin {
  mensaje: string;
  token: string;
  usuario: Usuario;
}

export interface CredencialesLogin {
  correo: string;
  password: string;
}

export interface DatosRegistro {
  nombre: string;
  correo: string;
  password: string;
}
