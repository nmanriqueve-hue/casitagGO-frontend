import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { BookingService } from '../../core/services/booking.service';
import { CatalogService } from '../../core/services/catalog.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ selector: 'app-reports', imports: [FieldValidationDirective, FormsModule], templateUrl: './reports.component.html', styleUrl: './reports.component.css' })
export class ReportsComponent {
  readonly generating = signal<string | null>(null);
  dateFrom = '2026-09-01';
  dateTo = '2026-09-30';

  constructor(private readonly admin: AdminService, private readonly catalog: CatalogService, private readonly bookings: BookingService, private readonly toast: ToastService) {}

  exportCsv(type: string): void {
    this.generating.set(type);
    let rows: string[][] = [];
    if (type === 'usuarios') rows = [['nombre', 'correo', 'rol', 'estado'], ...this.admin.users().map((item) => [item.name, item.email, item.role, item.active ? 'ACTIVA' : 'RESTRINGIDA'])];
    if (type === 'publicaciones') rows = [['titulo', 'ciudad', 'tipo', 'precio', 'estado'], ...this.catalog.listings().map((item) => [item.title, item.city, item.type, String(item.price), item.status])];
    if (type === 'reservas') rows = [['codigo', 'alojamiento', 'llegada', 'salida', 'estado', 'total'], ...this.bookings.bookings().map((item) => [item.code, String(item.listingId), item.checkIn, item.checkOut, item.status, String(item.total)])];
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-${type}-${this.dateFrom}-${this.dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setTimeout(() => this.generating.set(null), 400);
    this.toast.show('El reporte fue generado y la solicitud quedó registrada.');
  }

  printReport(): void {
    window.print();
  }
}
