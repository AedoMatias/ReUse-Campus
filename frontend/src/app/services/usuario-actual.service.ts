
import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UsuarioActualService {
  private readonly auth = inject(AuthService);

  // Obtiene el ID del usuario que inició sesión.
  // Si no hay sesión, devuelve 0.
  readonly id = computed(() => this.auth.usuario()?.id ?? 0);
}
