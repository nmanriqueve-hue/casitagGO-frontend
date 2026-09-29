import { CurrencyPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { BookingStatus } from '../../core/models/marketplace.models';
import { BookingService } from '../../core/services/booking.service';
import { CatalogService } from '../../core/services/catalog.service';
import { SessionService } from '../../core/services/session.service';

@Component({ selector: 'app-host-bookings', imports: [CurrencyPipe], templateUrl: './host-bookings.component.html', styleUrl: './host-bookings.component.css' })
export class HostBookingsComponent {
  readonly filter = signal<'TODAS' | BookingStatus>('TODAS');
  readonly hostListingIds;
  readonly visible = computed(() => this.bookings.bookings().filter((booking) => this.hostListingIds.includes(booking.listingId) && (this.filter() === 'TODAS' || booking.status === this.filter())));

  constructor(readonly bookings: BookingService, readonly catalog: CatalogService, session: SessionService) {
    this.hostListingIds = this.catalog.hostListings(session.currentUser()?.id ?? 2).map((listing) => listing.id);
  }

  decide(id: number, listingId: number, status: 'CONFIRMADA' | 'CANCELADA'): void { const l = this.catalog.getById(listingId); if (l) this.bookings.hostDecision(id, l, status); }
  listingTitle(id: number): string { return this.catalog.getById(id)?.title ?? 'Alojamiento'; }
}
