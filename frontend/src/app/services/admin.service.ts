import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../core/api.config';
import { Estadisticas, EstadoUsuario, PublicacionAdmin, UsuarioAdmin } from '../models/admin.model';

// Servicio para consumir /api/admin (solo administradores; el token lo agrega el interceptor)
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/admin`;

  estadisticas(): Observable<Estadisticas> {
    return this.http.get<Estadisticas>(`${this.url}/estadisticas`);
  }

  usuarios(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(`${this.url}/usuarios`);
  }

  cambiarEstadoUsuario(id: number, estado: EstadoUsuario): Observable<UsuarioAdmin> {
    return this.http.patch<UsuarioAdmin>(`${this.url}/usuarios/${id}/estado`, { estado });
  }

  publicaciones(): Observable<PublicacionAdmin[]> {
    return this.http.get<PublicacionAdmin[]>(`${this.url}/publicaciones`);
  }

  ocultarPublicacion(id: number): Observable<{ mensaje: string }> {
    return this.http.patch<{ mensaje: string }>(`${this.url}/publicaciones/${id}/ocultar`, {});
  }

  eliminarPublicacion(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.url}/publicaciones/${id}`);
  }
}
