import { CurrencyPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoriteButtonComponent } from '../favorite-button/favorite-button.component';
import { Listing } from '../../core/models/marketplace.models';

@Component({ selector: 'app-property-card', imports: [RouterLink, CurrencyPipe, FavoriteButtonComponent], templateUrl: './property-card.component.html', styleUrl: './property-card.component.css' })
export class PropertyCardComponent {
  readonly listing = input.required<Listing>();
}
