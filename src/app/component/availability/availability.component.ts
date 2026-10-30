import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { addDays, dateRangeError, localToday } from '../../core/models/date-rules';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { PublicacionBack } from '../../core/services/catalog.service';
import { DisponibilidadBackService, PeriodoBack } from '../../core/services/disponibilidad-back.service';
import { PublicacionesBackService } from '../../core/services/publicaciones-back.service';
import { ReservaRecibidaBack, ReservasBackService } from '../../core/services/reservas-back.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ selector: 'app-availability', imports: [FieldValidationDirective, FormsModule], templateUrl: './availability.component.html', styleUrl: './availability.component.css' })
export class AvailabilityComponent {
  readonly today = localToday();
  private readonly publicaciones = inject(PublicacionesBackService);
  private readonly reservasApi = inject(ReservasBackService);
  private readonly api = inject(DisponibilidadBackService);
  private readonly toast = inject(ToastService);

  readonly dateError = signal('');
  readonly listings = signal<PublicacionBack[]>([]);
  readonly selectedListing = signal('');
  readonly bloqueos = signal<PeriodoBack[]>([]);
  readonly reservas = signal<ReservaRecibidaBack[]>([]);
  readonly cargando = signal(true);
  readonly errorCarga = signal('');
  readonly procesando = signal(false);
  readonly monthOffset = signal(0);
  readonly showBlockModal = signal(false);
  blockStart = this.today;
  blockEnd = addDays(this.today, 1);
  readonly days = computed(() => {
    const month = this.currentMonth();
    const offset = (month.getDay() + 6) % 7;
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => { const day = index - offset + 1; return day > 0 && day <= count ? day : 0; });
  });

  constructor() {
    forkJoin({ mias: this.publicaciones.mias(), recibidas: this.reservasApi.recibidas() }).subscribe({
      next: ({ mias, recibidas }) => {
        this.listings.set(mias);
        this.reservas.set(recibidas);
        const primera = mias[0]?.id ?? '';
        this.selectedListing.set(primera);
        if (primera) { this.cargarBloqueos(primera); } else { this.cargando.set(false); }
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorCarga.set(this.mensajeDeError(error));
      }
    });
  }

  private cargarBloqueos(id: string): void {
    this.api.periodos(id).subscribe({
      next: (lista) => {
        if (id !== this.selectedListing()) { return; }
        this.bloqueos.set(lista.filter((periodo) => periodo.estado === 'BLOQUEADO'));
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorCarga.set(this.mensajeDeError(error));
      }
    });
  }

  elegir(id: string): void {
    this.selectedListing.set(id);
    this.bloqueos.set([]);
    this.cargarBloqueos(id);
  }

  private reservasActivas(): ReservaRecibidaBack[] {
    return this.reservas().filter((r) => r.publicacionId === this.selectedListing() && ['PENDIENTE', 'CONFIRMADA'].includes(r.estado));
  }

  currentMonth(): Date { const now = new Date(); return new Date(now.getFullYear(), now.getMonth() + this.monthOffset(), 1); }
  monthLabel(): string { return this.currentMonth().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }); }
  previousMonth(): void { this.monthOffset.update((value) => value - 1); }
  nextMonth(): void { this.monthOffset.update((value) => value + 1); }
  dayDate(day: number): string { const month = this.currentMonth(); return localToday(new Date(month.getFullYear(), month.getMonth(), day)); }

  dayState(day: number): string {
    if (!day) return 'outside';
    const date = this.dayDate(day);
    if (date < this.today) return 'past';
    if (this.bloqueos().some((p) => date >= p.fechaInicio && date < p.fechaFin)) return 'blocked';
    if (this.reservasActivas().some((r) => date >= r.fechaLlegada && date < r.fechaSalida)) return 'reserved';
    return 'available';
  }

  abrirBloqueo(): void {
    this.dateError.set('');
    this.showBlockModal.set(true);
  }

  selectDay(day: number): void {
    if (this.dayState(day) !== 'available') return;
    this.blockStart = this.dayDate(day);
    this.blockEnd = addDays(this.blockStart, 1);
    this.abrirBloqueo();
  }

  release(periodoId: string): void {
    const publicacionId = this.selectedListing();
    if (!publicacionId) return;
    this.api.liberar(publicacionId, periodoId).subscribe({
      next: () => {
        this.toast.show('Periodo disponible nuevamente.');
        this.cargarBloqueos(publicacionId);
      },
      error: (error: HttpErrorResponse) => this.toast.show(this.mensajeDeError(error), 'warning')
    });
  }

  private haySuperposicion(inicio: string, fin: string): boolean {
    const conBloqueo = this.bloqueos().some((p) => inicio < p.fechaFin && fin > p.fechaInicio);
    const conReserva = this.reservasActivas().some((r) => inicio < r.fechaSalida && fin > r.fechaLlegada);
    return conBloqueo || conReserva;
  }

  blockPeriod(): void {
    const id = this.selectedListing();
    if (!id) { this.dateError.set('Selecciona uno de tus alojamientos.'); return; }
    const error = dateRangeError(this.blockStart, this.blockEnd);
    if (error) { this.dateError.set(error); return; }
    if (this.haySuperposicion(this.blockStart, this.blockEnd)) { this.dateError.set('El periodo se superpone con una reserva o bloqueo.'); return; }
    if (this.procesando()) return;
    this.procesando.set(true);
    this.api.bloquear(id, this.blockStart, this.blockEnd).subscribe({
      next: () => {
        this.procesando.set(false);
        this.dateError.set('');
        this.showBlockModal.set(false);
        this.toast.show('El periodo fue bloqueado en la disponibilidad.', 'warning');
        this.cargarBloqueos(id);
      },
      error: (errorHttp: HttpErrorResponse) => {
        this.procesando.set(false);
        this.dateError.set(this.mensajeDeError(errorHttp));
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
