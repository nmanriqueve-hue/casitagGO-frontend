import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../core/services/session.service';

@Component({ selector: 'app-security', imports: [FieldValidationDirective, FormsModule, RouterLink], templateUrl: './security.component.html', styleUrl: './security.component.css' })
export class SecurityComponent {
  private readonly session = inject(SessionService);
  readonly cargando = signal(true);
  readonly activo = signal(false);
  readonly accion = signal<'activar' | 'desactivar' | null>(null);
  readonly enviando = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  contrasena = '';

  constructor() {
    this.session.obtenerPerfil().subscribe({
      next: (perfil) => {
        this.activo.set(perfil.mfaHabilitado === true);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(this.mensajeDeError(error));
      }
    });
  }

  abrir(accion: 'activar' | 'desactivar'): void {
    this.error.set('');
    this.notice.set('');
    this.contrasena = '';
    this.accion.set(accion);
  }

  cancelar(): void {
    this.error.set('');
    this.contrasena = '';
    this.accion.set(null);
  }

  confirmar(): void {
    const accion = this.accion();
    if (!accion || !this.contrasena) { return; }
    const habilitado = accion === 'activar';
    this.error.set('');
    this.enviando.set(true);
    this.session.cambiarMfa(habilitado, this.contrasena).subscribe({
      next: () => {
        this.enviando.set(false);
        this.activo.set(habilitado);
        this.contrasena = '';
        this.accion.set(null);
        this.notice.set(habilitado
          ? 'Verificación activada. La próxima vez que inicies sesión te pediremos un código que enviaremos a tu correo.'
          : 'Verificación desactivada.');
      },
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        this.error.set(this.mensajeDeError(error));
      }
    });
  }

  private mensajeDeError(error: HttpErrorResponse): string {
    if (error.status === 0) { return 'No se pudo conectar con el servidor. Revisa que el back esté corriendo.'; }
    if (error.status === 400 && typeof error.error === 'string' && error.error !== '') { return error.error; }
    return 'No se pudo completar la operación. Intenta de nuevo.';
  }
}
