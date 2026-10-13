import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';

export interface DemandaCiudadBack {
  ciudad: string;
  reservas: number;
}

export interface DashboardBack {
  totalUsuarios: number;
  usuariosHuespedes: number;
  usuariosAnfitriones: number;
  usuariosAdministradores: number;
  publicacionesActivas: number;
  reservasPorEstado: Record<string, number>;
  ingresosEstimados: number;
  ciudadesConMayorDemanda: DemandaCiudadBack[];
}

export interface EventoAuditoriaBack {
  id: string;
  creadoEn: string | null;
  usuarioId: string | null;
  entidad: string;
  accion: string;
  resultado: string;
  detalle: Record<string, unknown> | null;
}

@Injectable({ providedIn: 'root' })
export class AdminBackService {
  private readonly http = inject(HttpClient);

  dashboard(): Observable<DashboardBack> {
    return this.http.get<DashboardBack>(`${API_URL}/api/admin/dashboard`);
  }

  auditoria(): Observable<EventoAuditoriaBack[]> {
    return this.http.get<EventoAuditoriaBack[]>(`${API_URL}/api/admin/auditoria`);
  }

  exportarAuditoriaCsv(): Observable<Blob> {
    return this.http.get(`${API_URL}/api/admin/auditoria/exportar`, { responseType: 'blob' });
  }

  reporteGestion(): Observable<Blob> {
    return this.http.get(`${API_URL}/api/admin/reportes/gestion`, { responseType: 'blob' });
  }
}
