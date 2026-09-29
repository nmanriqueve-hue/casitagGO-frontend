import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserRole } from '../../core/models/marketplace.models';
import { SessionService } from '../../core/services/session.service';

@Component({ selector: 'app-register', imports: [FieldValidationDirective, ReactiveFormsModule, RouterLink], templateUrl: './register.component.html', styleUrl: './register.component.css' })
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  submitted = false;
  authError = '';
  readonly form = this.fb.group({ name: ['', [Validators.required, Validators.minLength(3)]], email: ['', [Validators.required, Validators.email]], phone: ['', Validators.required], role: ['guest' as UserRole, Validators.required], password: ['', [Validators.required, Validators.minLength(8)]], confirmPassword: ['', Validators.required], terms: [false, Validators.requiredTrue] });

  constructor(private readonly session: SessionService, private readonly router: Router) {}

  register(): void {
    this.submitted = true;
    const value = this.form.getRawValue();
    this.form.markAllAsTouched();
    if (this.form.invalid || value.password !== value.confirmPassword) return;
    try { this.session.register(value.name ?? '', value.email ?? '', value.role as UserRole, value.password ?? '', value.phone ?? ''); } catch (e) { this.authError = (e as Error).message; return; }
    this.router.navigateByUrl(value.role === 'host' ? '/anfitrion' : '/mis-reservas');
  }
}
