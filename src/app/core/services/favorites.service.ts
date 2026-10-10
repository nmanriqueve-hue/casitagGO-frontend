import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { API_URL } from '../config/api.config';
import { Listing } from '../models/marketplace.models';
import { CatalogService, PublicacionBack } from './catalog.service';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly session = inject(SessionService);
  private readonly http = inject(HttpClient);
  private readonly catalog = inject(CatalogService);
  private readonly saved = signal<Record<number, number[]>>({});

  // Favoritos reales (vienen del back).
  readonly reales = signal<Listing[]>([]);
  // UUIDs marcados: se actualiza al instante al pulsar el botón.
  private readonly marcados = signal<string[]>([]);
  readonly cargando = signal(false);
  readonly errorCarga = signal('');

  constructor() {
    effect(() => {
      const usuario = this.session.currentUser();
      const esHuesped = this.session.role() === 'guest';
      if (usuario && esHuesped) {
        untracked(() => this.cargar());
      } else {
        untracked(() => {
          this.reales.set([]);
          this.marcados.set([]);
        });
      }
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http.get<PublicacionBack[]>(`${API_URL}/api/favoritos`).subscribe({
      next: (lista) => {
        const items = lista.map((publicacion) => this.catalog.desdeBack(publicacion));
        this.reales.set(items);
        this.marcados.set(items.map((item) => item.uuid ?? ''));
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.reales.set([]);
        this.marcados.set([]);
        this.cargando.set(false);
        this.errorCarga.set(this.mensajeDeError(error));
      }
    });
  }

  hasUuid(uuid: string): boolean {
    return this.marcados().includes(uuid);
  }

  alternarUuid(uuid: string, alFallar: (mensaje: string) => void): void {
    const yaEsta = this.hasUuid(uuid);
    // Cambio inmediato en pantalla.
    this.marcados.update((lista) => yaEsta ? lista.filter((item) => item !== uuid) : [...lista, uuid]);
    if (yaEsta) {
      this.reales.update((lista) => lista.filter((item) => item.uuid !== uuid));
    }
    const peticion = yaEsta
      ? this.http.delete(`${API_URL}/api/publicaciones/${uuid}/favoritos`, { responseType: 'text' })
      : this.http.post(`${API_URL}/api/publicaciones/${uuid}/favoritos`, null, { responseType: 'text' });
    peticion.subscribe({
      next: () => this.cargar(),
      error: (error: HttpErrorResponse) => {
        // Si el back falla, se vuelve al estado real.
        this.cargar();
        alFallar(this.mensajeDeError(error));
      }
    });
  }

  private mensajeDeError(error: HttpErrorResponse): string {
    return typeof error.error === 'string' && error.error ? error.error : 'No se pudo completar la acción con favoritos.';
  }

  // ---- Datos de mentira (alojamientos viejos con id numérico) ----
  ids(): number[] { return this.saved()[this.session.currentUser()?.id ?? -1] ?? []; }
  has(id: number): boolean { return this.ids().includes(id); }
  toggle(id: number): void {
    const user = this.session.currentUser();
    if (!user) return;
    this.saved.update((all) => ({ ...all, [user.id]: this.has(id) ? this.ids().filter((item) => item !== id) : [...this.ids(), id] }));
  }
}
