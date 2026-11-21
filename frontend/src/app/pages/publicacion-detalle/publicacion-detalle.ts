import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PublicacionService } from '../../services/publicacion.service';
import { mensajeError } from '../../core/mensaje-error';
import { CATEGORIAS, MODALIDADES, Publicacion } from '../../models/publicacion.model';

// Pantalla con el detalle de una publicación (ruta /publicaciones/:id)
@Component({
  selector: 'app-publicacion-detalle',
  imports: [RouterLink],
  templateUrl: './publicacion-detalle.html',
})
export class PublicacionDetalle implements OnInit {
  private readonly servicio = inject(PublicacionService);
  private readonly ruta = inject(ActivatedRoute); // permite leer el :id de la URL
  private readonly router = inject(Router);

  readonly publicacion = signal<Publicacion | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly mensaje = signal('');

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
