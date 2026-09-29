import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GeoPoint } from '../../core/models/optional.models';
import { CatalogService } from '../../core/services/catalog.service';
import { MapsService } from '../../core/services/maps.service';
import { SessionService } from '../../core/services/session.service';
import { LocationMapComponent } from '../../shared/location-map/location-map.component';
@Component({ selector: 'app-maps', imports: [FieldValidationDirective, FormsModule, RouterLink, LocationMapComponent], templateUrl: './maps.component.html', styleUrl: './maps.component.css' })
export class MapsComponent {
  readonly catalog = inject(CatalogService);
  readonly session = inject(SessionService);
  readonly maps = inject(MapsService);
  readonly busy = signal(false);
  readonly results = signal<GeoPoint[]>([]);
  readonly notice = signal('');
  selected = 101;
  query = '';
  zone = '';
  address = '';
  readonly preview = signal<GeoPoint | null>(null);
  private readonly route = inject(ActivatedRoute);
  latitude: number | null = null;
  longitude: number | null = null;
  constructor() { const id = Number(this.route.snapshot.queryParamMap.get('alojamiento')); this.selected = this.items().some(l => l.id === id) ? id : this.items()[0]?.id ?? 0; this.load(); }
  items() { return this.catalog.listings().filter((l) => l.status === 'ACTIVA' || l.hostId === this.session.currentUser()?.id || this.session.role() === 'admin'); }
  listing() { return this.items().find((l) => l.id === Number(this.selected)); }
  editable(): boolean { return !!this.session.currentUser() && (this.listing()?.hostId === this.session.currentUser()?.id && this.session.role() === 'host'); }
  load(): void { const l = this.listing(); const p = l ? this.maps.point(l.id, l.city) : null; this.latitude = p?.latitude ?? null; this.longitude = p?.longitude ?? null; this.query = l?.city ?? ''; this.zone = ''; this.address = ''; this.preview.set(null); this.notice.set(''); this.results.set([]); }
  async search(): Promise<void> {
    if (this.busy() || this.query.trim().length < 3) return;
    this.busy.set(true); this.notice.set('');
    try { const r = await this.maps.searchAddress(this.query, this.zone, this.address); this.results.set(r); if (!r.length) this.notice.set('No encontramos resultados. Revisa la ciudad, el barrio y la dirección.'); }
    catch (e) { this.notice.set(e instanceof Error && !('status' in e) ? e.message : 'No pudimos consultar la ubicación. Revisa la conexión y la configuración de la cuenta del mapa.'); }
    finally { this.busy.set(false); }
  }
  choose(p: GeoPoint): void { this.latitude = p.latitude; this.longitude = p.longitude; this.preview.set(p); this.notice.set(this.editable() ? 'Revisa el punto en el mapa y pulsa Guardar ubicación.' : 'Ubicación encontrada.'); }
  save(): void {
    if (!this.editable() || this.latitude === null || this.longitude === null) { this.notice.set('Completa ambas coordenadas.'); return; }
    try { this.maps.save(Number(this.selected), { latitude: Number(this.latitude), longitude: Number(this.longitude), label: this.preview()?.label ?? this.listing()?.address ?? '' }); this.notice.set('Ubicación guardada para esta sesión.'); }
    catch { this.notice.set('Latitud entre −90 y 90; longitud entre −180 y 180.'); }
  }
}
