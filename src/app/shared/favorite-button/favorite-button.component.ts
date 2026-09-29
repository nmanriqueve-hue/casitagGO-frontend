import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { FavoritesService } from '../../core/services/favorites.service';
import { SessionService } from '../../core/services/session.service';
@Component({ selector: 'app-favorite-button', templateUrl: './favorite-button.component.html', styleUrl: './favorite-button.component.css' })
export class FavoriteButtonComponent {
  readonly listingId = input.required<number>();
  readonly favorites = inject(FavoritesService);
  readonly session = inject(SessionService);
  private readonly router = inject(Router);
  toggle(): void {
    if (this.session.role() === 'admin') return;
    if (!this.session.isAuthenticated()) { this.router.navigate(['/iniciar-sesion'], { queryParams: { returnUrl: '/favoritos' } }); return; }
    this.favorites.toggle(this.listingId());
  }
}
