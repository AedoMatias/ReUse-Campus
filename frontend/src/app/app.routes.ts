import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';
import { PublicacionesLista } from './pages/publicaciones-lista/publicaciones-lista';
import { PublicacionDetalle } from './pages/publicacion-detalle/publicacion-detalle';
import { PublicacionForm } from './pages/publicacion-form/publicacion-form';
import { NoEncontrada } from './pages/no-encontrada/no-encontrada';
import { MisSolicitudes } from './pages/mis-solicitudes/mis-solicitudes';

// Rutas de navegación: cada URL muestra un componente.
// El orden importa: 'publicaciones/nueva' va antes que 'publicaciones/:id'.
export const routes: Routes = [
  { path: '', component: Inicio, title: 'ReUse Campus' },
  { path: 'publicaciones', component: PublicacionesLista, title: 'Publicaciones | ReUse Campus' },
  { path: 'publicaciones/nueva', component: PublicacionForm, title: 'Publicar | ReUse Campus' },
  { path: 'publicaciones/:id', component: PublicacionDetalle, title: 'Detalle | ReUse Campus' },
  { path: 'publicaciones/:id/editar', component: PublicacionForm, title: 'Editar | ReUse Campus' },
  { path: 'mis-solicitudes', component: MisSolicitudes, title: 'Mis solicitudes | ReUse Campus' },
  { path: '**', component: NoEncontrada, title: 'No encontrada | ReUse Campus' },
];
