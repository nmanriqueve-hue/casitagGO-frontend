import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserRole } from '../../core/models/marketplace.models';
import { SessionService } from '../../core/services/session.service';
import { MfaService } from '../../core/services/mfa.service';

@Component({ selector: 'app-verify', imports: [FieldValidationDirective, FormsModule, RouterLink], templateUrl: './verify.component.html', styleUrl: './verify.component.css' })
export class VerifyComponent {
  readonly mfa = inject(MfaService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  readonly error = signal('');
  readonly aviso = signal('');
  readonly enviando = signal(false);
  code = '';

  verify(): void {
    const reto = this.mfa.challenge();
    if (!reto) { return; }
    this.error.set('');
    this.aviso.set('');
    this.enviando.set(true);
    this.session.loginReal(reto.email, reto.password, this.code.trim()).subscribe({
      next: (usuario) => this.terminar(usuario.role, reto.returnUrl),
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        this.error.set(this.mensajeDeError(error));
      }
    });
  }

  reenviar(): void {
    const reto = this.mfa.challenge();
    if (!reto) { return; }
    this.error.set('');
    this.aviso.set('');
    this.enviando.set(true);
    this.session.loginReal(reto.email, reto.password).subscribe({
      next: (usuario) => this.terminar(usuario.role, reto.returnUrl),
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        if (this.mfa.esPeticionDeCodigo(error)) {
          this.aviso.set('Te enviamos un código nuevo. Usa el más reciente.');
          return;
        }
        this.error.set(this.mensajeDeError(error));
      }
    });
  }

  cancel(): void {
    this.mfa.clear();
    this.router.navigate(['/iniciar-sesion']);
  }

  private terminar(rol: UserRole, returnUrl: string | null): void {
    this.enviando.set(false);
    this.mfa.clear();
    let destino = returnUrl || '/mis-reservas';
    if (rol === 'host') { destino = '/anfitrion'; }
    if (rol === 'admin') { destino = '/administracion'; }
    this.router.navigateByUrl(destino);
  }

  private mensajeDeError(error: HttpErrorResponse): string {
    if (error.status === 0) { return 'No se pudo conectar con el servidor. Revisa que el back esté corriendo.'; }
    if (error.status === 400 && typeof error.error === 'string' && error.error !== '') { return error.error; }
    return 'No se pudo verificar el código. Vuelve a iniciar sesión.';
  }
}
