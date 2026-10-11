import { Component, inject } from '@angular/core';
import { NotificacionesBackService } from '../../core/services/notificaciones-back.service';

const TITULOS: Record<string, string> = {
  RESERVA_CONFIRMADA: 'Reserva confirmada',
  RESERVA_CANCELADA: 'Reserva cancelada'
};

@Component({ selector: 'app-notifications', templateUrl: './notifications.component.html', styleUrl: './notifications.component.css' })
export class NotificationsComponent {
  readonly notificaciones = inject(NotificacionesBackService);

  constructor() {
    this.notificaciones.cargar();
  }

  titulo(tipo: string): string {
    if (TITULOS[tipo]) { return TITULOS[tipo]; }
    const texto = tipo.replace(/_/g, ' ').toLowerCase();
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  icono(tipo: string): string {
    if (tipo.startsWith('RESERVA')) { return '⌂'; }
    if (tipo.startsWith('PUBLICACION')) { return '◇'; }
    if (tipo.startsWith('USUARIO') || tipo.startsWith('CUENTA')) { return '○'; }
    return '✦';
  }

  fecha(texto: string | null): string {
    if (!texto) { return ''; }
    const valor = new Date(texto);
    if (isNaN(valor.getTime())) { return ''; }
    return valor.toLocaleString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
