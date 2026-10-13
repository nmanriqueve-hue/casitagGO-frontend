import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminBackService, EventoAuditoriaBack } from '../../core/services/admin-back.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ selector: 'app-audit', imports: [FieldValidationDirective, FormsModule, DatePipe], templateUrl: './audit.component.html', styleUrl: './audit.component.css' })
export class AuditComponent {
  private readonly api = inject(AdminBackService);
  private readonly toast = inject(ToastService);

  readonly search = signal('');
  readonly result = signal('TODOS');
  readonly eventos = signal<EventoAuditoriaBack[]>([]);
  readonly cargando = signal(true);
  readonly exportando = signal(false);
  readonly errorCarga = signal('');

  readonly resultados = computed(() => ['TODOS', ...new Set(this.eventos().map((evento) => evento.resultado))]);
  readonly visible = computed(() => {
    const texto = this.search().trim().toLowerCase();
    return this.eventos().filter((evento) => (this.result() === 'TODOS' || evento.resultado === this.result()) && (!texto || this.textoDe(evento).includes(texto)));
  });

  constructor() {
    this.api.auditoria().subscribe({
      next: (lista) => {
        this.eventos.set([...lista].sort((a, b) => (b.creadoEn ?? '').localeCompare(a.creadoEn ?? '')));
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorCarga.set(this.mensajeDeError(error));
      }
    });
  }

  actor(evento: EventoAuditoriaBack): string {
    return evento.usuarioId ? evento.usuarioId.slice(0, 8) : 'Sistema';
  }

  detalle(evento: EventoAuditoriaBack): string {
    const datos = evento.detalle;
    if (!datos) { return ''; }
    return Object.entries(datos).map(([clave, valor]) => `${clave}: ${typeof valor === 'object' ? JSON.stringify(valor) : String(valor)}`).join(' · ');
  }

  private textoDe(evento: EventoAuditoriaBack): string {
    return `${this.actor(evento)} ${evento.accion} ${evento.entidad} ${evento.resultado} ${this.detalle(evento)}`.toLowerCase();
  }

  exportCsv(): void {
    if (this.exportando()) { return; }
    this.exportando.set(true);
    this.api.exportarAuditoriaCsv().subscribe({
      next: (csv) => {
        const url = URL.createObjectURL(csv);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'auditoria-casitago.csv';
        link.click();
        URL.revokeObjectURL(url);
        this.exportando.set(false);
        this.toast.show('El registro de auditoría fue exportado.');
      },
      error: (error: HttpErrorResponse) => {
        this.exportando.set(false);
        this.avisarErrorExportar(error);
      }
    });
  }

  private async avisarErrorExportar(error: HttpErrorResponse): Promise<void> {
    let mensaje = 'No se pudo exportar la auditoría. Intenta de nuevo.';
    if (error.status === 0) {
      mensaje = 'No se pudo conectar con el servidor. Revisa que el back esté corriendo.';
    } else if (error.status === 400 && error.error instanceof Blob) {
      const texto = await error.error.text();
      if (texto) { mensaje = texto; }
    } else if (error.status === 401 || error.status === 403) {
      mensaje = 'Tu sesión venció o no tienes permiso. Vuelve a iniciar sesión.';
    }
    this.toast.show(mensaje, 'warning');
  }

  private mensajeDeError(error: HttpErrorResponse): string {
    if (error.status === 0) { return 'No se pudo conectar con el servidor. Revisa que el back esté corriendo.'; }
    if (error.status === 400 && typeof error.error === 'string' && error.error !== '') { return error.error; }
    if (error.status === 401 || error.status === 403) { return 'Tu sesión venció o no tienes permiso. Vuelve a iniciar sesión.'; }
    return 'No se pudieron cargar los eventos. Intenta de nuevo.';
  }
}
