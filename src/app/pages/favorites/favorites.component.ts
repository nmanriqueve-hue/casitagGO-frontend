import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../core/services/catalog.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { PropertyCardComponent } from '../../shared/property-card/property-card.component';
@Component({ selector: 'app-favorites', imports: [RouterLink, PropertyCardComponent], templateUrl: './favorites.component.html', styleUrl: './favorites.component.css' })
export class FavoritesComponent {
  readonly favorites = inject(FavoritesService);
  readonly catalog = inject(CatalogService);
  readonly items = computed(() => this.catalog.listings().filter((item) => this.favorites.has(item.id)));
}
