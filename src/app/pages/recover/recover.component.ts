import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../core/services/session.service';

@Component({ selector: 'app-recover', imports: [FieldValidationDirective, ReactiveFormsModule, RouterLink], templateUrl: './recover.component.html', styleUrl: './recover.component.css' })
export class RecoverComponent {
  private readonly fb = inject(FormBuilder);
  private readonly session = inject(SessionService);
  readonly paso = signal<'correo' | 'codigo' | 'listo'>('correo');
  readonly enviando = signal(false);
  readonly authError = signal('');
  readonly intentoCorreo = signal(false);
  readonly intentoCodigo = signal(false);
  correo = '';
  readonly formCorreo = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  readonly formCodigo = this.fb.group({
    codigo: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirmPassword: ['', Validators.required]
  });

  solicitar(): void {
    this.intentoCorreo.set(true);
    if (this.formCorreo.invalid) { this.formCorreo.markAllAsTouched(); return; }
    this.correo = (this.formCorreo.value.email ?? '').trim();
    this.authError.set('');
    this.enviando.set(true);
    this.session.solicitarRecuperacion(this.correo).subscribe({
      next: () => {
        this.enviando.set(false);
        this.paso.set('codigo');
      },
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        this.authError.set(this.mensajeDeError(error));
      }
    });
  }

  confirmar(): void {
    this.intentoCodigo.set(true);
    const value = this.formCodigo.getRawValue();
    this.formCodigo.markAllAsTouched();
    if (this.formCodigo.invalid || value.password !== value.confirmPassword) { return; }
    this.authError.set('');
    this.enviando.set(true);
    this.session.confirmarRecuperacion(this.correo, (value.codigo ?? '').trim(), value.password ?? '').subscribe({
      next: () => {
        this.enviando.set(false);
        this.paso.set('listo');
      },
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        this.authError.set(this.mensajeDeError(error));
      }
    });
  }

  cambiarCorreo(): void {
    this.paso.set('correo');
    this.authError.set('');
    this.intentoCodigo.set(false);
    this.formCodigo.reset();
  }

  private mensajeDeError(error: HttpErrorResponse): string {
    if (error.status === 0) { return 'No se pudo conectar con el servidor. Revisa que el back esté corriendo.'; }
    if (error.status === 400 && typeof error.error === 'string' && error.error !== '') { return error.error; }
    if (error.status === 403) { return 'Los datos no son válidos. Revisa el correo, el código y que la contraseña tenga entre 8 y 72 caracteres.'; }
    return 'No se pudo completar la operación. Intenta de nuevo en un momento.';
  }
}
