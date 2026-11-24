import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../core/api.config';
import { Entrega, EstadoEntrega } from '../models/entrega.model';

// Servicio para consumir /api/entregas (el token lo agrega el interceptor)
@Injectable({ providedIn: 'root' })
export class EntregaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/entregas`;

  // GET /api/entregas?estado=...
  listar(estado: EstadoEntrega | '' = ''): Observable<Entrega[]> {
    const params = estado ? new HttpParams().set('estado', estado) : undefined;
    return this.http.get<Entrega[]>(this.url, { params });
  }

  // PATCH /api/entregas/:id/confirmar
  confirmar(id: number): Observable<Entrega> {
    return this.http.patch<Entrega>(`${this.url}/${id}/confirmar`, {});
  }
}
