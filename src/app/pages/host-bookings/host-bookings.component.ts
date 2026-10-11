import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { localToday } from '../../core/models/date-rules';
import { ReservaRecibidaBack, ReservasBackService } from '../../core/services/reservas-back.service';

@Component({ selector: 'app-host-bookings', imports: [CurrencyPipe, DatePipe], templateUrl: './host-bookings.component.html', styleUrl: './host-bookings.component.css' })
export class HostBookingsComponent {
  private readonly api = inject(ReservasBackService);

  readonly filtros = ['TODAS', 'PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA'];
  readonly filter = signal('TODAS');
  readonly items = signal<ReservaRecibidaBack[]>([]);
  readonly cargando = signal(true);
  readonly errorCarga = signal('');
  readonly visible = computed(() => this.items().filter((reserva) => this.filter() === 'TODAS' || this.estadoMostrado(reserva) === this.filter()));

  constructor() {
    this.api.recibidas().subscribe({
      next: (lista) => {
        this.items.set(lista);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorCarga.set(this.mensajeDeError(error));
      }
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
    return 'No se pudieron cargar las reservas. Intenta de nuevo.';
  }
}
