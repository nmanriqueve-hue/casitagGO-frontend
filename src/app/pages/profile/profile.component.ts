import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SessionService } from '../../core/services/session.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ selector: 'app-profile', imports: [FieldValidationDirective, ReactiveFormsModule], templateUrl: './profile.component.html', styleUrl: './profile.component.css' })
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  readonly confirmDeactivate = signal(false);
  readonly form = this.fb.group({ name: ['', Validators.required], email: ['', [Validators.required, Validators.email]], phone: ['', Validators.required] });

  constructor(readonly session: SessionService, private readonly toast: ToastService) {
    const user = this.session.currentUser();
    if (user) this.form.patchValue(user);
  }

  save(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    const value = this.form.getRawValue();
    try { this.session.updateProfile({ name: value.name ?? '', email: value.email ?? '', phone: value.phone ?? '' }); } catch (e) { this.toast.show((e as Error).message, 'warning'); return; }
    this.toast.show('Tu perfil fue actualizado.');
  }

  deactivate(): void {
    this.session.updateProfile({ active: false });
    this.confirmDeactivate.set(false);
    this.toast.show('La cuenta quedó desactivada para esta demostración.', 'warning');
  }
}
