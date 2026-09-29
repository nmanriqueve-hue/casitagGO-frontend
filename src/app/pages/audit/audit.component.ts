import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ selector: 'app-audit', imports: [FieldValidationDirective, FormsModule], templateUrl: './audit.component.html', styleUrl: './audit.component.css' })
export class AuditComponent {
  readonly search = signal('');
  readonly result = signal('TODOS');
  readonly visible = computed(() => this.admin.auditEvents.filter((event) => `${event.actor} ${event.action} ${event.entity} ${event.detail}`.toLowerCase().includes(this.search().toLowerCase()) && (this.result() === 'TODOS' || event.result === this.result())));

  constructor(readonly admin: AdminService, private readonly toast: ToastService) {}

  exportCsv(): void {
    const header = 'fecha,actor,accion,entidad,resultado,detalle';
    const rows = this.visible().map((event) => [event.date, event.actor, event.action, event.entity, event.result, event.detail].map((value) => `"${value}"`).join(','));
    const url = URL.createObjectURL(new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'auditoria-lumina.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.toast.show('El registro de auditoría fue exportado.');
  }
}
