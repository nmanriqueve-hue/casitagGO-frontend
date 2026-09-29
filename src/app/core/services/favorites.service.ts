import { Injectable, inject, signal } from '@angular/core';
import { SessionService } from './session.service';
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly session = inject(SessionService);
  private readonly saved = signal<Record<number, number[]>>({});
  ids(): number[] { return this.saved()[this.session.currentUser()?.id ?? -1] ?? []; }
  has(id: number): boolean { return this.ids().includes(id); }
  toggle(id: number): void {
    const user = this.session.currentUser();
    if (!user) return;
    this.saved.update((all) => ({ ...all, [user.id]: this.has(id) ? this.ids().filter((item) => item !== id) : [...this.ids(), id] }));
  }
}
