import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../core/api.config';
import { EstadoSolicitud, NuevaSolicitud, Solicitud } from '../models/solicitud.model';

// Servicio para consumir /api/solicitudes
@Injectable({ providedIn: 'root' })
export class SolicitudService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/solicitudes`;

  // GET /api/solicitudes?solicitanteId=...&estado=...
  listar(filtros: { solicitanteId?: number; publicacionId?: number; estado?: EstadoSolicitud | '' } = {}): Observable<Solicitud[]> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== '') params = params.set(clave, String(valor));
    }
    return this.http.get<Solicitud[]>(this.url, { params });
  }

  // POST /api/solicitudes
  crear(datos: NuevaSolicitud): Observable<Solicitud> {
    return this.http.post<Solicitud>(this.url, datos);
  }

  resolver(id: number, accion: 'aceptar' | 'rechazar'): Observable<Solicitud> {
    return this.http.patch<Solicitud>(`${this.url}/${id}/${accion}`, {});
  }

  // PATCH /api/solicitudes/:id/cancelar
  cancelar(id: number, solicitanteId: number): Observable<Solicitud> {
    return this.http.patch<Solicitud>(`${this.url}/${id}/cancelar`, { solicitanteId });
  }
}
