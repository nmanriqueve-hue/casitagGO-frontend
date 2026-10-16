import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { localToday } from '../../core/models/date-rules';
import { Listing } from '../../core/models/marketplace.models';
import { CatalogService } from '../../core/services/catalog.service';
import { ReservaBack, ReservasBackService } from '../../core/services/reservas-back.service';
import { ToastService } from '../../core/services/toast.service';

interface ReservaVista {
  id: string;
  codigo: string;
  estado: string;
  fechaLlegada: string;
  fechaSalida: string;
  total: number;
  publicacion: Listing | null;
}

@Component({ selector: 'app-guest-bookings', imports: [FieldValidationDirective, CurrencyPipe, DatePipe, FormsModule, RouterLink], templateUrl: './guest-bookings.component.html', styleUrl: './guest-bookings.component.css' })
export class GuestBookingsComponent {
  private readonly reservas = inject(ReservasBackService);
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService);

  readonly today = localToday();
  readonly estrellas = [1, 2, 3, 4, 5];
  readonly tab = signal<'upcoming' | 'history'>('upcoming');
  readonly items = signal<ReservaVista[]>([]);
  readonly cargando = signal(true);
  readonly errorCarga = signal('');
  readonly procesando = signal(false);
  readonly cancelTarget = signal<ReservaVista | null>(null);
  readonly reviewTarget = signal<ReservaVista | null>(null);
  readonly calificacion = signal(5);
  readonly resenadas = signal<string[]>([]);
  cancelReason = '';
  reviewComment = '';

  readonly visible = computed(() => this.items().filter((item) => this.esProxima(item) === (this.tab() === 'upcoming')));

  constructor() {
    this.cargar();
  }

  private esProxima(item: ReservaVista): boolean {
    return ['PENDIENTE', 'CONFIRMADA'].includes(item.estado) && item.fechaSalida > localToday();
  }

  estadoMostrado(item: ReservaVista): string {
    return item.estado === 'CONFIRMADA' && item.fechaSalida <= localToday() ? 'COMPLETADA' : item.estado;
  }

  puedeResenar(item: ReservaVista): boolean {
    return this.estadoMostrado(item) === 'COMPLETADA' && !this.resenadas().includes(item.id);
  }

  yaResenada(item: ReservaVista): boolean {
    return this.estadoMostrado(item) === 'COMPLETADA' && this.resenadas().includes(item.id);
  }

  reembolsoEstimado(item: ReservaVista): number {
    const llegada = new Date(`${item.fechaLlegada}T12:00:00`).getTime();
    const hoy = new Date(`${localToday()}T12:00:00`).getTime();
    const dias = Math.round((llegada - hoy) / 86400000);
    return dias >= 3 ? item.total : 0;
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.reservas.misReservas().subscribe({
      next: (lista) => {
        this.items.set(lista.map((r) => ({
          id: r.id,
          codigo: `LR-${r.id.slice(0, 8).toUpperCase()}`,
          estado: r.estado,
          fechaLlegada: r.fechaLlegada,
          fechaSalida: r.fechaSalida,
          total: r.total,
          publicacion: null
        })));
        this.cargando.set(false);
        for (const reserva of lista) {
          this.catalog.obtenerDetalle(reserva.publicacionId).subscribe({
            next: (publicacion) => this.items.update((actual) => actual.map((item) => item.id === reserva.id ? { ...item, publicacion } : item))
          });
        }
        this.marcarResenadas(lista);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorCarga.set(this.mensajeDeError(error));
      }
    });
  }

  private marcarResenadas(lista: ReservaBack[]): void {
    const terminadas = lista.filter((r) => ['CONFIRMADA', 'COMPLETADA'].includes(r.estado) && r.fechaSalida <= localToday());
    const publicaciones = [...new Set(terminadas.map((r) => r.publicacionId))];
    for (const publicacionId of publicaciones) {
      this.catalog.obtenerResenas(publicacionId).subscribe({
        error: () => undefined,
        next: (respuesta) => {
          const ids = respuesta.resenas.map((resena) => resena.reservaId);
          this.resenadas.update((actual) => [...new Set([...actual, ...ids])]);
        }
      });
    }
  }

  confirmCancel(): void {
    const reserva = this.cancelTarget();
    if (!reserva || !this.cancelReason.trim() || this.procesando()) return;
    this.procesando.set(true);
    this.reservas.cancelar(reserva.id, this.cancelReason.trim()).subscribe({
      next: (cancelacion) => {
        this.procesando.set(false);
        this.cancelTarget.set(null);
        this.cancelReason = '';
        const devolucion = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(cancelacion.valorDevolucion);
        this.toast.show(`La reserva fue cancelada. Devolución: ${devolucion}.`, 'warning');
        this.cargar();
      },
      error: (error: HttpErrorResponse) => {
        this.procesando.set(false);
        this.toast.show(this.mensajeDeError(error), 'warning');
      }
    });
  }

  abrirResena(item: ReservaVista): void {
    this.calificacion.set(5);
    this.reviewComment = '';
    this.reviewTarget.set(item);
  }

  cerrarResena(): void {
    this.reviewTarget.set(null);
    this.reviewComment = '';
  }

  enviarResena(): void {
    const reserva = this.reviewTarget();
    if (!reserva || this.procesando()) return;
    this.procesando.set(true);
    this.reservas.crearResena(reserva.id, this.calificacion(), this.reviewComment.trim()).subscribe({
      next: () => {
        this.procesando.set(false);
        this.resenadas.update((actual) => [...actual, reserva.id]);
        this.cerrarResena();
        this.toast.show('Gracias, tu reseña fue publicada.');
      },
      error: (error: HttpErrorResponse) => {
        this.procesando.set(false);
        this.toast.show(this.mensajeDeError(error), 'warning');
      }
    });
  }

  private mensajeDeError(error: HttpErrorResponse): string {
    if (error.status === 0) { return 'No se pudo conectar con el servidor. Revisa que el back esté corriendo.'; }
    if (error.status === 400 && typeof error.error === 'string' && error.error !== '') { return error.error; }
    if (error.status === 401 || error.status === 403) { return 'Tu sesión venció o los datos no son válidos. Vuelve a iniciar sesión.'; }
    return 'No se pudo completar la operación. Intenta de nuevo.';
  }
}
