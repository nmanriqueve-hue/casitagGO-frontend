import { FieldValidationDirective } from '../../shared/field-validation.directive';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogService } from '../../core/services/catalog.service';
import { ConversacionBack, MensajeBack, MensajesBackService } from '../../core/services/mensajes-back.service';
import { SessionService } from '../../core/services/session.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ selector: 'app-messages', imports: [FieldValidationDirective, FormsModule, DatePipe, RouterLink], templateUrl: './messages.component.html', styleUrl: './messages.component.css' })
export class MessagesComponent {
  private readonly api = inject(MensajesBackService);
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService);
  private readonly alojamiento = inject(ActivatedRoute).snapshot.queryParamMap.get('alojamiento');
  readonly session = inject(SessionService);

  readonly conversaciones = signal<ConversacionBack[]>([]);
  readonly seleccionada = signal<ConversacionBack | null>(null);
  readonly mensajes = signal<MensajeBack[]>([]);
  readonly cargando = signal(true);
  readonly cargandoMensajes = signal(false);
  readonly enviando = signal(false);
  readonly error = signal('');
  draft = '';

  constructor() {
    this.cargarBandeja(true);
  }

  esAnfitrion(): boolean {
    return this.session.role() === 'host';
  }

  clave(conversacion: ConversacionBack): string {
    return `${conversacion.publicacionId}|${conversacion.huespedId}`;
  }

  esSeleccionada(conversacion: ConversacionBack): boolean {
    const actual = this.seleccionada();
    return actual !== null && this.clave(actual) === this.clave(conversacion);
  }

  otraPersona(conversacion: ConversacionBack): string {
    return this.esAnfitrion() ? conversacion.huespedNombre : conversacion.anfitrionNombre;
  }

  esMio(mensaje: MensajeBack): boolean {
    const delHuesped = mensaje.emisorId === mensaje.huespedId;
    return this.esAnfitrion() ? !delHuesped : delHuesped;
  }

  autor(mensaje: MensajeBack): string {
    if (this.esMio(mensaje)) { return 'Tú'; }
    const conversacion = this.seleccionada();
    if (this.esAnfitrion()) { return conversacion?.huespedNombre || 'Huésped'; }
    return conversacion?.anfitrionNombre || 'Anfitrión';
  }

  seleccionar(conversacion: ConversacionBack): void {
    this.seleccionada.set(conversacion);
    this.draft = '';
    this.mensajes.set([]);
    if (!conversacion.huespedId) { return; }
    this.cargandoMensajes.set(true);
    this.api.conversacion(conversacion.publicacionId, conversacion.huespedId).subscribe({
      next: (lista) => {
        if (this.seleccionada() !== conversacion) { return; }
        this.mensajes.set(lista);
        this.cargandoMensajes.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargandoMensajes.set(false);
        this.toast.show(this.mensajeDeError(error, 'No se pudo cargar la conversación. Intenta de nuevo.'), 'warning');
      }
    });
  }

  enviar(): void {
    const conversacion = this.seleccionada();
    const texto = this.draft.trim();
    if (!conversacion || !texto || this.enviando()) { return; }
    this.enviando.set(true);
    this.api.enviar(conversacion.publicacionId, texto, conversacion.huespedId || undefined).subscribe({
      next: (mensaje) => {
        this.enviando.set(false);
        this.draft = '';
        if (!conversacion.huespedId) {
          this.seleccionada.set({ ...conversacion, huespedId: mensaje.huespedId });
        }
        this.mensajes.update((actual) => [...actual, mensaje]);
        this.cargarBandeja(false);
      },
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        this.toast.show(this.mensajeDeError(error, 'No se pudo enviar el mensaje. Intenta de nuevo.'), 'warning');
      }
    });
  }

  private cargarBandeja(inicial: boolean): void {
    this.api.conversaciones().subscribe({
      next: (lista) => {
        this.conversaciones.set(lista);
        this.error.set('');
        this.cargando.set(false);
        if (inicial) { this.elegirInicial(lista); }
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(this.mensajeDeError(error, 'No se pudieron cargar tus conversaciones. Intenta de nuevo.'));
      }
    });
  }

  private elegirInicial(lista: ConversacionBack[]): void {
    const uuid = this.alojamiento;
    if (uuid && !this.esAnfitrion()) {
      const existente = lista.find((conversacion) => conversacion.publicacionId === uuid);
      if (existente) {
        this.seleccionar(existente);
        return;
      }
      this.catalog.obtenerDetalle(uuid).subscribe({
        next: (publicacion) => this.seleccionar(this.nueva(uuid, publicacion.title)),
        error: () => {
          this.toast.show('No se encontró el alojamiento para iniciar la conversación.', 'warning');
          if (lista.length > 0) { this.seleccionar(lista[0]); }
        }
      });
      return;
    }
    if (lista.length > 0) { this.seleccionar(lista[0]); }
  }

  private nueva(publicacionId: string, titulo: string): ConversacionBack {
    return { publicacionId, huespedId: '', ultimoMensaje: '', fechaUltimoMensaje: null, tituloPublicacion: titulo, huespedNombre: '', anfitrionNombre: '' };
  }

  private mensajeDeError(error: HttpErrorResponse, porDefecto: string): string {
    if (error.status === 0) { return 'No se pudo conectar con el servidor. Revisa que el back esté corriendo.'; }
    if (error.status === 400 && typeof error.error === 'string' && error.error !== '') { return error.error; }
    if (error.status === 401 || error.status === 403) { return 'Tu sesión venció o los datos no son válidos. Vuelve a iniciar sesión.'; }
    return porDefecto;
  }
}
