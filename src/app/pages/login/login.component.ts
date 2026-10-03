import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MfaService } from '../../core/services/mfa.service';
import { SessionService } from '../../core/services/session.service';

@Component({ selector: 'app-login', imports: [FieldValidationDirective, ReactiveFormsModule, RouterLink], templateUrl: './login.component.html', styleUrl: './login.component.css' })
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly session = inject(SessionService);
  private readonly mfa = inject(MfaService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  submitted = false;
  readonly enviando = signal(false);
  readonly authError = signal('');
  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  login(): void {
    this.submitted = true;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    const correo = value.email ?? '';
    const contrasena = value.password ?? '';
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.authError.set('');
    this.enviando.set(true);
    this.session.loginReal(correo, contrasena).subscribe({
      next: (usuario) => {
        this.enviando.set(false);
        let destino = returnUrl || '/mis-reservas';
        if (usuario.role === 'host') { destino = '/anfitrion'; }
        if (usuario.role === 'admin') { destino = '/administracion'; }
        this.router.navigateByUrl(destino);
      },
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        if (this.mfa.esPeticionDeCodigo(error)) {
          this.mfa.begin(correo, contrasena, returnUrl);
          this.router.navigate(['/verificar-acceso']);
          return;
        }
        this.authError.set(this.mensajeDeError(error));
      }
    });
  }

  private mensajeDeError(error: HttpErrorResponse): string {
    if (error.status === 0) { return 'No se pudo conectar con el servidor. Revisa que el back esté corriendo.'; }
    if (error.status === 400 && typeof error.error === 'string' && error.error !== '') { return error.error; }
    return 'No se pudo iniciar sesión. Revisa el correo y la contraseña.';
  }
}
