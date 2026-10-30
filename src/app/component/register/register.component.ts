import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserRole } from '../../core/models/marketplace.models';
import { SessionService } from '../../core/services/session.service';

@Component({ selector: 'app-register', imports: [FieldValidationDirective, ReactiveFormsModule, RouterLink], templateUrl: './register.component.html', styleUrl: './register.component.css' })
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  submitted = false;
  readonly enviando = signal(false);
  readonly authError = signal('');
  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    role: ['guest' as UserRole, Validators.required],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirmPassword: ['', Validators.required],
    terms: [false, Validators.requiredTrue]
  });

  register(): void {
    this.submitted = true;
    const value = this.form.getRawValue();
    this.form.markAllAsTouched();
    if (this.form.invalid || value.password !== value.confirmPassword) return;
    this.authError.set('');
    this.enviando.set(true);
    this.session.registroReal(value.name ?? '', value.email ?? '', value.password ?? '', value.role as UserRole).subscribe({
      next: (usuario) => {
        this.enviando.set(false);
        this.router.navigateByUrl(usuario.role === 'host' ? '/anfitrion' : '/mis-reservas');
      },
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        this.authError.set(this.mensajeDeError(error));
      }
    });
  }

  private mensajeDeError(error: HttpErrorResponse): string {
    if (error.status === 0) { return 'No se pudo conectar con el servidor. Revisa que el back esté corriendo.'; }
    if (error.status === 400) { return 'Ya existe un usuario registrado con ese correo.'; }
    if (error.status === 403) { return 'Los datos no son válidos. Revisa que el correo sea correcto y que la contraseña tenga entre 8 y 72 caracteres.'; }
    return 'No se pudo crear la cuenta. Intenta de nuevo.';
  }
}


