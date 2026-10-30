import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { AdminBackService } from '../../core/services/admin-back.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ selector: 'app-reports', imports: [], templateUrl: './reports.component.html', styleUrl: './reports.component.css' })
export class ReportsComponent {
  private readonly api = inject(AdminBackService);
  private readonly toast = inject(ToastService);

  readonly generating = signal(false);

  descargarPdf(): void {
    if (this.generating()) return;
    this.generating.set(true);
    this.api.reporteGestion().subscribe({
      next: (pdf) => {
        const url = URL.createObjectURL(pdf);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'reporte-gestion.pdf';
        link.click();
        URL.revokeObjectURL(url);
        this.generating.set(false);
        this.toast.show('El reporte de gestión fue generado.');
      },
      error: (error: HttpErrorResponse) => {
        this.generating.set(false);
        this.avisarError(error);
      }
    });
  }

  private async avisarError(error: HttpErrorResponse): Promise<void> {
    let mensaje = 'No se pudo generar el reporte. Intenta de nuevo.';
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
}
