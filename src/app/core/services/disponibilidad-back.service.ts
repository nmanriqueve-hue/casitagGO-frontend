import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';

export interface PeriodoBack {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
}

export interface DisponibilidadBack {
  publicacionId: string;
  desde: string;
  hasta: string;
  disponible: boolean;
  motivo?: string | null;
}

@Injectable({ providedIn: 'root' })
export class DisponibilidadBackService {
  private readonly http = inject(HttpClient);

  periodos(publicacionId: string): Observable<PeriodoBack[]> {
    return this.http.get<PeriodoBack[]>(`${API_URL}/api/publicaciones/${publicacionId}/periodos`);
  }

  bloquear(publicacionId: string, fechaInicio: string, fechaFin: string): Observable<PeriodoBack> {
    return this.http.post<PeriodoBack>(`${API_URL}/api/publicaciones/${publicacionId}/bloqueos`, { fechaInicio, fechaFin });
  }

  liberar(publicacionId: string, periodoId: string): Observable<string> {
    return this.http.delete(`${API_URL}/api/publicaciones/${publicacionId}/bloqueos/${periodoId}`, { responseType: 'text' });
  }

  consultar(publicacionId: string, desde: string, hasta: string): Observable<DisponibilidadBack> {
    return this.http.get<DisponibilidadBack>(`${API_URL}/api/publicaciones/${publicacionId}/disponibilidad`, { params: { desde, hasta } });
  }
}
