import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { addDays, dateRangeError, localToday } from '../../core/models/date-rules';
import { AvailabilityService } from '../../core/services/availability.service';
import { BookingService } from '../../core/services/booking.service';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../../core/services/catalog.service';
import { SessionService } from '../../core/services/session.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ selector: 'app-availability', imports: [FieldValidationDirective, FormsModule], templateUrl: './availability.component.html', styleUrl: './availability.component.css' })
export class AvailabilityComponent {
  readonly today = localToday();
  readonly periods = inject(AvailabilityService);
  private readonly bookings = inject(BookingService);
  readonly dateError = signal('');

  readonly listings;
  selectedListing = 101;
  readonly monthOffset = signal(0);
  readonly showBlockModal = signal(false);
  blockStart = this.today;
  blockEnd = addDays(this.today, 1);
  readonly customBlocked = signal<number[]>([]);
  readonly days = computed(() => {
    const month = this.currentMonth();
    const offset = (month.getDay() + 6) % 7;
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => { const day = index - offset + 1; return day > 0 && day <= count ? day : 0; });
  });

  constructor(catalog: CatalogService, session: SessionService, private readonly toast: ToastService) {
    this.listings = catalog.hostListings(session.currentUser()?.id ?? 2);
    this.selectedListing = this.listings[0]?.id ?? 0;
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
    if (this.periods.blocked(Number(this.selectedListing), date, addDays(date, 1))) return 'blocked';
    if (!this.bookings.available(Number(this.selectedListing), date, addDays(date, 1))) return 'reserved';
    return 'available';
  }
  selectDay(day: number): void {
    if (this.dayState(day) !== 'available') return;
    this.blockStart = this.dayDate(day); this.blockEnd = addDays(this.blockStart, 1); this.showBlockModal.set(true);
  }
  ownPeriods() { return this.periods.periods().filter((p) => p.listingId === Number(this.selectedListing)); }
  release(id: number): void { if (!this.listings.some(l => l.id === Number(this.selectedListing)) || !this.ownPeriods().some(p => p.id === id)) return; this.periods.release(id); this.toast.show('Periodo disponible nuevamente.'); }

  blockPeriod(): void {
    if (!this.listings.some(l => l.id === Number(this.selectedListing))) { this.dateError.set('Selecciona uno de tus alojamientos.'); return; }
    const error = dateRangeError(this.blockStart, this.blockEnd);
    if (error) { this.dateError.set(error); return; }
    if (!this.bookings.available(Number(this.selectedListing), this.blockStart, this.blockEnd)) { this.dateError.set('El periodo se superpone con una reserva o bloqueo.'); return; }
    this.periods.block(Number(this.selectedListing), this.blockStart, this.blockEnd);
    this.dateError.set('');
    this.showBlockModal.set(false);
    this.toast.show('El periodo fue bloqueado en la disponibilidad.', 'warning');
  }
}
