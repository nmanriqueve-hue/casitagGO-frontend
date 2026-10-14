import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminBackService, PublicacionAdminBack } from '../../core/services/admin-back.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ selector: 'app-admin-listings', imports: [FieldValidationDirective, CurrencyPipe, DatePipe, FormsModule, RouterLink], templateUrl: './admin-listings.component.html', styleUrl: './admin-listings.component.css' })
export class AdminListingsComponent {
  private readonly api = inject(AdminBackService);
  private readonly toast = inject(ToastService);

  readonly filter = signal('TODAS');
  readonly publicaciones = signal<PublicacionAdminBack[]>([]);
  readonly cargando = signal(true);
  readonly errorCarga = signal('');
  readonly target = signal<PublicacionAdminBack | null>(null);
  readonly procesando = signal(false);
  reason = '';

  readonly visible = computed(() => this.publicaciones().filter((publicacion) => this.filter() === 'TODAS' || publicacion.estado === this.filter()));

  constructor() {
    this.cargar();
  }

  abrir(publicacion: PublicacionAdminBack): void {
    this.reason = '';
    this.target.set(publicacion);
  }

  cancelar(): void {
    this.target.set(null);
    this.reason = '';
  }

  block(): void {
    const publicacion = this.target();
    const motivo = this.reason.trim();
    if (!publicacion || !motivo || this.procesando()) { return; }
    this.procesando.set(true);
    this.api.bloquearPublicacion(publicacion.id, motivo).subscribe({
      next: () => {
        this.procesando.set(false);
        this.cancelar();
        this.toast.show('La publicación fue bloqueada y sus reservas futuras se conservan para auditoría.', 'warning');
        this.cargar();
      },
      error: (error: HttpErrorResponse) => {
        this.procesando.set(false);
        this.toast.show(this.mensajeDeError(error, 'No se pudo bloquear la publicación. Intenta de nuevo.'), 'warning');
      }
    });
  }

  private cargar(): void {
    this.api.publicaciones().subscribe({
      next: (lista) => {
        this.publicaciones.set(lista);
        this.errorCarga.set('');
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorCarga.set(this.mensajeDeError(error, 'No se pudieron cargar las publicaciones. Intenta de nuevo.'));
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
