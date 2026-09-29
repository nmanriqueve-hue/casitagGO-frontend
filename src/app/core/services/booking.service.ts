import { Injectable, inject, signal, computed } from '@angular/core';
import { Booking, Listing, Quote } from '../models/marketplace.models';
import { dateRangeError, overlaps } from '../models/date-rules';
import { AvailabilityService } from './availability.service';
import { SessionService } from './session.service';
import { localToday } from '../models/date-rules';
import { BOOKINGS } from './mock-data';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly session = inject(SessionService);
  private readonly availability = inject(AvailabilityService);
  available(listingId: number, start: string, end: string): boolean {
    return !this.availability.blocked(listingId, start, end) && !this.bookingsState().some((b) => b.listingId === listingId && ['CONFIRMADA', 'EN_REVISION'].includes(b.status) && overlaps(start, end, b.checkIn, b.checkOut));
  }
  validation(listing: Listing, start: string, end: string, guests: number): string {
    const user = this.session.currentUser();
    if (!user || !['guest', 'host'].includes(user.role)) return 'Tu rol no permite hacer reservas.';
    if (user.id === listing.hostId) return 'No puedes reservar tu propio alojamiento.';
    const error = dateRangeError(start, end);
    if (error) return error;
    if (!Number.isInteger(guests) || guests < 1 || guests > listing.capacity) return 'El número de huéspedes supera la capacidad o no es válido.';
    if (listing.status !== 'ACTIVA') return 'La publicación no está disponible para nuevas reservas.';
    if (!this.available(listing.id, start, end)) return 'Estas fechas están reservadas o bloqueadas. Selecciona otro periodo.';
    return '';
  }
  private readonly bookingsState = signal<Booking[]>(BOOKINGS.map((item) => ({ ...item })));
  readonly bookings = computed(() => this.bookingsState().map(b => b.status === 'CONFIRMADA' && b.checkOut <= localToday() ? { ...b, status: 'COMPLETADA' as const } : b));

  quote(listing: Listing, checkIn: string, checkOut: string, extras = 0): Quote {
    const start = new Date(`${checkIn}T12:00:00`).getTime();
    const end = new Date(`${checkOut}T12:00:00`).getTime();
    const nights = Math.max(1, Math.round((end - start) / 86400000) || 1);
    const base = nights * listing.price;
    const cleaning = listing.cleaningFee;
    const service = Math.round((base + cleaning + extras) * 0.1);
    const discount = nights >= 7 ? Math.round(base * 0.08) : 0;
    return { nights, base, cleaning, service, extras, discount, total: base + cleaning + service + extras - discount };
  }

  create(listing: Listing, guestId: number, checkIn: string, checkOut: string, guests: number, quote: Quote): Booking {
    if (guestId !== this.session.currentUser()?.id) throw new Error('No puedes reservar en nombre de otra cuenta.');
    const error = this.validation(listing, checkIn, checkOut, guests);
    if (error) throw new Error(error);
    const booking: Booking = {
      id: Math.max(Date.now(), ...this.bookingsState().map(b => b.id + 1)),
      code: `LR-${Math.floor(10000 + Math.random() * 89999)}`,
      listingId: listing.id,
      guestId,
      checkIn,
      checkOut,
      guests,
      status: listing.instantBooking ? 'CONFIRMADA' : 'EN_REVISION',
      total: quote.total,
      createdAt: new Date().toISOString().slice(0, 10),
      reviewed: false
    };
    this.bookingsState.update((items) => [booking, ...items]);
    return booking;
  }

  cancel(id: number): void {
    const b = this.bookingsState().find(x => x.id === id);
    if (!b || b.checkOut <= localToday() || b.guestId !== this.session.currentUser()?.id || !['CONFIRMADA', 'EN_REVISION'].includes(b.status)) return;
    this.bookingsState.update((items) => items.map((item) => item.id === id ? { ...item, status: 'CANCELADA' } : item));
  }

  canReview(id: number): boolean {
    const b = this.bookingsState().find(x => x.id === id);
    return !!b && b.guestId === this.session.currentUser()?.id && this.session.role() !== 'admin' && ['CONFIRMADA', 'COMPLETADA'].includes(b.status) && !b.reviewed;
  }
  hostDecision(id: number, listing: Listing, status: 'CONFIRMADA' | 'CANCELADA'): void {
    if (this.session.role() !== 'host' || listing.hostId !== this.session.currentUser()?.id) return;
    this.bookingsState.update(a => a.map(b => b.id === id && b.listingId === listing.id && b.status === 'EN_REVISION' ? { ...b, status } : b));
  }
  markReviewed(id: number): void {
    if (!this.canReview(id)) throw new Error('Esta reserva no permite publicar una reseña.');
    this.bookingsState.update((items) => items.map((item) => item.id === id ? { ...item, reviewed: true } : item));
  }
}
