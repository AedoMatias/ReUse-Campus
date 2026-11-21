import { Injectable, signal } from '@angular/core';

// TEMPORAL hasta la Tarea 5 (login): guarda qué usuario de prueba está usando la app.
// Se elige desde la barra de navegación. Cuando exista el login,
// este id saldrá del usuario autenticado y este servicio se reemplaza.
@Injectable({ providedIn: 'root' })
export class UsuarioActualService {
  // Usuarios de prueba cargados por database/reuse_campus.sql
  readonly usuariosPrueba = [
    { id: 2, nombre: 'Ana Torres' },
    { id: 3, nombre: 'Bruno Díaz' },
    { id: 4, nombre: 'Carla Muñoz' },
    { id: 5, nombre: 'Diego Rojas (bloqueado)' },
  ];

  readonly id = signal(3);

  cambiar(id: number): void {
    this.id.set(id);
  }
}
