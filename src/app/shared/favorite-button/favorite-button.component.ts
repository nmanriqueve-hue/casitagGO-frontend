import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { FavoritesService } from '../../core/services/favorites.service';
import { SessionService } from '../../core/services/session.service';
@Component({ selector: 'app-favorite-button', templateUrl: './favorite-button.component.html', styleUrl: './favorite-button.component.css' })
export class FavoriteButtonComponent {
  readonly listingId = input.required<number>();
  readonly listingUuid = input<string | null>(null);
  readonly favorites = inject(FavoritesService);
  readonly session = inject(SessionService);
  private readonly router = inject(Router);
  readonly guardado = computed(() => {
    const uuid = this.listingUuid();
    return uuid ? this.favorites.hasUuid(uuid) : this.favorites.has(this.listingId());
  });
  toggle(): void {
    if (this.session.role() === 'admin') return;
    if (!this.session.isAuthenticated()) { this.router.navigate(['/iniciar-sesion'], { queryParams: { returnUrl: '/favoritos' } }); return; }
    const uuid = this.listingUuid();
    if (uuid) {
      this.favorites.alternarUuid(uuid, (mensaje) => window.alert(mensaje));
      return;
    }
    this.favorites.toggle(this.listingId());
  }
}
