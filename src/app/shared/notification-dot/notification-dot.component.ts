import { Component, inject } from '@angular/core';
import { EventosService } from '../../core/services/eventos.service';
import { NotificacionesBackService } from '../../core/services/notificaciones-back.service';

@Component({
  selector: 'app-notification-dot',
  template: `
    @if (notificaciones.noLeidas() > 0) {
      <span class="notification-dot" role="status" [attr.aria-label]="etiqueta()">{{ cantidad() }}</span>
    }
  `,
  styles: [`
    .notification-dot { display: inline-grid; place-items: center; min-width: 18px; height: 18px; margin-left: 6px; padding: 0 5px; border-radius: 999px; background: var(--brand); color: white; font-size: .68rem; font-weight: 800; line-height: 1; vertical-align: middle; }
  `]
})
export class NotificationDotComponent {
  readonly notificaciones = inject(NotificacionesBackService);

  constructor() {
    // La barra solo muestra este componente con la sesión iniciada: aquí se activa también el canal en vivo.
    inject(EventosService);
  }

  cantidad(): string {
    const total = this.notificaciones.noLeidas();
    return total > 9 ? '9+' : String(total);
  }

  etiqueta(): string {
    const total = this.notificaciones.noLeidas();
    return total === 1 ? '1 notificación sin leer' : `${total} notificaciones sin leer`;
  }
}
