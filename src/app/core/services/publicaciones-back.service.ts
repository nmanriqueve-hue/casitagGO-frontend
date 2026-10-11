import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { PublicacionBack } from './catalog.service';

export interface PublicacionDatos {
  titulo: string;
  descripcion: string;
  ubicacionTextual: string;
  ciudad: string;
  tipo: string;
  capacidad: number;
  precioNoche: number;
  servicios: string[];
  reglas: string[];
}

@Injectable({ providedIn: 'root' })
export class PublicacionesBackService {
  private readonly http = inject(HttpClient);

  mias(): Observable<PublicacionBack[]> {
    return this.http.get<PublicacionBack[]>(`${API_URL}/api/publicaciones/mias`);
  }

  crear(datos: PublicacionDatos): Observable<PublicacionBack> {
    return this.http.post<PublicacionBack>(`${API_URL}/api/publicaciones`, datos);
  }

  editar(id: string, datos: PublicacionDatos): Observable<PublicacionBack> {
    return this.http.put<PublicacionBack>(`${API_URL}/api/publicaciones/${id}`, datos);
  }

  activar(id: string): Observable<PublicacionBack> {
    return this.http.patch<PublicacionBack>(`${API_URL}/api/publicaciones/${id}/activar`, null);
  }

  pausar(id: string): Observable<PublicacionBack> {
    return this.http.patch<PublicacionBack>(`${API_URL}/api/publicaciones/${id}/pausar`, null);
  }

  subirImagen(id: string, archivo: File): Observable<PublicacionBack> {
    const datos = new FormData();
    datos.append('archivo', archivo);
    return this.http.post<PublicacionBack>(`${API_URL}/api/publicaciones/${id}/imagenes`, datos);
  }
}
