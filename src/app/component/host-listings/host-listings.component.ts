import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Listing } from '../../core/models/marketplace.models';
import { CatalogService } from '../../core/services/catalog.service';
import { PublicacionesBackService } from '../../core/services/publicaciones-back.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ selector: 'app-host-listings', imports: [CurrencyPipe, RouterLink], templateUrl: './host-listings.component.html', styleUrl: './host-listings.component.css' })
export class HostListingsComponent {
  private readonly api = inject(PublicacionesBackService);
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService);

  readonly items = signal<Listing[]>([]);
  readonly cargando = signal(true);
  readonly errorCarga = signal('');
  readonly statusTarget = signal<Listing | null>(null);

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.api.mias().subscribe({
      next: (lista) => {
        this.items.set(lista.map((publicacion) => this.catalog.desdeBack(publicacion)));
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorCarga.set(this.mensajeDeError(error));
      }
    });
  }

  changeStatus(status: 'ACTIVA' | 'PAUSADA'): void {
    const listing = this.statusTarget();
    if (!listing?.uuid) return;
    const peticion = status === 'ACTIVA' ? this.api.activar(listing.uuid) : this.api.pausar(listing.uuid);
    peticion.subscribe({
      next: () => {
        this.statusTarget.set(null);
        this.toast.show(`La publicación ahora está ${status === 'ACTIVA' ? 'activa' : 'pausada'}.`);
        this.cargar();
      },
      error: (error: HttpErrorResponse) => {
        this.statusTarget.set(null);
        this.toast.show(this.mensajeDeError(error), 'warning');
      }
    });
  }

  private mensajeDeError(error: HttpErrorResponse): string {
    if (error.status === 0) { return 'No se pudo conectar con el servidor. Revisa que el back esté corriendo.'; }
    if (error.status === 400 && typeof error.error === 'string' && error.error !== '') { return error.error; }
    if (error.status === 401 || error.status === 403) { return 'Tu sesión venció o no tienes permiso. Vuelve a iniciar sesión.'; }
    return 'No se pudo completar la operación. Intenta de nuevo.';
  }
}
