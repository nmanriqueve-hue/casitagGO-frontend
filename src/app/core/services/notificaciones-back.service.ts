import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { forkJoin } from 'rxjs';
import { API_URL } from '../config/api.config';
import { SessionService } from './session.service';

export interface NotificacionBack {
  id: string;
  creadoEn: string | null;
  tipoEvento: string;
  mensaje: string;
  leida: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificacionesBackService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);

  readonly lista = signal<NotificacionBack[]>([]);
  readonly cargando = signal(false);
  readonly errorCarga = signal('');
  readonly noLeidas = computed(() => this.lista().filter((n) => !n.leida).length);

  constructor() {
    effect(() => {
      const usuario = this.session.currentUser();
      if (usuario) {
        untracked(() => this.cargar());
      } else {
        untracked(() => this.lista.set([]));
      }
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http.get<NotificacionBack[]>(`${API_URL}/api/notificaciones/mias`).subscribe({
      next: (datos) => {
        this.lista.set([...datos].sort((a, b) => (b.creadoEn ?? '').localeCompare(a.creadoEn ?? '')));
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorCarga.set(typeof error.error === 'string' && error.error ? error.error : 'No se pudieron cargar las notificaciones.');
      }
    });
  }

  marcar(id: string): void {
    const actual = this.lista().find((n) => n.id === id);
    if (!actual || actual.leida) return;
    this.lista.update((items) => items.map((n) => n.id === id ? { ...n, leida: true } : n));
    this.http.patch(`${API_URL}/api/notificaciones/${id}/leida`, null).subscribe({
      error: () => this.cargar()
    });
  }

  marcarTodas(): void {
    const pendientes = this.lista().filter((n) => !n.leida);
    if (pendientes.length === 0) return;
    this.lista.update((items) => items.map((n) => ({ ...n, leida: true })));
    forkJoin(pendientes.map((n) => this.http.patch(`${API_URL}/api/notificaciones/${n.id}/leida`, null))).subscribe({
      error: () => this.cargar()
    });
  }
}
