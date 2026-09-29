import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { User } from '../../core/models/marketplace.models';
import { AdminService } from '../../core/services/admin.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ selector: 'app-admin-users', imports: [FieldValidationDirective, FormsModule], templateUrl: './admin-users.component.html', styleUrl: './admin-users.component.css' })
export class AdminUsersComponent {
  readonly search = signal('');
  readonly target = signal<User | null>(null);
  reason = '';
  readonly visible = computed(() => this.admin.users().filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(this.search().toLowerCase())));

  constructor(readonly admin: AdminService, private readonly toast: ToastService) {}

  toggle(): void {
    const user = this.target();
    if (!user) return;
    this.admin.toggleUser(user.id);
    this.target.set(null);
    this.reason = '';
    this.toast.show(user.active ? 'La cuenta fue restringida y el evento quedó registrado.' : 'La cuenta fue reactivada.');
  }
}
