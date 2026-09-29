import { Injectable, signal, inject } from '@angular/core';
import { AppNotification, User } from '../models/marketplace.models';
import { SessionService } from './session.service';
import { AUDIT_EVENTS, NOTIFICATIONS, USERS } from './mock-data';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly session = inject(SessionService);
  private readonly usersState = this.session.users;
  private readonly notificationsState = signal<AppNotification[]>(NOTIFICATIONS.map((item) => ({ ...item })));
  readonly users = this.usersState.asReadonly();
  readonly notifications = this.notificationsState.asReadonly();
  readonly auditEvents = AUDIT_EVENTS;

  toggleUser(id: number): void {
    this.session.toggleUser(id);
  }

  markNotification(id: number): void {
    this.notificationsState.update((items) => items.map((item) => item.id === id ? { ...item, read: true } : item));
  }

  markAllNotifications(): void {
    this.notificationsState.update((items) => items.map((item) => ({ ...item, read: true })));
  }
}
