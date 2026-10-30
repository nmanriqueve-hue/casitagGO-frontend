import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { localToday } from '../../core/models/date-rules';
import { CatalogService, PublicacionBack, ResenasPublicacionBack } from '../../core/services/catalog.service';
import { PublicacionesBackService } from '../../core/services/publicaciones-back.service';
import { ReservaRecibidaBack, ReservasBackService } from '../../core/services/reservas-back.service';
import { SessionService } from '../../core/services/session.service';

@Component({ selector: 'app-host-dashboard', imports: [RouterLink, CurrencyPipe, DatePipe], templateUrl: './host-dashboard.component.html', styleUrl: './host-dashboard.component.css' })
export class HostDashboardComponent {
  readonly session = inject(SessionService);
  private readonly catalog = inject(CatalogService);
  private readonly publicaciones = inject(PublicacionesBackService);
  private readonly reservasApi = inject(ReservasBackService);

  readonly listings = signal<PublicacionBack[]>([]);
  readonly bookings = signal<ReservaRecibidaBack[]>([]);
  readonly resenasTotal = signal(0);
  readonly rating = signal(0);
  readonly cargando = signal(true);
  readonly errorCarga = signal('');

  readonly activas = computed(() => this.listings().filter((item) => item.estado === 'ACTIVA').length);
  readonly proximas = computed(() => this.bookings().filter((item) => item.estado === 'CONFIRMADA' && item.fechaSalida > localToday()).length);
  readonly income = computed(() => this.bookings().filter((item) => item.estado === 'CONFIRMADA').reduce((suma, item) => suma + item.total, 0));
  readonly recientes = computed(() => this.bookings().slice(0, 5));

  constructor() {
    forkJoin({ mias: this.publicaciones.mias(), recibidas: this.reservasApi.recibidas() }).subscribe({
      next: ({ mias, recibidas }) => {
        this.listings.set(mias);
        this.bookings.set(recibidas);
        this.cargando.set(false);
        this.cargarCalificaciones(mias);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorCarga.set(this.mensajeDeError(error));
      }
    });
  }

  private cargarCalificaciones(mias: PublicacionBack[]): void {
    if (mias.length === 0) return;
    const vacio: ResenasPublicacionBack = { promedio: 0, total: 0, resenas: [] };
    forkJoin(mias.map((item) => this.catalog.obtenerResenas(item.id).pipe(catchError(() => of(vacio))))).subscribe((lista) => {
      const total = lista.reduce((suma, item) => suma + item.total, 0);
      const ponderado = lista.reduce((suma, item) => suma + item.promedio * item.total, 0);
      this.resenasTotal.set(total);
      this.rating.set(total > 0 ? Math.round(ponderado / total * 10) / 10 : 0);
    });
  }

  codigo(reserva: ReservaRecibidaBack): string {
    return `LR-${reserva.id.slice(0, 8).toUpperCase()}`;
  }

  estadoMostrado(reserva: ReservaRecibidaBack): string {
    return reserva.estado === 'CONFIRMADA' && reserva.fechaSalida <= localToday() ? 'COMPLETADA' : reserva.estado;
  }

  private mensajeDeError(error: HttpErrorResponse): string {
    if (error.status === 0) { return 'No se pudo conectar con el servidor. Revisa que el back esté corriendo.'; }
    if (error.status === 400 && typeof error.error === 'string' && error.error !== '') { return error.error; }
    if (error.status === 401 || error.status === 403) { return 'Tu sesión venció o no tienes permiso. Vuelve a iniciar sesión.'; }
    return 'No se pudo cargar el panel. Intenta de nuevo.';
  }
}
