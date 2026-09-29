import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { GeoPoint } from '../../core/models/optional.models';
import { MapsService } from '../../core/services/maps.service';
@Component({ selector: 'app-location-map', templateUrl: './location-map.component.html', styleUrl: './location-map.component.css' })
export class LocationMapComponent {
  readonly listingId = input.required<number>();
  readonly city = input.required<string>();
  private readonly maps = inject(MapsService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly preview = input<GeoPoint | null>(null);
  readonly point = computed(() => this.preview() ?? this.maps.point(this.listingId(), this.city()));
  readonly url = computed(() => {
    const p = this.point();
    if (!p) return null;
    const bbox = [p.longitude - .025, p.latitude - .025, p.longitude + .025, p.latitude + .025].join(',');
    return this.sanitizer.bypassSecurityTrustResourceUrl('https://www.openstreetmap.org/export/embed.html?bbox=' + encodeURIComponent(bbox) + '&layer=mapnik&marker=' + encodeURIComponent(p.latitude + ',' + p.longitude));
  });
  readonly external = computed(() => { const p = this.point(); return p ? 'https://www.openstreetmap.org/?mlat=' + p.latitude + '&mlon=' + p.longitude + '#map=14/' + p.latitude + '/' + p.longitude : ''; });
}
