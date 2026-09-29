import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { requiredText, lettersOnly, positiveInteger } from '../../core/models/form-rules';
import { MapsService } from '../../core/services/maps.service';
import { GeoPoint } from '../../core/models/optional.models';
import { LocationMapComponent } from '../../shared/location-map/location-map.component';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Listing, ListingStatus } from '../../core/models/marketplace.models';
import { CatalogService } from '../../core/services/catalog.service';
import { SessionService } from '../../core/services/session.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ selector: 'app-listing-form', imports: [FieldValidationDirective, ReactiveFormsModule, FormsModule, RouterLink, LocationMapComponent], templateUrl: './listing-form.component.html', styleUrl: './listing-form.component.css' })
export class ListingFormComponent {
  private readonly fb = inject(FormBuilder);
  readonly step = signal(1);
  readonly maps = inject(MapsService);
  readonly mapResults = signal<GeoPoint[]>([]);
  readonly mapPoint = signal<GeoPoint | null>(null);
  mapError = '';
  mapBusy = false;
  async locate(): Promise<void> {
    this.mapBusy = true; this.mapError = '';
    try { this.mapResults.set(await this.maps.searchAddress(this.form.value.city ?? '', '', this.form.value.address ?? '')); if (!this.mapResults().length) this.mapError = 'No encontramos esa dirección. Revisa la ciudad y la ubicación.'; }
    catch (e) { this.mapError = e instanceof Error && !('status' in e) ? e.message : 'No pudimos buscar la ubicación. Revisa la conexión y la configuración del mapa.'; }
    finally { this.mapBusy = false; }
  }
  readonly extraImages = signal<string[]>([]);
  imageUrl = '';
  imageError = '';
  uploading = false;
  readonly fields = [['title', 'description', 'city', 'address', 'type', 'image'], ['capacity', 'bedrooms', 'beds', 'bathrooms'], ['rules'], ['price', 'cleaningFee', 'cancellationPolicy']];
  goStep(target: number): void {
    if (target > this.step()) {
      for (let n = 1; n < target; n++) {
        const controls = this.fields[n - 1].map(key => this.form.get(key)!);
        controls.forEach(c => c.markAsTouched());
        if (controls.some(c => c.invalid)) { this.step.set(n); return; }
      }
    }
    this.step.set(target);
  }
  addImage(): void {
    const url = this.imageUrl.trim();
    if (!/^https?:\/\//i.test(url)) { this.imageError = 'Escribe un enlace HTTP o HTTPS de una imagen.'; return; }
    if (this.extraImages().includes(url) || url === this.form.value.image) { this.imageError = 'Esta imagen ya está agregada.'; return; }
    if (!this.form.value.image) this.form.controls.image.setValue(url); else this.extraImages.update(a => [...a, url]); this.imageUrl = ''; this.imageError = '';
  }
  removeImage(index: number): void { this.extraImages.update(a => a.filter((_, i) => i !== index)); }
  async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    this.uploading = true; this.imageError = '';
    try {
      for (const file of Array.from(input.files ?? [])) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { this.imageError = 'Usa imágenes JPG, PNG o WebP de hasta 5 MB cada una.'; continue; }
        const data = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(file); });
        if (!this.form.value.image || this.form.value.image === 'images/interior-purple.svg') this.form.controls.image.setValue(data);
        else this.extraImages.update(a => [...new Set([...a, data])]);
      }
    } catch { this.imageError = 'No pudimos leer la imagen. Intenta seleccionarla nuevamente.'; }
    finally { input.value = ''; this.uploading = false; }
  }
  readonly editingId: number | null;
  readonly amenityOptions = ['Wi-Fi', 'Cocina', 'Parqueadero', 'Piscina', 'Aire acondicionado', 'Lavadora', 'Espacio de trabajo', 'Jardín'];
  readonly selectedAmenities = signal<string[]>(['Wi-Fi', 'Cocina']);
  readonly form = this.fb.group({
    title: ['', [Validators.required, requiredText(8)]],
    description: ['', [Validators.required, requiredText(30)]],
    city: ['', [Validators.required, lettersOnly]],
    address: ['', [Validators.required, requiredText()]],
    type: ['Apartamento', Validators.required],
    capacity: [2, [Validators.required, positiveInteger]],
    bedrooms: [1, [Validators.required, positiveInteger]],
    beds: [1, [Validators.required, positiveInteger]],
    bathrooms: [1, [Validators.required, positiveInteger]],
    price: [200000, [Validators.required, Validators.min(1)]],
    cleaningFee: [40000, [Validators.required, Validators.min(0)]],
    rules: ['No fumar\nNo se permiten fiestas', [Validators.required, requiredText()]],
    instantBooking: [true],
    cancellationPolicy: ['Flexible: devolución total hasta 48 horas antes de la llegada.', Validators.required],
    image: ['', Validators.required]
  });

  constructor(route: ActivatedRoute, private readonly catalog: CatalogService, private readonly session: SessionService, private readonly router: Router, private readonly toast: ToastService) {
    this.editingId = route.snapshot.paramMap.has('id') ? Number(route.snapshot.paramMap.get('id')) : null;
    if (this.editingId) {
      const listing = this.catalog.getById(this.editingId);
      if (!listing || listing.hostId !== this.session.currentUser()?.id) { this.router.navigate(['/anfitrion/alojamientos']); return; }
      if (listing) {
        this.extraImages.set(listing.images.filter(url => url !== listing.image));
        this.form.patchValue({ ...listing, rules: listing.rules.join('\n') });
        this.selectedAmenities.set([...listing.amenities]);
      }
    }
  }

  toggleAmenity(amenity: string): void {
    this.selectedAmenities.update((items) => items.includes(amenity) ? items.filter((item) => item !== amenity) : [...items, amenity]);
  }

  next(): void {
    if (this.step() < 4) this.goStep(this.step() + 1);
  }

  previous(): void {
    if (this.step() > 1) this.step.update((value) => value - 1);
  }

  save(status: ListingStatus): void {
    if (this.uploading) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const invalidStep = this.fields.findIndex(keys => keys.some(k => this.form.get(k)?.invalid));
      if (invalidStep >= 0) this.step.set(invalidStep + 1);
      this.toast.show('Completa los campos obligatorios antes de guardar.', 'warning');
      return;
    }
    const value = this.form.getRawValue();
    const existing = this.editingId ? this.catalog.getById(this.editingId) : undefined;
    const listing: Listing = {
      id: this.editingId ?? Date.now(), hostId: this.session.currentUser()?.id ?? 2,
      title: value.title?.trim() ?? '', description: value.description?.trim() ?? '', city: value.city?.trim() ?? '', address: value.address?.trim() ?? '', type: value.type ?? 'Apartamento',
      capacity: value.capacity ?? 1, bedrooms: value.bedrooms ?? 1, beds: value.beds ?? 1, bathrooms: value.bathrooms ?? 1,
      price: value.price ?? 1, cleaningFee: value.cleaningFee ?? 0, amenities: this.selectedAmenities(), rules: (value.rules ?? '').split('\n').filter(Boolean),
      image: value.image ?? 'images/interior-purple.svg', images: [...new Set([value.image!.trim(), ...this.extraImages()])],
      rating: existing?.rating ?? 0, reviewsCount: existing?.reviewsCount ?? 0, status, instantBooking: value.instantBooking ?? true,
      cancellationPolicy: value.cancellationPolicy ?? ''
    };
    try { this.catalog.save(listing); } catch (e) { this.toast.show((e as Error).message, 'warning'); return; }
    const point = this.mapPoint(); if (point) this.maps.save(listing.id, point);
    this.toast.show(status === 'BORRADOR' ? 'El borrador fue guardado.' : 'La publicación fue enviada a revisión.');
    this.router.navigate(['/anfitrion/alojamientos']);
  }
}
