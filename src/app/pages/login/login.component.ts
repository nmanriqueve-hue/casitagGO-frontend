import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { MfaService } from '../../core/services/mfa.service';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserRole } from '../../core/models/marketplace.models';
import { SessionService } from '../../core/services/session.service';

@Component({ selector: 'app-login', imports: [FieldValidationDirective, ReactiveFormsModule, RouterLink], templateUrl: './login.component.html', styleUrl: './login.component.css' })
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  readonly mfa = inject(MfaService);
  submitted = false;
  authError = '';
  readonly form = this.fb.group({ email: ['laura@correo.com', [Validators.required, Validators.email]], password: ['demo1234', [Validators.required, Validators.minLength(6)]], role: ['guest' as UserRole, Validators.required], remember: [false] });

  constructor(private readonly session: SessionService, private readonly router: Router, private readonly route: ActivatedRoute) {}

  login(): void {
    this.submitted = true;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    this.authError = '';
    if (!this.session.credentials(value.email ?? '', value.role as UserRole, value.password ?? '')) { this.authError = 'Error de autenticación. Revisa el correo, la contraseña y el rol.'; return; }
    if (this.mfa.enabled(value.email ?? '', value.role as UserRole)) {
      const destination = value.role === 'host' ? '/anfitrion' : value.role === 'admin' ? '/administracion' : this.route.snapshot.queryParamMap.get('returnUrl') || '/mis-reservas';
      this.session.prepareMfa(value.email ?? '', value.role as UserRole, value.password ?? '');
      this.mfa.begin(value.email ?? '', value.role as UserRole, destination);
      this.router.navigate(['/verificar-acceso']);
      return;
    }
    this.session.login(value.email ?? '', value.role as UserRole, value.password ?? '');
    const target = value.role === 'host' ? '/anfitrion' : value.role === 'admin' ? '/administracion' : this.route.snapshot.queryParamMap.get('returnUrl') || '/mis-reservas';
    this.router.navigateByUrl(target);
  }
}
