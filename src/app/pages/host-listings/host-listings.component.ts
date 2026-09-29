import { CurrencyPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Listing, ListingStatus } from '../../core/models/marketplace.models';
import { CatalogService } from '../../core/services/catalog.service';
import { SessionService } from '../../core/services/session.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ selector: 'app-host-listings', imports: [CurrencyPipe, RouterLink], templateUrl: './host-listings.component.html', styleUrl: './host-listings.component.css' })
export class HostListingsComponent {
  readonly statusTarget = signal<Listing | null>(null);

  constructor(readonly catalog: CatalogService, readonly session: SessionService, private readonly toast: ToastService) {}

  items(): Listing[] { return this.catalog.hostListings(this.session.currentUser()?.id ?? 2); }

  changeStatus(status: ListingStatus): void {
    const listing = this.statusTarget();
    if (!listing) return;
    this.catalog.setStatus(listing.id, status);
    this.statusTarget.set(null);
    this.toast.show(`La publicación ahora está ${status.toLowerCase().replace('_', ' ')}.`);
  }
}
