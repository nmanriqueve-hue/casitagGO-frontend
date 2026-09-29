import { Component } from '@angular/core';
import { AdminService } from '../../core/services/admin.service';

@Component({ selector: 'app-notifications', templateUrl: './notifications.component.html', styleUrl: './notifications.component.css' })
export class NotificationsComponent {
  constructor(readonly admin: AdminService) {}
}
