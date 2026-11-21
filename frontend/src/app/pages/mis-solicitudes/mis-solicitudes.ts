import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SolicitudService } from '../../services/solicitud.service';
import { UsuarioActualService } from '../../services/usuario-actual.service';
import { mensajeError } from '../../core/mensaje-error';
import { EstadoSolicitud, Solicitud } from '../../models/solicitud.model';

// Pantalla "Mis solicitudes": lo que el usuario actual ha pedido y su estado.
@Component({
  selector: 'app-mis-solicitudes',
  imports: [FormsModule, RouterLink],
  templateUrl: './mis-solicitudes.html',
})
export class MisSolicitudes {
  private readonly servicio = inject(SolicitudService);
  readonly usuario = inject(UsuarioActualService);

  readonly solicitudes = signal<Solicitud[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');

  estado: EstadoSolicitud | '' = '';
  readonly estados: EstadoSolicitud[] = ['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA'];

  constructor() {
    // effect: se vuelve a ejecutar cada vez que cambia el usuario elegido en la barra
    effect(() => {
      this.usuario.id();
      this.cargar();
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.servicio.listar({ solicitanteId: this.usuario.id(), estado: this.estado }).subscribe({
      next: (datos) => {
        this.solicitudes.set(datos);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeError(err));
        this.cargando.set(false);
      },
    });
  }

  cancelar(s: Solicitud): void {
    if (!confirm(`¿Cancelar tu solicitud por "${s.publicacionTitulo}"?`)) return;
    this.mensaje.set('');
    this.servicio.cancelar(s.id, this.usuario.id()).subscribe({
      next: () => {
        this.mensaje.set('Solicitud cancelada');
        this.cargar();
      },
      error: (err) => this.error.set(mensajeError(err)),
    });
  }
}
