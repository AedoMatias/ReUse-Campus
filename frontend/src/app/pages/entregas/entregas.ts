import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { RouterLink } from '@angular/router';
import { EntregaService } from '../../services/entrega.service';
import { UsuarioActualService } from '../../services/usuario-actual.service';
import { mensajeError } from '../../core/mensaje-error';
import { Entrega } from '../../models/entrega.model';

// Pantalla de entregas (ruta /entregas): pendientes por confirmar + historial.
@Component({
  selector: 'app-entregas',
  imports: [RouterLink],
  templateUrl: './entregas.html',
})
export class Entregas implements OnInit {
  private readonly servicio = inject(EntregaService);
  private readonly destroyRef = inject(DestroyRef);
  readonly usuario = inject(UsuarioActualService);

  private readonly entregas = signal<Entrega[]>([]);
  // computed separa la misma lista en dos secciones sin volver a llamar a la API
  readonly pendientes = computed(() => this.entregas().filter((e) => e.estado === 'PENDIENTE'));
  readonly historial = computed(() => this.entregas().filter((e) => e.estado !== 'PENDIENTE'));

  readonly cargando = signal(false);
  readonly procesando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.servicio.listar().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargando.set(false)),
    ).subscribe({
      next: (datos) => this.entregas.set(datos),
      error: (err) => this.error.set(mensajeError(err)),
    });
  }

  // Texto que indica el rol del usuario en la entrega
  rol(e: Entrega): string {
    return e.propietarioId === this.usuario.id() ? `Entregas a ${e.receptor}` : `Recibes de ${e.propietario}`;
  }

  confirmar(e: Entrega): void {
    if (this.procesando()) return;
    if (!confirm(`¿Confirmar que "${e.publicacionTitulo}" ya fue entregado? Esta acción no se puede deshacer.`)) return;

    this.procesando.set(true);
    this.mensaje.set('');
    this.error.set('');
    this.servicio.confirmar(e.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.procesando.set(false)),
    ).subscribe({
      next: () => {
        this.mensaje.set('Entrega confirmada. El artículo quedó como ENTREGADO.');
        this.cargar();
      },
      error: (err) => this.error.set(mensajeError(err)),
    });
  }
}
