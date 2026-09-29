import { Injectable, inject, signal } from '@angular/core';
import { Listing, SearchFilters, Review } from '../models/marketplace.models';
import { dateRangeError } from '../models/date-rules';
import { BookingService } from './booking.service';
import { SessionService } from './session.service';
import { LISTINGS, REVIEWS } from './mock-data';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly session = inject(SessionService);
  private readonly bookings = inject(BookingService);
  private readonly listingsState = signal<Listing[]>(LISTINGS.map((item) => ({ ...item, rating: 0, reviewsCount: 0 })));
  readonly listings = this.listingsState.asReadonly();
  readonly reviews = signal<(Review & { listingId: number; bookingId: number })[]>([]);
  reviewsFor(id: number) { return this.reviews().filter(r => r.listingId === id); }
  addReview(bookingId: number, rating: number, content: string): void {
    if (!this.bookings.canReview(bookingId)) throw new Error('Solo quien hizo una reserva confirmada puede reseñarla una vez.');
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !content.trim()) throw new Error('Selecciona entre 1 y 5 estrellas y escribe tu reseña.');
    const b = this.bookings.bookings().find(x => x.id === bookingId)!;
    const listing = this.getById(b.listingId);
    if (!listing || listing.hostId === this.session.currentUser()?.id) throw new Error('No puedes reseñar tu alojamiento.');
    this.bookings.markReviewed(bookingId);
    this.reviews.update(a => [...a, { id: Math.max(Date.now(), ...this.reviews().map(r => r.id + 1)), bookingId, listingId: b.listingId, author: this.session.currentUser()!.name, rating, content: content.trim(), date: new Date().toLocaleDateString('es-CO') }]);
    const all = this.reviewsFor(b.listingId);
    this.listingsState.update(a => a.map(l => l.id === b.listingId ? { ...l, reviewsCount: all.length, rating: Math.round(all.reduce((sum, r) => sum + r.rating, 0) / all.length * 10) / 10 } : l));
  }

  getById(id: number): Listing | undefined {
    return this.listingsState().find((item) => item.id === id);
  }

  search(filters: Partial<SearchFilters>): Listing[] {
    if (dateRangeError(filters.checkIn, filters.checkOut, false)) return [];
    return this.listingsState().filter((item) => {
      const dates = !filters.checkIn || !filters.checkOut || this.bookings.available(item.id, filters.checkIn, filters.checkOut);
      const active = item.status === 'ACTIVA';
      const city = !filters.city || item.city.toLowerCase().includes(filters.city.toLowerCase());
      const guests = !filters.guests || item.capacity >= filters.guests;
      const type = !filters.type || item.type === filters.type;
      const min = !filters.minPrice || item.price >= filters.minPrice;
      const max = !filters.maxPrice || item.price <= filters.maxPrice;
      const amenities = !filters.amenities?.length || filters.amenities.every((amenity) => item.amenities.includes(amenity));
      return dates && active && city && guests && type && min && max && amenities;
    });
  }

  save(listing: Listing): void {
    if ([listing.capacity, listing.bedrooms, listing.beds, listing.bathrooms].some(n => !Number.isInteger(n) || n < 1) || !Number.isFinite(listing.price) || listing.price < 1 || !Number.isFinite(listing.cleaningFee) || listing.cleaningFee < 0) throw new Error('Revisa las cantidades y los precios.');
    const existing = this.getById(listing.id);
    if (this.session.role() !== 'host' || listing.hostId !== this.session.currentUser()?.id || (existing && existing.hostId !== listing.hostId) || !['BORRADOR', 'PENDIENTE_REVISION'].includes(listing.status)) throw new Error('No tienes permiso para editar esta publicación.');
    const current = this.listingsState();
    const index = current.findIndex((item) => item.id === listing.id);
    this.listingsState.set(index >= 0 ? current.map((item) => item.id === listing.id ? listing : item) : [listing, ...current]);
  }

  setStatus(id: number, status: Listing['status']): void {
    const l = this.getById(id);
    const hostAllowed = !!l && l.hostId === this.session.currentUser()?.id && this.session.role() === 'host' && ((l.status === 'ACTIVA' && status === 'PAUSADA') || (l.status === 'PAUSADA' && status === 'ACTIVA'));
    if (this.session.role() !== 'admin' && !hostAllowed) return;
    this.listingsState.update((items) => items.map((item) => item.id === id ? { ...item, status } : item));
  }

  hostListings(hostId: number): Listing[] {
    return this.listingsState().filter((item) => item.hostId === hostId);
  }
}
