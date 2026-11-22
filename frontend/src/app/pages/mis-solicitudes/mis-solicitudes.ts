import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SolicitudService } from '../../services/solicitud.service';
import { UsuarioActualService } from '../../services/usuario-actual.service';
import { mensajeError } from '../../core/mensaje-error';
import { EstadoSolicitud, Solicitud } from '../../models/solicitud.model';

@Component({
  selector: 'app-mis-solicitudes',
  imports: [FormsModule, RouterLink],
  templateUrl: './mis-solicitudes.html',
})
export class MisSolicitudes {
  private readonly servicio = inject(SolicitudService);
  private readonly destroyRef = inject(DestroyRef);
  private carga?: Subscription;
  readonly usuario = inject(UsuarioActualService);

  private readonly solicitudes = signal<Solicitud[]>([]);
  readonly enviadas = computed(() => this.solicitudes().filter(s => s.solicitanteId === this.usuario.id()));
  readonly recibidas = computed(() => this.solicitudes().filter(s => s.propietarioId === this.usuario.id()));
  readonly procesando = signal(false);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');

  estado: EstadoSolicitud | '' = '';
  readonly estados: EstadoSolicitud[] = ['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA'];

  constructor() {
    effect(() => {
      const id = this.usuario.id();
      this.solicitudes.set([]);
      if (id) this.cargar();
    });
  }

  cargar(): void {
    this.carga?.unsubscribe();
    this.cargando.set(true);
    this.error.set('');
    this.carga = this.servicio.listar({ estado: this.estado }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargando.set(false)),
    ).subscribe({
      next: (datos) => {
        this.solicitudes.set(datos);
      },
      error: (err) => {
        this.solicitudes.set([]);
        this.error.set(mensajeError(err));
      },
    });
  }

  resolver(s: Solicitud, accion: 'aceptar' | 'rechazar'): void {
    if (this.procesando() || s.propietarioId !== this.usuario.id()) return;
    const confirmacion = accion === 'aceptar'
      ? `¿Aceptar la solicitud de ${s.solicitante} por "${s.publicacionTitulo}"? El artículo se reservará y las demás solicitudes pendientes se rechazarán.`
      : `¿Rechazar la solicitud de ${s.solicitante} por "${s.publicacionTitulo}"?`;
    if (!confirm(confirmacion)) return;

    this.procesando.set(true);
    this.mensaje.set('');
    this.error.set('');
    this.servicio.resolver(s.id, accion).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.procesando.set(false)),
    ).subscribe({
      next: () => {
        this.mensaje.set(accion === 'aceptar' ? 'Solicitud aceptada. El artículo quedó reservado.' : 'Solicitud rechazada.');
        this.cargar();
      },
      error: (err) => this.error.set(mensajeError(err)),
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
