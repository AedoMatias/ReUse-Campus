import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PublicacionService } from '../../services/publicacion.service';
import { SolicitudService } from '../../services/solicitud.service';
import { UsuarioActualService } from '../../services/usuario-actual.service';
import { mensajeError } from '../../core/mensaje-error';
import { CATEGORIAS, MODALIDADES, Publicacion } from '../../models/publicacion.model';

// Pantalla con el detalle de una publicación (ruta /publicaciones/:id)
// y el formulario para solicitar el artículo.
@Component({
  selector: 'app-publicacion-detalle',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './publicacion-detalle.html',
})
export class PublicacionDetalle implements OnInit {
  private readonly servicio = inject(PublicacionService);
  private readonly solicitudes = inject(SolicitudService);
  private readonly ruta = inject(ActivatedRoute); // permite leer el :id de la URL
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly usuario = inject(UsuarioActualService);

  readonly publicacion = signal<Publicacion | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly errorSolicitud = signal('');
  readonly exitoSolicitud = signal('');
  readonly enviando = signal(false);

  // computed: se recalcula solo cuando cambian la publicación o el usuario actual
  readonly esPropia = computed(() => this.publicacion()?.usuarioId === this.usuario.id());

  readonly formSolicitud = this.fb.nonNullable.group({
    mensaje: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    const id = Number(this.ruta.snapshot.paramMap.get('id'));
    this.servicio.obtener(id).subscribe({
      next: (p) => {
        this.publicacion.set(p);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeError(err));
        this.cargando.set(false);
      },
    });
  }

  solicitar(): void {
    const p = this.publicacion();
    if (!p) return;
    if (this.formSolicitud.invalid) {
      this.formSolicitud.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.errorSolicitud.set('');
    this.exitoSolicitud.set('');

    // Las reglas (artículo propio, duplicada, no disponible) las valida el backend;
    // si alguna falla, se muestra el mensaje que responde la API.
    this.solicitudes
      .crear({ publicacionId: p.id, solicitanteId: this.usuario.id(), mensaje: this.formSolicitud.getRawValue().mensaje })
      .subscribe({
        next: () => {
          this.exitoSolicitud.set('¡Solicitud enviada! Puedes verla en "Mis solicitudes".');
          this.formSolicitud.reset();
          this.enviando.set(false);
        },
        error: (err) => {
          this.errorSolicitud.set(mensajeError(err));
          this.enviando.set(false);
        },
      });
  }

  eliminar(): void {
    const p = this.publicacion();
    if (!p || !confirm(`¿Eliminar "${p.titulo}"?`)) return;

    this.servicio.eliminar(p.id).subscribe({
      next: (respuesta) => {
        alert(respuesta.mensaje);
        this.router.navigate(['/publicaciones']);
      },
      error: (err) => this.error.set(mensajeError(err)),
    });
  }

  textoCategoria(valor: string): string {
    return CATEGORIAS.find((c) => c.valor === valor)?.texto ?? valor;
  }

  textoModalidad(valor: string): string {
    return MODALIDADES.find((m) => m.valor === valor)?.texto ?? valor;
  }
}
