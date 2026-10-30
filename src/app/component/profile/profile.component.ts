import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ selector: 'app-profile', imports: [FieldValidationDirective, ReactiveFormsModule], templateUrl: './profile.component.html', styleUrl: './profile.component.css' })
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly session = inject(SessionService);
  readonly confirmDeactivate = signal(false);
  readonly guardando = signal(false);
  readonly cuentaActiva = signal(true);
  readonly miembroDesde = signal('');
  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]]
  });

  constructor() {
    this.session.obtenerPerfil().subscribe({
      next: (perfil) => {
        this.form.patchValue({ name: perfil.nombre, email: perfil.correo });
        this.cuentaActiva.set(perfil.activo);
        this.miembroDesde.set(this.formatearFecha(perfil.creadoEn));
      },
      error: (error: HttpErrorResponse) => this.toast.show(this.mensajeDeError(error), 'warning')
    });
  }

  rolTexto(): string {
    const rol = this.session.role();
    if (rol === 'host') { return 'Anfitrión'; }
    if (rol === 'admin') { return 'Administrador'; }
    return 'Huésped';
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    this.guardando.set(true);
    const correoAnterior = (this.session.currentUser()?.email ?? '').toLowerCase();
    const correoCambio = (value.email ?? '').trim().toLowerCase() !== correoAnterior;
    this.session.actualizarPerfilReal(value.name ?? '', value.email ?? '').subscribe({
      next: () => {
        this.guardando.set(false);
        if (correoCambio) {
          this.session.logout();
          this.router.navigateByUrl('/iniciar-sesion');
          this.toast.show('Cambiaste tu correo. Inicia sesión de nuevo con el correo nuevo.', 'warning');
          return;
        }
        this.toast.show('Tu perfil fue actualizado.');
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.toast.show(this.mensajeDeError(error), 'warning');
      }
    });
  }

  deactivate(): void {
    this.session.cambiarEstadoCuenta(false).subscribe({
      next: () => {
        this.confirmDeactivate.set(false);
        this.session.logout();
        this.router.navigateByUrl('/iniciar-sesion');
        this.toast.show('Tu cuenta fue desactivada.', 'warning');
      },
      error: (error: HttpErrorResponse) => {
        this.confirmDeactivate.set(false);
        this.toast.show(this.mensajeDeError(error), 'warning');
      }
    });
  }

  private formatearFecha(texto: string): string {
    const fecha = new Date(texto);
    if (isNaN(fecha.getTime())) { return ''; }
    return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private mensajeDeError(error: HttpErrorResponse): string {
    if (error.status === 0) { return 'No se pudo conectar con el servidor. Revisa que el back esté corriendo.'; }
    if (error.status === 400 && typeof error.error === 'string' && error.error !== '') { return error.error; }
    return 'No se pudo completar la operación. Revisa los datos o vuelve a iniciar sesión.';
  }
}


