import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PublicacionService } from '../../services/publicacion.service';
import { mensajeError } from '../../core/mensaje-error';
import {
  CATEGORIAS, Categoria, MODALIDADES, Modalidad, Publicacion,
} from '../../models/publicacion.model';

// Pantalla que muestra las publicaciones disponibles, con filtros.
@Component({
  selector: 'app-publicaciones-lista',
  imports: [FormsModule, RouterLink],
  templateUrl: './publicaciones-lista.html',
})
export class PublicacionesLista implements OnInit {
  private readonly servicio = inject(PublicacionService);

  // signal = variable "reactiva": cuando cambia, Angular actualiza la pantalla
  readonly publicaciones = signal<Publicacion[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  readonly categorias = CATEGORIAS;
  readonly modalidades = MODALIDADES;

  // Valores de los filtros (enlazados a los <select> con ngModel)
  categoria: Categoria | '' = '';
  modalidad: Modalidad | '' = '';

  // ngOnInit se ejecuta una vez, cuando el componente aparece en pantalla
  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    // subscribe: se ejecuta cuando llega la respuesta del backend
    this.servicio
      .listar({ estado: 'DISPONIBLE', categoria: this.categoria, modalidad: this.modalidad })
      .subscribe({
        next: (datos) => {
          this.publicaciones.set(datos);
          this.cargando.set(false);
        },
        error: (err) => {
          this.error.set(mensajeError(err));
          this.cargando.set(false);
        },
      });
  }

  limpiarFiltros(): void {
    this.categoria = '';
    this.modalidad = '';
    this.cargar();
  }

  textoCategoria(valor: string): string {
    return this.categorias.find((c) => c.valor === valor)?.texto ?? valor;
  }

  textoModalidad(valor: string): string {
    return this.modalidades.find((m) => m.valor === valor)?.texto ?? valor;
  }
}
