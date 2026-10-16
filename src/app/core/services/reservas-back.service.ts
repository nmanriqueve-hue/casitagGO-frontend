import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';

export interface CotizacionBack {
  id: string;
  creadoEn: string | null;
  publicacionId: string;
  noches: number;
  precioBase: number;
  tarifaLimpieza: number;
  tarifaServicio: number;
  serviciosAdicionales: number;
  total: number;
}

export interface ReservaBack {
  id: string;
  creadoEn: string | null;
  publicacionId: string;
  fechaLlegada: string;
  fechaSalida: string;
  estado: string;
  total: number;
}

export interface ReservaRecibidaBack extends ReservaBack {
  tituloPublicacion: string;
  huespedNombre: string;
}

export interface PagoBack {
  estado?: string;
}

export interface CancelacionBack {
  id: string;
  creadoEn: string | null;
  reservaId: string;
  motivo: string;
  valorDevolucion: number;
  estadoFinal: string;
}

export interface ResenaCreadaBack {
  id: string;
  creadoEn: string | null;
  reservaId: string;
  publicacionId: string;
  huespedNombre: string;
  calificacion: number;
  comentario: string | null;
}

@Injectable({ providedIn: 'root' })
export class ReservasBackService {
  private readonly http = inject(HttpClient);

  cotizar(publicacionId: string, fechaLlegada: string, fechaSalida: string, serviciosAdicionales: number): Observable<CotizacionBack> {
    return this.http.post<CotizacionBack>(`${API_URL}/api/reservas/cotizacion`, { publicacionId, fechaLlegada, fechaSalida, serviciosAdicionales });
  }

  crearReserva(cotizacionId: string, fechaLlegada: string, fechaSalida: string): Observable<ReservaBack> {
    return this.http.post<ReservaBack>(`${API_URL}/api/reservas`, { cotizacionId, fechaLlegada, fechaSalida });
  }

  pagar(reservaId: string, metodoPago: string): Observable<PagoBack> {
    return this.http.post<PagoBack>(`${API_URL}/api/reservas/${reservaId}/pagar`, { metodoPago });
  }

  misReservas(): Observable<ReservaBack[]> {
    return this.http.get<ReservaBack[]>(`${API_URL}/api/reservas/mias`);
  }

  recibidas(): Observable<ReservaRecibidaBack[]> {
    return this.http.get<ReservaRecibidaBack[]>(`${API_URL}/api/reservas/recibidas`);
  }

  cancelar(reservaId: string, motivo: string): Observable<CancelacionBack> {
    return this.http.patch<CancelacionBack>(`${API_URL}/api/reservas/${reservaId}/cancelar`, { motivo });
  }

  crearResena(reservaId: string, calificacion: number, comentario: string): Observable<ResenaCreadaBack> {
    return this.http.post<ResenaCreadaBack>(`${API_URL}/api/reservas/${reservaId}/resena`, { calificacion, comentario });
  }
}
