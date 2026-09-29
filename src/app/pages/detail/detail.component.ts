import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { addDays, dateRangeError, localToday } from '../../core/models/date-rules';
import { FavoriteButtonComponent } from '../../shared/favorite-button/favorite-button.component';
import { LocationMapComponent } from '../../shared/location-map/location-map.component';
import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { CatalogService } from '../../core/services/catalog.service';
import { SessionService } from '../../core/services/session.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ selector: 'app-detail', imports: [FieldValidationDirective, ReactiveFormsModule, CurrencyPipe, RouterLink, FavoriteButtonComponent, LocationMapComponent], templateUrl: './detail.component.html', styleUrl: './detail.component.css' })
export class DetailComponent {
  readonly today = localToday();
  readonly tomorrow = addDays(this.today, 1);
  dateError = '';

  private readonly fb = inject(FormBuilder);
  readonly listing;
  readonly activeImage = signal(0);
  readonly quoteForm = this.fb.group({ checkIn: [this.today, Validators.required], checkOut: [this.tomorrow, Validators.required], guests: [2, [Validators.required, Validators.min(1)]], extras: [false] });
  quote() {
    const value = this.quoteForm.getRawValue();
    if (dateRangeError(value.checkIn, value.checkOut)) return null;
    return this.listing ? this.bookings.quote(this.listing, value.checkIn ?? '', value.checkOut ?? '', value.extras ? 45000 : 0) : null;
  }

  constructor(
    route: ActivatedRoute,
    readonly catalog: CatalogService,
    private readonly bookings: BookingService,
    readonly session: SessionService,
    private readonly router: Router,
    private readonly toast: ToastService
  ) {
    const item = this.catalog.getById(Number(route.snapshot.paramMap.get('id')));
    this.listing = item && (item.status === 'ACTIVA' || item.hostId === session.currentUser()?.id || session.role() === 'admin') ? item : undefined;
  }

  hostName(): string { return this.session.users().find(u => u.id === this.listing?.hostId)?.name ?? 'Anfitrión'; }
  canReserve(): boolean { return !!this.listing && ['guest', 'host'].includes(this.session.role() ?? '') && this.listing.hostId !== this.session.currentUser()?.id && this.listing.status === 'ACTIVA'; }
  continueBooking(): void {
    this.quoteForm.markAllAsTouched();
    if (!this.listing) return;
    const v = this.quoteForm.getRawValue();
    this.dateError = this.bookings.validation(this.listing, v.checkIn ?? '', v.checkOut ?? '', v.guests ?? 0);
    if (this.dateError || this.quoteForm.invalid) return;
    if (!this.session.isAuthenticated()) {
      this.toast.show('Inicia sesión como huésped para continuar.', 'info');
      this.router.navigate(['/iniciar-sesion'], { queryParams: { returnUrl: `/alojamientos/${this.listing.id}` } });
      return;
    }
    if (!['guest', 'host'].includes(this.session.role() ?? '')) {
      this.toast.show('La reserva está disponible para cuentas de huésped.', 'warning');
      return;
    }
    this.router.navigate(['/reservar', this.listing.id], { queryParams: this.quoteForm.getRawValue() });
  }
}
