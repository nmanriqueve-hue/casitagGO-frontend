import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { addDays, dateRangeError, localToday } from '../../core/models/date-rules';
import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Booking } from '../../core/models/marketplace.models';
import { BookingService } from '../../core/services/booking.service';
import { CatalogService } from '../../core/services/catalog.service';
import { IntegrationService } from '../../core/services/integration.service';
import { SessionService } from '../../core/services/session.service';

@Component({ selector: 'app-checkout', imports: [FieldValidationDirective, ReactiveFormsModule, CurrencyPipe, RouterLink], templateUrl: './checkout.component.html', styleUrl: './checkout.component.css' })
export class CheckoutComponent {
  readonly today = localToday();
  readonly tomorrow = addDays(this.today, 1);
  dateError = '';

  private readonly fb = inject(FormBuilder);
  readonly listing;
  readonly confirmed = signal<Booking | null>(null);
  readonly bookingData;
  readonly paymentForm = this.fb.group({ holder: ['', Validators.required], card: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]], expiry: ['', [Validators.required, Validators.pattern(/^\d{2}\/\d{2}$/)]], cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]], accept: [false, Validators.requiredTrue] });

  constructor(
    route: ActivatedRoute,
    private readonly catalog: CatalogService,
    private readonly bookings: BookingService,
    private readonly session: SessionService,
    readonly integrations: IntegrationService,
    private readonly router: Router
  ) {
    const item = this.catalog.getById(Number(route.snapshot.paramMap.get('id')));
    this.listing = item && item.hostId !== session.currentUser()?.id && ['guest', 'host'].includes(session.role() ?? '') && item.status === 'ACTIVA' ? item : undefined;
    if (!this.listing) this.router.navigate(['/buscar']);
    const params = route.snapshot.queryParamMap;
    this.bookingData = { checkIn: params.get('checkIn') || this.today, checkOut: params.get('checkOut') || this.tomorrow, guests: params.has('guests') ? Number(params.get('guests')) : 1, extras: params.get('extras') === 'true' ? 45000 : 0 };
  }

  quote() {
    if (dateRangeError(this.bookingData.checkIn, this.bookingData.checkOut)) return null;
    return this.listing ? this.bookings.quote(this.listing, this.bookingData.checkIn, this.bookingData.checkOut, this.bookingData.extras) : null;
  }

  confirm(): void {
    if (!this.listing || this.confirmed()) return;
    this.dateError = this.bookings.validation(this.listing, this.bookingData.checkIn, this.bookingData.checkOut, this.bookingData.guests);
    if (this.dateError) return;
    if (this.paymentForm.invalid) return this.paymentForm.markAllAsTouched();
    const quote = this.quote();
    if (!quote) return;
    try {
    const booking = this.bookings.create(this.listing, this.session.currentUser()?.id ?? 1, this.bookingData.checkIn, this.bookingData.checkOut, this.bookingData.guests, quote);
    this.confirmed.set(booking);
    } catch (e) { this.dateError = (e as Error).message; }
  }

  finish(): void {
    this.router.navigate(['/mis-reservas']);
  }
}
