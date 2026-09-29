import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { CurrencyPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Listing } from '../../core/models/marketplace.models';
import { CatalogService } from '../../core/services/catalog.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ selector: 'app-admin-listings', imports: [FieldValidationDirective, CurrencyPipe, FormsModule, RouterLink], templateUrl: './admin-listings.component.html', styleUrl: './admin-listings.component.css' })
export class AdminListingsComponent {
  readonly filter = signal('TODAS');
  readonly target = signal<Listing | null>(null);
  reason = '';
  readonly visible = computed(() => this.catalog.listings().filter((listing) => this.filter() === 'TODAS' || listing.status === this.filter()));

  constructor(readonly catalog: CatalogService, private readonly toast: ToastService) {}

  approve(id: number): void {
    this.catalog.setStatus(id, 'ACTIVA');
    this.toast.show('La publicación fue aprobada y ahora está activa.');
  }

  block(): void {
    const listing = this.target();
    if (!listing || !this.reason.trim()) return;
    this.catalog.setStatus(listing.id, 'BLOQUEADA');
    this.target.set(null);
    this.reason = '';
    this.toast.show('La publicación fue bloqueada y sus reservas quedaron en revisión.', 'warning');
  }
}
