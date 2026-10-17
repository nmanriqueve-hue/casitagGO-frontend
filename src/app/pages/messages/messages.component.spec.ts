// @vitest-environment jsdom
import '@angular/compiler';

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MessagesComponent } from './messages.component';
import { CatalogService } from '../../core/services/catalog.service';
import { ConversacionBack, MensajeBack, MensajesBackService } from '../../core/services/mensajes-back.service';
import { SessionService } from '../../core/services/session.service';
import { ToastService } from '../../core/services/toast.service';

try {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting()
  );
} catch (error) {
  if (
    !(error instanceof Error) ||
    !error.message.includes('already been initialized')
  ) {
    throw error;
  }
}

describe('MessagesComponent', () => {
  let component: MessagesComponent;
  let conversaciones: ReturnType<typeof vi.fn>;
  let conversacion: ReturnType<typeof vi.fn>;
  let enviar: ReturnType<typeof vi.fn>;
  let obtenerDetalle: ReturnType<typeof vi.fn>;
  let mostrarToast: ReturnType<typeof vi.fn>;

  const crearConversacion = (cambios: Partial<ConversacionBack> = {}): ConversacionBack => ({
    publicacionId: 'pub-1',
    huespedId: 'huesped-1',
    ultimoMensaje: 'Hola',
    fechaUltimoMensaje: '2026-10-16T10:00:00Z',
    tituloPublicacion: 'Apartamento en Chapinero',
    huespedNombre: 'Hugo Huesped',
    anfitrionNombre: 'Ana Anfitriona',
    ...cambios
  });

  const crearMensaje = (cambios: Partial<MensajeBack> = {}): MensajeBack => ({
    id: 'mensaje-1',
    creadoEn: '2026-10-16T10:00:00Z',
    publicacionId: 'pub-1',
    huespedId: 'huesped-1',
    emisorId: 'huesped-1',
    contenido: 'Hola',
    leido: false,
    ...cambios
  });

  const crearError = (status: number, error: unknown = null): HttpErrorResponse =>
    new HttpErrorResponse({ status, error });

  const crearComponente = (rol: 'guest' | 'host' = 'guest', alojamiento: string | null = null): void => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MensajesBackService, useValue: { conversaciones, conversacion, enviar } },
        { provide: CatalogService, useValue: { obtenerDetalle } },
        { provide: SessionService, useValue: { role: () => rol } },
        { provide: ToastService, useValue: { show: mostrarToast } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(alojamiento ? { alojamiento } : {}) } }
        }
      ]
    });

    component = TestBed.runInInjectionContext(() => new MessagesComponent());
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    conversaciones = vi.fn().mockReturnValue(of([]));
    conversacion = vi.fn().mockReturnValue(of([]));
    enviar = vi.fn();
    obtenerDetalle = vi.fn().mockReturnValue(of({ title: 'Casa en Suba' }));
    mostrarToast = vi.fn();
  });

  describe('Bandeja de conversaciones', () => {
    it('debe cargar las conversaciones y abrir la primera', () => {
      const lista = [crearConversacion(), crearConversacion({ publicacionId: 'pub-2' })];
      conversaciones.mockReturnValue(of(lista));

      crearComponente();

      expect(component.conversaciones()).toEqual(lista);
      expect(component.seleccionada()).toBe(lista[0]);
      expect(conversacion).toHaveBeenCalledWith('pub-1', 'huesped-1');
      expect(component.cargando()).toBe(false);
      expect(component.error()).toBe('');
    });

    it('debe quedar sin seleccion cuando no hay conversaciones', () => {
      crearComponente();

      expect(component.seleccionada()).toBeNull();
      expect(conversacion).not.toHaveBeenCalled();
    });

    it('debe avisar cuando no hay conexion con el servidor', () => {
      conversaciones.mockReturnValue(throwError(() => crearError(0)));

      crearComponente();

      expect(component.cargando()).toBe(false);
      expect(component.error()).toContain('No se pudo conectar');
    });

    it('debe mostrar el mensaje del back cuando es un error 400', () => {
      conversaciones.mockReturnValue(throwError(() => crearError(400, 'Mensaje del back')));

      crearComponente();

      expect(component.error()).toBe('Mensaje del back');
    });

    it('debe avisar que la sesion vencio cuando el back responde 403', () => {
      conversaciones.mockReturnValue(throwError(() => crearError(403)));

      crearComponente();

      expect(component.error()).toContain('Vuelve a iniciar');
    });

    it('debe mostrar un mensaje generico ante otro error', () => {
      conversaciones.mockReturnValue(throwError(() => crearError(500)));

      crearComponente();

      expect(component.error()).toContain('No se pudieron cargar tus conversaciones');
    });
  });

  describe('Llegada desde el detalle del alojamiento', () => {
    it('debe abrir la conversacion existente de esa publicacion', () => {
      const existente = crearConversacion({ publicacionId: 'pub-9' });
      conversaciones.mockReturnValue(of([crearConversacion(), existente]));

      crearComponente('guest', 'pub-9');

      expect(component.seleccionada()).toBe(existente);
      expect(obtenerDetalle).not.toHaveBeenCalled();
    });

    it('debe abrir una conversacion vacia con el titulo cuando no existe', () => {
      crearComponente('guest', 'pub-9');

      expect(obtenerDetalle).toHaveBeenCalledWith('pub-9');
      expect(component.seleccionada()?.publicacionId).toBe('pub-9');
      expect(component.seleccionada()?.huespedId).toBe('');
      expect(component.seleccionada()?.tituloPublicacion).toBe('Casa en Suba');
      expect(conversacion).not.toHaveBeenCalled();
    });

    it('debe avisar y abrir la primera si no se encuentra el alojamiento', () => {
      const primera = crearConversacion();
      conversaciones.mockReturnValue(of([primera]));
      obtenerDetalle.mockReturnValue(throwError(() => crearError(404)));

      crearComponente('guest', 'pub-9');

      expect(mostrarToast).toHaveBeenCalledWith(expect.stringContaining('No se encontr'), 'warning');
      expect(component.seleccionada()).toBe(primera);
    });

    it('debe ignorar el alojamiento cuando quien entra es el anfitrion', () => {
      const primera = crearConversacion();
      conversaciones.mockReturnValue(of([primera]));

      crearComponente('host', 'pub-9');

      expect(obtenerDetalle).not.toHaveBeenCalled();
      expect(component.seleccionada()).toBe(primera);
    });
  });

  describe('Roles y autores de los mensajes', () => {
    it('debe saber si quien entra es anfitrion', () => {
      crearComponente('host');

      expect(component.esAnfitrion()).toBe(true);
    });

    it('debe mostrarle al huesped el nombre del anfitrion', () => {
      crearComponente('guest');

      expect(component.otraPersona(crearConversacion())).toBe('Ana Anfitriona');
    });

    it('debe mostrarle al anfitrion el nombre del huesped', () => {
      crearComponente('host');

      expect(component.otraPersona(crearConversacion())).toBe('Hugo Huesped');
    });

    it('debe considerar mio el mensaje que escribio el huesped cuando entra un huesped', () => {
      crearComponente('guest');

      expect(component.esMio(crearMensaje({ emisorId: 'huesped-1' }))).toBe(true);
      expect(component.esMio(crearMensaje({ emisorId: 'anfitrion-1' }))).toBe(false);
    });

    it('debe considerar mio el mensaje del anfitrion cuando entra un anfitrion', () => {
      crearComponente('host');

      expect(component.esMio(crearMensaje({ emisorId: 'anfitrion-1' }))).toBe(true);
      expect(component.esMio(crearMensaje({ emisorId: 'huesped-1' }))).toBe(false);
    });

    it('debe mostrar Tu como autor de los mensajes propios', () => {
      crearComponente('guest');

      expect(component.autor(crearMensaje({ emisorId: 'huesped-1' }))).toBe('Tú');
    });

    it('debe mostrar el nombre del anfitrion como autor cuando entra un huesped', () => {
      conversaciones.mockReturnValue(of([crearConversacion()]));
      crearComponente('guest');

      expect(component.autor(crearMensaje({ emisorId: 'anfitrion-1' }))).toBe('Ana Anfitriona');
    });

    it('debe mostrar el nombre del huesped como autor cuando entra un anfitrion', () => {
      conversaciones.mockReturnValue(of([crearConversacion()]));
      crearComponente('host');

      expect(component.autor(crearMensaje({ emisorId: 'huesped-1' }))).toBe('Hugo Huesped');
    });

    it('debe usar un nombre generico si no hay conversacion elegida (huesped)', () => {
      crearComponente('guest');

      expect(component.autor(crearMensaje({ emisorId: 'anfitrion-1' }))).toBe('Anfitrión');
    });

    it('debe usar un nombre generico si no hay conversacion elegida (anfitrion)', () => {
      crearComponente('host');

      expect(component.autor(crearMensaje({ emisorId: 'huesped-1' }))).toBe('Huésped');
    });
  });

  describe('Seleccionar una conversacion', () => {
    it('debe cargar los mensajes de la conversacion', () => {
      const mensajes = [crearMensaje(), crearMensaje({ id: 'mensaje-2', emisorId: 'anfitrion-1' })];
      conversacion.mockReturnValue(of(mensajes));
      crearComponente();

      component.seleccionar(crearConversacion());

      expect(conversacion).toHaveBeenCalledWith('pub-1', 'huesped-1');
      expect(component.mensajes()).toEqual(mensajes);
      expect(component.cargandoMensajes()).toBe(false);
    });

    it('debe limpiar el borrador y los mensajes anteriores', () => {
      conversacion.mockReturnValue(new Subject());
      crearComponente();
      component.draft = 'Texto sin enviar';
      component.mensajes.set([crearMensaje()]);

      component.seleccionar(crearConversacion());

      expect(component.draft).toBe('');
      expect(component.mensajes()).toEqual([]);
      expect(component.cargandoMensajes()).toBe(true);
    });

    it('debe avisar si no se pueden cargar los mensajes', () => {
      conversacion.mockReturnValue(throwError(() => crearError(400, 'No tienes permiso para ver esta conversacion')));
      crearComponente();

      component.seleccionar(crearConversacion());

      expect(mostrarToast).toHaveBeenCalledWith('No tienes permiso para ver esta conversacion', 'warning');
      expect(component.cargandoMensajes()).toBe(false);
    });

    it('debe ignorar la respuesta de una conversacion que ya no esta elegida', () => {
      const primera = new Subject<MensajeBack[]>();
      const segunda = new Subject<MensajeBack[]>();
      conversacion.mockReturnValueOnce(primera).mockReturnValueOnce(segunda);
      crearComponente();

      component.seleccionar(crearConversacion({ publicacionId: 'pub-1' }));
      component.seleccionar(crearConversacion({ publicacionId: 'pub-2' }));
      primera.next([crearMensaje({ id: 'viejo' })]);

      expect(component.mensajes()).toEqual([]);

      const nuevo = crearMensaje({ id: 'nuevo' });
      segunda.next([nuevo]);

      expect(component.mensajes()).toEqual([nuevo]);
      expect(component.cargandoMensajes()).toBe(false);
    });
  });

  describe('Enviar mensajes', () => {
    it('debe enviar el mensaje recortado, agregarlo y recargar la bandeja', () => {
      const lista = [crearConversacion()];
      conversaciones.mockReturnValue(of(lista));
      const respuesta = crearMensaje({ id: 'enviado', contenido: 'Hola de nuevo' });
      enviar.mockReturnValue(of(respuesta));
      crearComponente();
      component.draft = '  Hola de nuevo  ';

      component.enviar();

      expect(enviar).toHaveBeenCalledWith('pub-1', 'Hola de nuevo', 'huesped-1');
      expect(component.mensajes()).toContain(respuesta);
      expect(component.draft).toBe('');
      expect(component.enviando()).toBe(false);
      expect(conversaciones).toHaveBeenCalledTimes(2);
    });

    it('debe tomar el huesped de la respuesta cuando la conversacion es nueva', () => {
      enviar.mockReturnValue(of(crearMensaje({ huespedId: 'huesped-nuevo' })));
      crearComponente('guest', 'pub-9');
      component.draft = 'Primer mensaje';

      component.enviar();

      expect(enviar).toHaveBeenCalledWith('pub-9', 'Primer mensaje', undefined);
      expect(component.seleccionada()?.huespedId).toBe('huesped-nuevo');
    });

    it('no debe enviar si no hay una conversacion elegida', () => {
      crearComponente();
      component.draft = 'Hola';

      component.enviar();

      expect(enviar).not.toHaveBeenCalled();
    });

    it('no debe enviar un mensaje vacio', () => {
      conversaciones.mockReturnValue(of([crearConversacion()]));
      crearComponente();
      component.draft = '   ';

      component.enviar();

      expect(enviar).not.toHaveBeenCalled();
    });

    it('no debe enviar dos veces mientras hay un envio en curso', () => {
      conversaciones.mockReturnValue(of([crearConversacion()]));
      enviar.mockReturnValue(new Subject());
      crearComponente();
      component.draft = 'Hola';

      component.enviar();
      component.enviar();

      expect(enviar).toHaveBeenCalledTimes(1);
      expect(component.enviando()).toBe(true);
    });

    it('debe mostrar el mensaje del back y conservar el borrador si falla', () => {
      conversaciones.mockReturnValue(of([crearConversacion()]));
      enviar.mockReturnValue(throwError(() => crearError(400, 'Solo el propietario puede responder')));
      crearComponente();
      component.draft = 'Hola';

      component.enviar();

      expect(mostrarToast).toHaveBeenCalledWith('Solo el propietario puede responder', 'warning');
      expect(component.draft).toBe('Hola');
      expect(component.enviando()).toBe(false);
    });

    it('debe mostrar un aviso generico ante otro error', () => {
      conversaciones.mockReturnValue(of([crearConversacion()]));
      enviar.mockReturnValue(throwError(() => crearError(500)));
      crearComponente();
      component.draft = 'Hola';

      component.enviar();

      expect(mostrarToast).toHaveBeenCalledWith(expect.stringContaining('No se pudo enviar'), 'warning');
    });
  });
});
