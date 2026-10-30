import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminBackService, DashboardBack } from '../../core/services/admin-back.service';

const ESTADOS = ['CONFIRMADA', 'PENDIENTE', 'COMPLETADA', 'CANCELADA'];
const COLORES = ['#7040a0', '#ad8bd0', '#cbb2df', '#e6dbee'];

@Component({ selector: 'app-admin-dashboard', imports: [RouterLink, CurrencyPipe], templateUrl: './admin-dashboard.component.html', styleUrl: './admin-dashboard.component.css' })
export class AdminDashboardComponent {
  private readonly api = inject(AdminBackService);

  readonly datos = signal<DashboardBack | null>(null);
  readonly cargando = signal(true);
  readonly errorCarga = signal('');

  readonly states = computed(() => ESTADOS.map((name) => ({ name, value: this.datos()?.reservasPorEstado?.[name] ?? 0 })));
  readonly totalReservas = computed(() => this.states().reduce((suma, estado) => suma + estado.value, 0));
  readonly confirmadas = computed(() => this.datos()?.reservasPorEstado?.['CONFIRMADA'] ?? 0);
  readonly cities = computed(() => (this.datos()?.ciudadesConMayorDemanda ?? []).map((ciudad) => ({ name: ciudad.ciudad, value: ciudad.reservas })));
  readonly maxCiudad = computed(() => Math.max(1, ...this.cities().map((ciudad) => ciudad.value)));
  readonly segments = computed(() => {
    const total = this.totalReservas() || 1;
    let offset = 0;
    return this.states().map((estado, indice) => {
      const length = estado.value / total * 100;
      const segmento = { ...estado, length, offset, color: COLORES[indice] };
      offset += length;
      return segmento;
    });
  });

  constructor() {
    this.api.dashboard().subscribe({
      next: (datos) => {
        this.datos.set(datos);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorCarga.set(this.mensajeDeError(error));
      }
    });
  }

  private mensajeDeError(error: HttpErrorResponse): string {
    if (error.status === 0) { return 'No se pudo conectar con el servidor. Revisa que el back esté corriendo.'; }
    if (error.status === 400 && typeof error.error === 'string' && error.error !== '') { return error.error; }
    if (error.status === 401 || error.status === 403) { return 'Tu sesión venció o no tienes permiso. Vuelve a iniciar sesión.'; }
    return 'No se pudieron cargar los indicadores. Intenta de nuevo.';
  }
}
