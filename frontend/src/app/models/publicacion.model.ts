// Tipos de datos de una publicación (coinciden con la tabla publicacion de MySQL)

export type Categoria = 'LIBROS' | 'TECNOLOGIA' | 'ROPA' | 'MUEBLES' | 'UTILES' | 'DEPORTES' | 'OTROS';
export type Modalidad = 'DONACION' | 'INTERCAMBIO';
export type EstadoPublicacion = 'DISPONIBLE' | 'RESERVADA' | 'ENTREGADA' | 'CANCELADA';

export interface Publicacion {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: Categoria;
  modalidad: Modalidad;
  estado: EstadoPublicacion;
  fechaPublicacion: string;
  usuarioId: number;
  propietario: string; // nombre del dueño (viene del JOIN con usuario)
}

// Datos que se envían al crear o editar
export interface PublicacionDatos {
  titulo: string;
  descripcion: string;
  categoria: Categoria;
  modalidad: Modalidad;
  usuarioId?: number;
}

// Filtros opcionales del listado
export interface FiltrosPublicacion {
  estado?: EstadoPublicacion | '';
  categoria?: Categoria | '';
  modalidad?: Modalidad | '';
  usuarioId?: number;
}

// Listas para los <select> de los formularios, con su texto visible
export const CATEGORIAS: { valor: Categoria; texto: string }[] = [
  { valor: 'LIBROS', texto: 'Libros' },
  { valor: 'TECNOLOGIA', texto: 'Tecnología' },
  { valor: 'ROPA', texto: 'Ropa' },
  { valor: 'MUEBLES', texto: 'Muebles' },
  { valor: 'UTILES', texto: 'Útiles' },
  { valor: 'DEPORTES', texto: 'Deportes' },
  { valor: 'OTROS', texto: 'Otros' },
];

export const MODALIDADES: { valor: Modalidad; texto: string }[] = [
  { valor: 'DONACION', texto: 'Donación' },
  { valor: 'INTERCAMBIO', texto: 'Intercambio' },
];
