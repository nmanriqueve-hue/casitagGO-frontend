import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Booking } from '../../core/models/marketplace.models';
import { BookingService } from '../../core/services/booking.service';
import { CatalogService } from '../../core/services/catalog.service';
import { SessionService } from '../../core/services/session.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ selector: 'app-guest-bookings', imports: [FieldValidationDirective, CurrencyPipe, DatePipe, FormsModule, RouterLink], templateUrl: './guest-bookings.component.html', styleUrl: './guest-bookings.component.css' })
export class GuestBookingsComponent {
  readonly tab = signal<'upcoming' | 'history'>('upcoming');
  readonly cancelTarget = signal<Booking | null>(null);
  readonly reviewTarget = signal<Booking | null>(null);
  cancelReason = '';
  reviewText = '';
  reviewRating = 5;
  readonly visible = computed(() => this.bookings.bookings().filter((item) => item.guestId === this.session.currentUser()?.id && (this.tab() === 'upcoming' ? ['CONFIRMADA', 'EN_REVISION'].includes(item.status) : !['CONFIRMADA', 'EN_REVISION'].includes(item.status))));

  constructor(readonly bookings: BookingService, readonly catalog: CatalogService, private readonly session: SessionService, private readonly toast: ToastService) {}

  listing(id: number) { return this.catalog.getById(id); }

  confirmCancel(): void {
    const booking = this.cancelTarget();
    if (!booking || !this.cancelReason.trim()) return;
    this.bookings.cancel(booking.id);
    this.cancelTarget.set(null);
    this.cancelReason = '';
    this.toast.show('La reserva fue cancelada y el periodo quedó liberado.', 'warning');
  }

  publishReview(): void {
    const booking = this.reviewTarget();
    if (!booking || !this.reviewText.trim()) return;
    try { this.catalog.addReview(booking.id, this.reviewRating, this.reviewText); } catch (e) { this.toast.show((e as Error).message, 'warning'); return; }
    this.reviewTarget.set(null);
    this.reviewText = '';
    this.toast.show('Tu reseña fue publicada.');
  }
}
