import { Injectable, signal } from '@angular/core';
import { dateRangeError, overlaps } from '../models/date-rules';
export interface BlockedPeriod { id: number; listingId: number; start: string; end: string; }
@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  readonly periods = signal<BlockedPeriod[]>([]);
  blocked(listingId: number, start: string, end: string): boolean { return this.periods().some((p) => p.listingId === listingId && overlaps(start, end, p.start, p.end)); }
  block(listingId: number, start: string, end: string): void {
    const error = dateRangeError(start, end);
    if (error) throw new Error(error);
    if (this.blocked(listingId, start, end)) throw new Error('El periodo se superpone con otro bloqueo.');
    this.periods.update((all) => [...all, { id: Date.now(), listingId, start, end }]);
  }
  release(id: number): void { this.periods.update((all) => all.filter((p) => p.id !== id)); }
}
