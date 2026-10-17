import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';

export interface ConversacionBack {
  publicacionId: string;
  huespedId: string;
  ultimoMensaje: string;
  fechaUltimoMensaje: string | null;
  tituloPublicacion: string;
  huespedNombre: string;
  anfitrionNombre: string;
}

export interface MensajeBack {
  id: string;
  creadoEn: string | null;
  publicacionId: string;
  huespedId: string;
  emisorId: string;
  contenido: string;
  leido: boolean;
}

@Injectable({ providedIn: 'root' })
export class MensajesBackService {
  private readonly http = inject(HttpClient);

  conversaciones(): Observable<ConversacionBack[]> {
    return this.http.get<ConversacionBack[]>(`${API_URL}/api/mensajes/mias`);
  }

  conversacion(publicacionId: string, huespedId: string): Observable<MensajeBack[]> {
    return this.http.get<MensajeBack[]>(`${API_URL}/api/publicaciones/${publicacionId}/mensajes/${huespedId}`);
  }

  enviar(publicacionId: string, contenido: string, huespedId?: string): Observable<MensajeBack> {
    const cuerpo = huespedId ? { contenido, huespedId } : { contenido };
    return this.http.post<MensajeBack>(`${API_URL}/api/publicaciones/${publicacionId}/mensajes`, cuerpo);
  }
}
