import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { addDays, dateRangeError, localToday } from '../../core/models/date-rules';
import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SearchFilters } from '../../core/models/marketplace.models';
import { CatalogService } from '../../core/services/catalog.service';
import { PropertyCardComponent } from '../../shared/property-card/property-card.component';

@Component({ selector: 'app-search', imports: [FieldValidationDirective, ReactiveFormsModule, PropertyCardComponent, CurrencyPipe], templateUrl: './search.component.html', styleUrl: './search.component.css' })
export class SearchComponent {
  readonly today = localToday();
  readonly tomorrow = addDays(this.today, 1);
  dateError = '';

  private readonly fb = inject(FormBuilder);
  readonly amenityOptions = ['Wi-Fi', 'Cocina', 'Parqueadero', 'Piscina', 'Aire acondicionado'];
  readonly selectedAmenities = signal<string[]>([]);
  readonly mobileFilters = signal(false);
  readonly form = this.fb.group({ city: [''], checkIn: [''], checkOut: [''], guests: [1], type: [''], minPrice: [0], maxPrice: [800000] });
  readonly applied = signal<Partial<SearchFilters>>({});
  readonly results = computed(() => { const filters = this.applied(); const amenities = this.selectedAmenities(); return this.dateError || this.form.invalid ? [] : this.catalog.search({ ...filters, amenities } as SearchFilters); });
  apply(): void {
    const v = this.form.getRawValue();
    this.dateError = dateRangeError(v.checkIn, v.checkOut, false);
    if (!Number.isInteger(v.guests) || (v.guests ?? 0) < 1) this.dateError = 'Selecciona al menos un huésped.';
    if ((v.minPrice ?? 0) < 0 || (v.maxPrice ?? 0) < (v.minPrice ?? 0)) this.dateError = 'Revisa el rango de precios.';
    this.applied.set({ ...v } as SearchFilters);
  }

  constructor(private readonly catalog: CatalogService, route: ActivatedRoute) {
    const params = route.snapshot.queryParamMap;
    this.form.patchValue({ city: params.get('city') ?? '', checkIn: params.get('checkIn') ?? '', checkOut: params.get('checkOut') ?? '', guests: Number(params.get('guests')) || 1 });
    this.apply();
    this.form.valueChanges.subscribe(() => this.apply());
  }

  toggleAmenity(amenity: string): void {
    this.selectedAmenities.update((items) => items.includes(amenity) ? items.filter((item) => item !== amenity) : [...items, amenity]);
  }

  clearFilters(): void {
    this.form.reset({ city: '', checkIn: '', checkOut: '', guests: 1, type: '', minPrice: 0, maxPrice: 800000 });
    this.selectedAmenities.set([]);
  }
}
