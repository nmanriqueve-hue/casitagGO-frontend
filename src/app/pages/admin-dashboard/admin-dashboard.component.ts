import { CurrencyPipe } from '@angular/common';
import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../core/services/admin.service';
import { BookingService } from '../../core/services/booking.service';
import { CatalogService } from '../../core/services/catalog.service';

@Component({ selector: 'app-admin-dashboard', imports: [RouterLink, CurrencyPipe], templateUrl: './admin-dashboard.component.html', styleUrl: './admin-dashboard.component.css' })
export class AdminDashboardComponent {
  readonly income = computed(() => this.bookings.bookings().filter(b => ['CONFIRMADA', 'COMPLETADA'].includes(b.status)).reduce((sum, b) => sum + b.total, 0));
  readonly cities = computed(() => {
    const counts = new Map<string, number>();
    for (const b of this.bookings.bookings().filter(b => ['CONFIRMADA', 'COMPLETADA'].includes(b.status))) { const city = this.catalog.getById(b.listingId)?.city; if (city) counts.set(city, (counts.get(city) ?? 0) + 1); }
    return [...counts].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  });
  readonly states = computed(() => ['CONFIRMADA', 'EN_REVISION', 'COMPLETADA', 'CANCELADA'].map(name => ({ name, value: this.bookings.bookings().filter(b => b.status === name).length })));
  readonly publications = computed(() => ['ACTIVA', 'PENDIENTE_REVISION', 'PAUSADA', 'BLOQUEADA', 'BORRADOR'].map(name => ({ name, value: this.catalog.listings().filter(l => l.status === name).length })));
  readonly segments = computed(() => { const total = this.bookings.bookings().length || 1; let offset = 0; return this.states().map((s, i) => { const length = s.value / total * 100; const r = { ...s, length, offset, color: ['#7040a0', '#ad8bd0', '#cbb2df', '#e6dbee'][i] }; offset += length; return r; }); });

  constructor(readonly admin: AdminService, readonly catalog: CatalogService, readonly bookings: BookingService) {}
}
