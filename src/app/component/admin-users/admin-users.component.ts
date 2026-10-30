import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminBackService, UsuarioAdminBack } from '../../core/services/admin-back.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ selector: 'app-admin-users', imports: [FieldValidationDirective, FormsModule, DatePipe], templateUrl: './admin-users.component.html', styleUrl: './admin-users.component.css' })
export class AdminUsersComponent {
  private readonly api = inject(AdminBackService);
  private readonly toast = inject(ToastService);

  readonly search = signal('');
  readonly usuarios = signal<UsuarioAdminBack[]>([]);
  readonly cargando = signal(true);
  readonly errorCarga = signal('');
  readonly target = signal<UsuarioAdminBack | null>(null);
  readonly procesando = signal(false);
  reason = '';

  readonly visible = computed(() => {
    const texto = this.search().trim().toLowerCase();
    return this.usuarios().filter((usuario) => `${usuario.nombre} ${usuario.correo}`.toLowerCase().includes(texto));
  });

  constructor() {
    this.cargar();
  }

  estado(usuario: UsuarioAdminBack): string {
    if (usuario.restringido) { return 'RESTRINGIDA'; }
    return usuario.activo ? 'ACTIVA' : 'INACTIVA';
  }

  puedeRestringir(usuario: UsuarioAdminBack): boolean {
    return usuario.activo && !usuario.restringido && usuario.rol !== 'ADMINISTRADOR';
  }

  abrir(usuario: UsuarioAdminBack): void {
    this.reason = '';
    this.target.set(usuario);
  }

  cancelar(): void {
    this.target.set(null);
    this.reason = '';
  }

  confirmar(): void {
    const usuario = this.target();
    if (!usuario || this.procesando()) { return; }
    const restringiendo = !usuario.restringido;
    const motivo = this.reason.trim();
    if (restringiendo && !motivo) { return; }
    this.procesando.set(true);
    const peticion = restringiendo ? this.api.restringirUsuario(usuario.id, motivo) : this.api.levantarRestriccion(usuario.id);
    peticion.subscribe({
      next: () => {
        this.procesando.set(false);
        this.cancelar();
        this.toast.show(restringiendo ? 'La cuenta fue restringida y el evento quedó registrado.' : 'La cuenta fue reactivada.');
        this.cargar();
      },
      error: (error: HttpErrorResponse) => {
        this.procesando.set(false);
        this.toast.show(this.mensajeDeError(error, 'No se pudo completar la acción. Intenta de nuevo.'), 'warning');
      }
    });
  }

  private cargar(): void {
    this.api.usuarios().subscribe({
      next: (lista) => {
        this.usuarios.set(lista);
        this.errorCarga.set('');
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorCarga.set(this.mensajeDeError(error, 'No se pudieron cargar los usuarios. Intenta de nuevo.'));
      }
    });
  }

  private mensajeDeError(error: HttpErrorResponse, porDefecto: string): string {
    if (error.status === 0) { return 'No se pudo conectar con el servidor. Revisa que el back esté corriendo.'; }
    if (error.status === 400 && typeof error.error === 'string' && error.error !== '') { return error.error; }
    if (error.status === 401 || error.status === 403) { return 'Tu sesión venció o no tienes permiso. Vuelve a iniciar sesión.'; }
    return porDefecto;
  }
}
