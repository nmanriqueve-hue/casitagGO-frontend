import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { addDays, dateRangeError, localToday } from '../../core/models/date-rules';
import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Listing } from '../../core/models/marketplace.models';
import { CatalogService } from '../../core/services/catalog.service';
import { CotizacionBack, ReservasBackService } from '../../core/services/reservas-back.service';
import { SessionService } from '../../core/services/session.service';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TARJETA_APROBADA = 'pm_card_visa';

@Component({ selector: 'app-checkout', imports: [FieldValidationDirective, ReactiveFormsModule, CurrencyPipe, RouterLink], templateUrl: './checkout.component.html', styleUrl: './checkout.component.css' })
export class CheckoutComponent {
  readonly today = localToday();
  readonly tomorrow = addDays(this.today, 1);

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogService);
  private readonly session = inject(SessionService);
  private readonly reservas = inject(ReservasBackService);

  readonly listing = signal<Listing | undefined>(undefined);
  readonly cotizacion = signal<CotizacionBack | null>(null);
  readonly confirmed = signal<{ codigo: string } | null>(null);
  readonly procesando = signal(false);
  readonly error = signal('');

  readonly bookingData = {
    checkIn: this.route.snapshot.queryParamMap.get('checkIn') || this.today,
    checkOut: this.route.snapshot.queryParamMap.get('checkOut') || this.tomorrow,
    guests: this.route.snapshot.queryParamMap.has('guests') ? Number(this.route.snapshot.queryParamMap.get('guests')) : 1,
    extras: this.route.snapshot.queryParamMap.get('extras') === 'true' ? 45000 : 0
  };

  readonly paymentForm = this.fb.group({ tarjeta: [TARJETA_APROBADA, Validators.required], accept: [false, Validators.requiredTrue] });

  // Si el pago falla, la reserva queda PENDIENTE y se reutiliza al reintentar.
  private reservaId: string | null = null;

  constructor() {
    const uuid = this.route.snapshot.paramMap.get('id') ?? '';
    if (!UUID_REGEX.test(uuid)) {
      this.router.navigate(['/buscar']);
      return;
    }
    this.catalog.obtenerDetalle(uuid).subscribe({
      next: (item) => {
        const user = this.session.currentUser();
        const puedeReservar = item.status === 'ACTIVA' && item.hostUuid !== user?.uuid && ['guest', 'host'].includes(this.session.role() ?? '');
        if (!puedeReservar) {
          this.router.navigate(['/buscar']);
          return;
        }
        this.listing.set(item);
        this.cotizar(item);
      },
      error: () => this.router.navigate(['/buscar'])
    });
  }

  private cotizar(item: Listing): void {
    const errorFechas = dateRangeError(this.bookingData.checkIn, this.bookingData.checkOut);
    if (errorFechas) { this.error.set(errorFechas); return; }
    if (
  !Number.isInteger(this.bookingData.guests) ||
  this.bookingData.guests < 1 ||
  this.bookingData.guests > item.capacity
) {
  this.error.set('El número de huéspedes supera la capacidad o no es válido.');
  return;
}
    this.reservas.cotizar(item.uuid ?? '', this.bookingData.checkIn, this.bookingData.checkOut, this.bookingData.extras).subscribe({
      next: (cotizacion) => this.cotizacion.set(cotizacion),
      error: (error: HttpErrorResponse) => this.error.set(this.mensajeDeError(error))
    });
  }

  confirm(): void {
    const cotizacion = this.cotizacion();
    if (!this.listing() || !cotizacion || this.confirmed() || this.procesando()) return;
    if (this.paymentForm.invalid) { this.paymentForm.markAllAsTouched(); return; }
    this.error.set('');
    this.procesando.set(true);
    if (this.reservaId) {
      this.pagar(this.reservaId);
      return;
    }
    this.reservas.crearReserva(cotizacion.id, this.bookingData.checkIn, this.bookingData.checkOut).subscribe({
      next: (reserva) => {
        this.reservaId = reserva.id;
        this.pagar(reserva.id);
      },
      error: (error: HttpErrorResponse) => {
        this.procesando.set(false);
        this.error.set(this.mensajeDeError(error));
      }
    });
  }

  private pagar(reservaId: string): void {
    const metodo = this.paymentForm.getRawValue().tarjeta ?? TARJETA_APROBADA;
    this.reservas.pagar(reservaId, metodo).subscribe({
      next: () => {
        this.procesando.set(false);
        this.confirmed.set({ codigo: `LR-${reservaId.slice(0, 8).toUpperCase()}` });
      },
      error: (error: HttpErrorResponse) => {
        this.procesando.set(false);
        this.error.set(`${this.mensajeDeError(error)} Tu reserva quedó pendiente: puedes reintentar con otra tarjeta.`);
      }
    });
  }

  private mensajeDeError(error: HttpErrorResponse): string {
    if (error.status === 0) { return 'No se pudo conectar con el servidor. Revisa que el back esté corriendo.'; }
    if (error.status === 400 && typeof error.error === 'string' && error.error !== '') { return error.error; }
    if (error.status === 401 || error.status === 403) { return 'Revisa los datos de la reserva o vuelve a iniciar sesión.'; }
    return 'No se pudo completar la operación. Intenta de nuevo.';
  }

  finish(): void {
    this.router.navigate(['/mis-reservas']);
  }
}
