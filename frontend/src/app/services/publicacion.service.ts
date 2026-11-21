import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../core/api.config';
import { FiltrosPublicacion, Publicacion, PublicacionDatos } from '../models/publicacion.model';

// Servicio: centraliza las llamadas HTTP a /api/publicaciones.
// Los componentes no usan HttpClient directamente, usan este servicio.
// providedIn: 'root' = existe una sola instancia para toda la aplicación.
@Injectable({ providedIn: 'root' })
export class PublicacionService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/publicaciones`;

  // GET /api/publicaciones?estado=...&categoria=...
  listar(filtros: FiltrosPublicacion = {}): Observable<Publicacion[]> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== '') params = params.set(clave, String(valor));
    }
    return this.http.get<Publicacion[]>(this.url, { params });
  }

  // GET /api/publicaciones/:id
  obtener(id: number): Observable<Publicacion> {
    return this.http.get<Publicacion>(`${this.url}/${id}`);
  }

  // POST /api/publicaciones
  crear(datos: PublicacionDatos): Observable<Publicacion> {
    return this.http.post<Publicacion>(this.url, datos);
  }

  // PUT /api/publicaciones/:id
  actualizar(id: number, datos: Partial<PublicacionDatos>): Observable<Publicacion> {
    return this.http.put<Publicacion>(`${this.url}/${id}`, datos);
  }

  // DELETE /api/publicaciones/:id
  eliminar(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.url}/${id}`);
  }
}
