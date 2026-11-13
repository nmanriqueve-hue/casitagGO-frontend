import { Injectable, effect, inject, untracked } from '@angular/core';
import { API_URL } from '../config/api.config';
import { NotificacionesBackService } from './notificaciones-back.service';
import { SessionService } from './session.service';
import { ToastService } from './toast.service';

const CLAVE_TOKEN = 'casitago_token';
const ESPERA_INICIAL_MS = 2000;
const ESPERA_MAXIMA_MS = 30000;

interface LectorDeFlujo {
  read(): Promise<{ done: boolean; value?: Uint8Array }>;
}

// Canal de eventos en vivo (SSE). Se usa fetch y no EventSource porque este último no permite
// mandar el token en una cabecera. Si la conexión se corta (o el back la cierra a los 25 minutos),
// reintenta con una espera creciente; si el back responde 401 o 403 (token vencido), deja de reintentar.
@Injectable({ providedIn: 'root' })
export class EventosService {
  private readonly session = inject(SessionService);
  private readonly notificaciones = inject(NotificacionesBackService);
  private readonly toast = inject(ToastService);

  private activo = false;
  private token: string | null = null;
  private controlador: AbortController | null = null;
  private temporizador?: ReturnType<typeof setTimeout>;
  private espera = ESPERA_INICIAL_MS;
  private reconectando = false;

  constructor() {
    effect(() => {
      const usuario = this.session.currentUser();
      untracked(() => {
        if (usuario) {
          this.iniciar();
        } else {
          this.detener();
        }
      });
    });
  }

  iniciar(): void {
    const token = localStorage.getItem(CLAVE_TOKEN);
    if (!token) {
      this.detener();
      return;
    }
    if (this.activo && this.token === token) {
      return;
    }
    this.detener();
    this.activo = true;
    this.token = token;
    this.espera = ESPERA_INICIAL_MS;
    void this.conectar(token);
  }

  detener(): void {
    this.activo = false;
    this.token = null;
    this.reconectando = false;
    clearTimeout(this.temporizador);
    this.controlador?.abort();
    this.controlador = null;
  }

  private async conectar(token: string): Promise<void> {
    const controlador = new AbortController();
    this.controlador = controlador;
    let reintentar = true;
    try {
      const respuesta = await fetch(`${API_URL}/api/eventos`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: controlador.signal
      });
      if (respuesta.status === 401 || respuesta.status === 403) {
        reintentar = false;
        this.activo = false;
      } else if (respuesta.ok && respuesta.body) {
        this.espera = ESPERA_INICIAL_MS;
        await this.leer(respuesta.body.getReader());
      }
    } catch {
      // Corte de red o conexión cancelada: abajo se decide si se reintenta.
    }
    if (reintentar && this.activo && this.controlador === controlador) {
      this.programarReconexion(token);
    }
  }

  private programarReconexion(token: string): void {
    this.reconectando = true;
    this.temporizador = setTimeout(() => void this.conectar(token), this.espera);
    this.espera = Math.min(this.espera * 2, ESPERA_MAXIMA_MS);
  }

  private async leer(lector: LectorDeFlujo): Promise<void> {
    const decodificador = new TextDecoder();
    let pendiente = '';
    let lectura = await lector.read();
    while (!lectura.done) {
      pendiente += decodificador.decode(lectura.value, { stream: true });
      const bloques = pendiente.replace(/\r\n/g, '\n').split('\n\n');
      pendiente = bloques.pop() ?? '';
      for (const bloque of bloques) {
        this.atender(bloque);
      }
      lectura = await lector.read();
    }
  }

  private atender(bloque: string): void {
    let tipo = 'message';
    const datos: string[] = [];
    for (const linea of bloque.split('\n')) {
      if (linea.startsWith('event:')) {
        tipo = linea.slice(6).trim();
      } else if (linea.startsWith('data:')) {
        datos.push(linea.slice(5).trim());
      }
    }
    this.despachar(tipo, datos.join('\n'));
  }

  private despachar(tipo: string, datos: string): void {
    if (tipo === 'conectado') {
      // Tras una reconexión se vuelve a pedir la lista, para no perder lo que llegó mientras tanto.
      if (this.reconectando) {
        this.reconectando = false;
        this.notificaciones.cargar();
      }
      return;
    }
    if (tipo === 'notificacion') {
      this.alRecibirNotificacion(datos);
    }
  }

  private alRecibirNotificacion(datos: string): void {
    this.notificaciones.cargar();
    const mensaje = this.extraerMensaje(datos);
    if (mensaje) {
      this.toast.show(mensaje, 'info');
    }
  }

  private extraerMensaje(datos: string): string {
    try {
      const aviso = JSON.parse(datos) as { mensaje?: unknown };
      return typeof aviso.mensaje === 'string' ? aviso.mensaje : '';
    } catch {
      return '';
    }
  }
}
