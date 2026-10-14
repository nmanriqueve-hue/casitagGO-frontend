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

export interface UsuarioAdminBack {
  id: string;
  creadoEn: string | null;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
  mfaHabilitado: boolean;
  restringido: boolean;
}

export interface RestriccionBack {
  id: string;
  creadoEn: string | null;
  usuarioId: string;
  motivo: string;
  creadoPorId: string;
  activa: boolean;
}

export interface PublicacionAdminBack {
  id: string;
  titulo: string;
  ciudad: string;
  tipo: string;
  estado: string;
  precioNoche: number;
  anfitrionId: string;
  anfitrionNombre: string;
  anfitrionCorreo: string;
  creadoEn: string | null;
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

  usuarios(): Observable<UsuarioAdminBack[]> {
    return this.http.get<UsuarioAdminBack[]>(`${API_URL}/api/admin/usuarios`);
  }

  restringirUsuario(id: string, motivo: string): Observable<RestriccionBack> {
    return this.http.post<RestriccionBack>(`${API_URL}/api/admin/usuarios/${id}/restringir`, { motivo });
  }

  levantarRestriccion(id: string): Observable<RestriccionBack> {
    return this.http.patch<RestriccionBack>(`${API_URL}/api/admin/usuarios/${id}/levantar-restriccion`, {});
  }

  publicaciones(): Observable<PublicacionAdminBack[]> {
    return this.http.get<PublicacionAdminBack[]>(`${API_URL}/api/admin/publicaciones`);
  }

  bloquearPublicacion(id: string, motivo: string): Observable<unknown> {
    return this.http.patch(`${API_URL}/api/publicaciones/${id}/bloquear`, { motivo });
  }
}
