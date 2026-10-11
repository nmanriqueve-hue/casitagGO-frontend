import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { addDays, dateRangeError, localToday } from '../../core/models/date-rules';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Listing } from '../../core/models/marketplace.models';
import { CatalogService } from '../../core/services/catalog.service';
import { PropertyCardComponent } from '../../shared/property-card/property-card.component';

@Component({ selector: 'app-home', imports: [FieldValidationDirective, ReactiveFormsModule, RouterLink, PropertyCardComponent], templateUrl: './home.component.html', styleUrl: './home.component.css' })
export class HomeComponent {
  readonly today = localToday();
  readonly tomorrow = addDays(this.today, 1);
  dateError = '';

  private readonly fb = inject(FormBuilder);
  private readonly catalog = inject(CatalogService);
  readonly featured = signal<Listing[]>([]);
  readonly searchForm = this.fb.group({ city: [''], checkIn: [''], checkOut: [''], guests: [2] });

  constructor(private readonly router: Router) {
    this.catalog.buscarEnBack({}).subscribe({
      next: (lista) => this.featured.set(lista.slice(0, 3)),
      error: () => this.featured.set([])
    });
  }

  search(): void {
    this.searchForm.markAllAsTouched();
    if (this.searchForm.invalid) return;
    const v = this.searchForm.getRawValue();
    this.dateError = dateRangeError(v.checkIn, v.checkOut, false);
    if (!Number.isInteger(v.guests) || (v.guests ?? 0) < 1) this.dateError = 'Selecciona al menos un huésped.';
    if (this.dateError) return;
    this.router.navigate(['/buscar'], { queryParams: this.searchForm.getRawValue() });
  }
}
