import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { CatalogService } from '../../core/services/catalog.service';
import { SessionService } from '../../core/services/session.service';

@Component({ selector: 'app-host-dashboard', imports: [RouterLink, CurrencyPipe], templateUrl: './host-dashboard.component.html', styleUrl: './host-dashboard.component.css' })
export class HostDashboardComponent {
  readonly catalog = inject(CatalogService);
  readonly bookings = inject(BookingService);
  readonly session = inject(SessionService);
  get listings() { return this.catalog.hostListings(this.session.currentUser()?.id ?? 0); }
  get recentBookings() { return this.bookings.bookings().filter((booking) => this.listings.some((listing) => listing.id === booking.listingId)); }
  get income() { return this.recentBookings.filter(b => ['CONFIRMADA', 'COMPLETADA'].includes(b.status)).reduce((sum, b) => sum + b.total, 0); }
  get reviews() { return this.catalog.reviews().filter(r => this.listings.some(l => l.id === r.listingId)); }
  get rating() { return this.reviews.length ? Math.round(this.reviews.reduce((s, r) => s + r.rating, 0) / this.reviews.length * 10) / 10 : 0; }

  listingTitle(id: number): string { return this.catalog.getById(id)?.title ?? 'Alojamiento'; }
}
