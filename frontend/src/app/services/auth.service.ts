
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../core/api.config';
import {
  Usuario,
  RespuestaLogin,
  CredencialesLogin,
  DatosRegistro
} from '../models/usuario.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly usuarioSignal = signal<Usuario | null>(null);
  private token: string | null = null;

  readonly usuario = this.usuarioSignal.asReadonly();
  readonly autenticado = computed(() => this.usuario() !== null);
  readonly esAdministrador = computed(
    () => this.usuario()?.rol === 'ADMINISTRADOR'
  );

  login(credenciales: CredencialesLogin): Observable<RespuestaLogin> {
    return this.http.post<RespuestaLogin>(
      `${API_URL}/auth/login`,
      credenciales
    ).pipe(
      tap((respuesta) => {
        this.token = respuesta.token;
        this.usuarioSignal.set(respuesta.usuario);
      })
    );
  }

  registro(datos: DatosRegistro): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(
      `${API_URL}/auth/registro`,
      datos
    );
  }

  obtenerToken(): string | null {
    return this.token;
  }

  cerrarSesion(): void {
    this.token = null;
    this.usuarioSignal.set(null);
  }
}
