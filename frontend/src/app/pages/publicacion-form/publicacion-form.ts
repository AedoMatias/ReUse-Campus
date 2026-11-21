import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PublicacionService } from '../../services/publicacion.service';
import { mensajeError } from '../../core/mensaje-error';
import {
  CATEGORIAS, Categoria, MODALIDADES, Modalidad, PublicacionDatos,
} from '../../models/publicacion.model';

// Formulario para crear (/publicaciones/nueva) o editar (/publicaciones/:id/editar).
// Usa formularios reactivos: el formulario y sus validaciones se definen en TypeScript.
@Component({
  selector: 'app-publicacion-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './publicacion-form.html',
})
export class PublicacionForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(PublicacionService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly categorias = CATEGORIAS;
  readonly modalidades = MODALIDADES;

  readonly idEditar = signal<number | null>(null);
  readonly enviando = signal(false);
  readonly error = signal('');

  // Las mismas reglas que valida el backend (el backend siempre vuelve a validar)
  readonly formulario = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    descripcion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
    categoria: ['' as Categoria | '', Validators.required],
    modalidad: ['' as Modalidad | '', Validators.required],
    // Temporal: cuando exista el login (Tarea 5), el usuario saldrá de la sesión
    usuarioId: [2, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    const id = this.ruta.snapshot.paramMap.get('id');
    if (!id) return; // modo crear

    // Modo editar: se cargan los datos actuales en el formulario
    this.idEditar.set(Number(id));
    this.servicio.obtener(Number(id)).subscribe({
      next: (p) => this.formulario.patchValue(p),
      error: (err) => this.error.set(mensajeError(err)),
    });
  }

  // Devuelve true si el campo tiene error y el usuario ya lo tocó (para mostrar el mensaje)
  invalido(campo: keyof typeof this.formulario.controls): boolean {
    const control = this.formulario.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched(); // muestra todos los mensajes de error
      return;
    }

    this.enviando.set(true);
    this.error.set('');
    const valores = this.formulario.getRawValue();
    // El formulario ya es válido, así que categoría y modalidad no están vacías
    const datos: PublicacionDatos = {
      titulo: valores.titulo,
      descripcion: valores.descripcion,
      categoria: valores.categoria as Categoria,
      modalidad: valores.modalidad as Modalidad,
    };
    const id = this.idEditar();

    const peticion = id
      ? this.servicio.actualizar(id, datos)
      : this.servicio.crear({ ...datos, usuarioId: valores.usuarioId });

    peticion.subscribe({
      next: (p) => this.router.navigate(['/publicaciones', p.id]),
      error: (err) => {
        this.error.set(mensajeError(err));
        this.enviando.set(false);
      },
    });
  }
}
