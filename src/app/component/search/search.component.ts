import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { addDays, dateRangeError, localToday } from '../../core/models/date-rules';
import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { debounceTime } from 'rxjs';
import { Listing, SearchFilters } from '../../core/models/marketplace.models';
import { CatalogService } from '../../core/services/catalog.service';
import { PropertyCardComponent } from '../../shared/property-card/property-card.component';

@Component({ selector: 'app-search', imports: [FieldValidationDirective, ReactiveFormsModule, PropertyCardComponent, CurrencyPipe], templateUrl: './search.component.html', styleUrl: './search.component.css'})
export class SearchComponent {
  readonly today = localToday();
  readonly tomorrow = addDays(this.today, 1);
  readonly dateError = signal('');
  readonly searchError = signal('');
  readonly cargando = signal(false);
  readonly results = signal<Listing[]>([]);
  private ultimaBusqueda = 0;

  private readonly fb = inject(FormBuilder);
  private readonly catalog = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);
  readonly tipoOptions = [
    { value: 'APARTAMENTO', label: 'Apartamento' },
    { value: 'CASA', label: 'Casa' },
    { value: 'HABITACION_PRIVADA', label: 'Habitación privada' },
    { value: 'HABITACION_COMPARTIDA', label: 'Habitación compartida' },
    { value: 'OTRO', label: 'Otro' }
  ];
  readonly amenityOptions = ['Wi-Fi', 'Cocina', 'Parqueadero', 'Piscina', 'Aire acondicionado'];
  readonly selectedAmenities = signal<string[]>([]);
  readonly mobileFilters = signal(false);
  readonly form = this.fb.group({ city: [''], checkIn: [''], checkOut: [''], guests: [1], type: [''], minPrice: [0], maxPrice: [800000] });

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    this.form.patchValue({ city: params.get('city') ?? '', checkIn: params.get('checkIn') ?? '', checkOut: params.get('checkOut') ?? '', guests: Number(params.get('guests')) || 1 });
    this.apply();
    this.form.valueChanges.pipe(debounceTime(400)).subscribe(() => this.apply());
  }

  apply(): void {
    const v = this.form.getRawValue();
    let mensaje: string = dateRangeError(v.checkIn, v.checkOut, false);
    if (!mensaje && !!v.checkIn !== !!v.checkOut) { mensaje = 'Indica la fecha de llegada y la de salida, o deja ambas vacías.'; }
    if (!Number.isInteger(v.guests) || (v.guests ?? 0) < 1) { mensaje = 'Selecciona al menos un huésped.'; }
    if ((v.minPrice ?? 0) < 0 || (v.maxPrice ?? 0) < (v.minPrice ?? 0)) { mensaje = 'Revisa el rango de precios.'; }
    this.dateError.set(mensaje);
    if (mensaje) { this.results.set([]); return; }

    const filtros = { ...v, amenities: this.selectedAmenities() } as SearchFilters;
    const numeroBusqueda = ++this.ultimaBusqueda;
    this.cargando.set(true);
    this.searchError.set('');
    this.catalog.buscarEnBack(filtros).subscribe({
      next: (lista) => {
        if (numeroBusqueda !== this.ultimaBusqueda) { return; }
        this.results.set(lista);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (numeroBusqueda !== this.ultimaBusqueda) { return; }
        this.results.set([]);
        this.cargando.set(false);
        this.searchError.set(this.mensajeDeError(error));
      }
    });
  }

  toggleAmenity(amenity: string): void {
    this.selectedAmenities.update((items) => items.includes(amenity) ? items.filter((item) => item !== amenity) : [...items, amenity]);
    this.apply();
  }

  clearFilters(): void {
    this.form.reset({ city: '', checkIn: '', checkOut: '', guests: 1, type: '', minPrice: 0, maxPrice: 800000 });
    this.selectedAmenities.set([]);
  }

  private mensajeDeError(error: HttpErrorResponse): string {
    if (error.status === 0) { return 'No se pudo conectar con el servidor. Revisa que el back esté corriendo.'; }
    if (error.status === 400 && typeof error.error === 'string' && error.error !== '') { return error.error; }
    if (error.status === 401 || error.status === 403) { return 'Tu sesión venció. Cierra sesión y vuelve a entrar.'; }
    return 'No se pudo cargar la búsqueda. Intenta de nuevo.';
  }
}
