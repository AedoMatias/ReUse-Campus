import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { mensajeError } from '../../core/mensaje-error';
import { Estadisticas, PublicacionAdmin, UsuarioAdmin } from '../../models/admin.model';

// Panel de administrador (ruta /admin): estadísticas, usuarios y moderación de publicaciones.
@Component({
  selector: 'app-admin',
  imports: [RouterLink],
  templateUrl: './admin.html',
})
export class Admin implements OnInit {
  private readonly servicio = inject(AdminService);
  readonly auth = inject(AuthService);

  readonly estadisticas = signal<Estadisticas | null>(null);
  readonly usuarios = signal<UsuarioAdmin[]>([]);
  readonly publicaciones = signal<PublicacionAdmin[]>([]);
  readonly cargando = signal(true);
  readonly procesando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');

  // Tarjetas de estadísticas: título + clave en la respuesta de la API
  readonly grupos: { titulo: string; clave: keyof Estadisticas }[] = [
    { titulo: 'Usuarios', clave: 'usuarios' },
    { titulo: 'Publicaciones', clave: 'publicaciones' },
    { titulo: 'Solicitudes', clave: 'solicitudes' },
    { titulo: 'Entregas', clave: 'entregas' },
  ];

  ngOnInit(): void {
    this.cargar();
  }

  // forkJoin hace las tres peticiones en paralelo y espera a que terminen todas
  cargar(): void {
    forkJoin({
      estadisticas: this.servicio.estadisticas(),
      usuarios: this.servicio.usuarios(),
      publicaciones: this.servicio.publicaciones(),
    }).subscribe({
      next: (datos) => {
        this.estadisticas.set(datos.estadisticas);
        this.usuarios.set(datos.usuarios);
        this.publicaciones.set(datos.publicaciones);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeError(err));
        this.cargando.set(false);
      },
    });
  }

  // Estados de un grupo, sin la clave "total" (p. ej. DISPONIBLE: 3)
  detalle(clave: keyof Estadisticas): [string, number][] {
    const conteo = this.estadisticas()?.[clave] ?? {};
    return Object.entries(conteo).filter(([estado]) => estado !== 'total');
  }

  cambiarEstado(u: UsuarioAdmin): void {
    const nuevo = u.estado === 'ACTIVO' ? 'BLOQUEADO' : 'ACTIVO';
    const accion = nuevo === 'BLOQUEADO' ? 'Bloquear' : 'Activar';
    if (!confirm(`¿${accion} la cuenta de ${u.nombre}?`)) return;
    this.ejecutar(this.servicio.cambiarEstadoUsuario(u.id, nuevo), `Cuenta de ${u.nombre}: ${nuevo}`);
  }

  ocultar(p: PublicacionAdmin): void {
    if (!confirm(`¿Ocultar "${p.titulo}"? Sus solicitudes pendientes se rechazarán.`)) return;
    this.ejecutar(this.servicio.ocultarPublicacion(p.id), `"${p.titulo}" fue ocultada`);
  }

  eliminar(p: PublicacionAdmin): void {
    if (!confirm(`¿Eliminar definitivamente "${p.titulo}"?`)) return;
    this.ejecutar(this.servicio.eliminarPublicacion(p.id), `"${p.titulo}" fue eliminada`);
  }

  // Ejecuta una acción, muestra el resultado y recarga los datos del panel
  private ejecutar(accion: Observable<unknown>, exito: string): void {
    this.procesando.set(true);
    this.mensaje.set('');
    this.error.set('');
    accion.subscribe({
      next: () => {
        this.mensaje.set(exito);
        this.procesando.set(false);
        this.cargar();
      },
      error: (err) => {
        this.error.set(mensajeError(err));
        this.procesando.set(false);
      },
    });
  }
}
