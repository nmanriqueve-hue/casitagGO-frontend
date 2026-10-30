
import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  OnDestroy,
  signal,
  viewChild
} from '@angular/core';
import * as L from 'leaflet';
import { GeoPoint } from '../../core/models/optional.models';
import { MapsService } from '../../core/services/maps.service';

@Component({
  selector: 'app-location-map',
  templateUrl: './location-map.component.html',
  styleUrl: './location-map.component.css'
})
export class LocationMapComponent implements OnDestroy {
  readonly listingId = input.required<number>();
  readonly city = input.required<string>();
  readonly listingUuid = input<string | null>(null);
  readonly preview = input<GeoPoint | null>(null);

  private readonly maps = inject(MapsService);
  private readonly injector = inject(Injector);

  private readonly mapContainer =
    viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  private readonly remotePoint = signal<GeoPoint | null>(null);

  readonly loading = signal(false);

  readonly point = computed(() => {
    const vista = this.preview();

    if (vista) {
      return vista;
    }

    if (this.listingUuid()) {
      return this.remotePoint();
    }

    return this.maps.point(this.listingId(), this.city());
  });

  readonly validPoint = computed(() => {
    const p = this.point();

    if (!p) {
      return null;
    }

    if (
      !Number.isFinite(p.latitude) ||
      !Number.isFinite(p.longitude) ||
      p.latitude < -90 ||
      p.latitude > 90 ||
      p.longitude < -180 ||
      p.longitude > 180
    ) {
      return null;
    }

    return p;
  });

  readonly external = computed(() => {
    const p = this.validPoint();

    if (!p) {
      return '';
    }

    const lat = p.latitude;
    const lng = p.longitude;

    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}`;
  });

  private map: L.Map | null = null;
  private marker: L.CircleMarker | null = null;

  constructor() {
    effect((onCleanup) => {
      const uuid = this.listingUuid();

      if (!uuid) {
        this.remotePoint.set(null);
        this.loading.set(false);
        return;
      }

      this.loading.set(true);
      this.remotePoint.set(null);

      const subscription = this.maps.ubicacionDeBack(uuid).subscribe({
        next: (punto) => {
          this.remotePoint.set(punto);
          this.loading.set(false);
        },
        error: () => {
          this.remotePoint.set(null);
          this.loading.set(false);
        }
      });

      onCleanup(() => subscription.unsubscribe());
    });

    afterNextRender(() => {
      effect(() => {
        const container = this.mapContainer();
        const p = this.validPoint();

        if (!container || !p) {
          this.destroyMap();
          return;
        }

        this.renderMap(
          container.nativeElement,
          p.latitude,
          p.longitude
        );
      }, { injector: this.injector });
    }, { injector: this.injector });
  }

  private renderMap(
    container: HTMLDivElement,
    latitude: number,
    longitude: number
  ): void {
    if (
      this.map &&
      this.map.getContainer() !== container
    ) {
      this.destroyMap();
    }

    if (!this.map) {
      this.map = L.map(container).setView(
        [latitude, longitude],
        14
      );

      L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }
      ).addTo(this.map);
    }

    this.map.setView([latitude, longitude], 14);

    if (this.marker) {
      this.marker.setLatLng([latitude, longitude]);
    } else {
      this.marker = L.circleMarker(
        [latitude, longitude],
        {
          radius: 9,
          color: '#ffffff',
          weight: 2,
          fillColor: '#2563eb',
          fillOpacity: 1
        }
      ).addTo(this.map);
    }

    this.map.invalidateSize();
  }

  private destroyMap(): void {
    this.map?.remove();
    this.map = null;
    this.marker = null;
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }
}
