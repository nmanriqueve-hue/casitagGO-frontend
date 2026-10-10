import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { GeoPoint } from '../../core/models/optional.models';
import { MapsService } from '../../core/services/maps.service';
@Component({ selector: 'app-location-map', templateUrl: './location-map.component.html', styleUrl: './location-map.component.css' })
export class LocationMapComponent {
  readonly listingId = input.required<number>();
  readonly city = input.required<string>();
  readonly listingUuid = input<string | null>(null);
  private readonly maps = inject(MapsService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly preview = input<GeoPoint | null>(null);
  private readonly remotePoint = signal<GeoPoint | null>(null);
  readonly loading = signal(false);
  readonly point = computed(() => {
    const vista = this.preview();
    if (vista) { return vista; }
    if (this.listingUuid()) { return this.remotePoint(); }
    return this.maps.point(this.listingId(), this.city());
  });
  readonly url = computed(() => {
    const p = this.point();
    if (!p) return null;
    const bbox = [p.longitude - .025, p.latitude - .025, p.longitude + .025, p.latitude + .025].join(',');
    return this.sanitizer.bypassSecurityTrustResourceUrl('https://www.openstreetmap.org/export/embed.html?bbox=' + encodeURIComponent(bbox) + '&layer=mapnik&marker=' + encodeURIComponent(p.latitude + ',' + p.longitude));
  });
  readonly external = computed(() => { const p = this.point(); return p ? 'https://www.openstreetmap.org/?mlat=' + p.latitude + '&mlon=' + p.longitude + '#map=14/' + p.latitude + '/' + p.longitude : ''; });

  constructor() {
    effect(() => {
      const uuid = this.listingUuid();
      if (!uuid) { return; }
      this.loading.set(true);
      this.remotePoint.set(null);
      this.maps.ubicacionDeBack(uuid).subscribe((punto) => {
        this.remotePoint.set(punto);
        this.loading.set(false);
      });
    });
  }
}
