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
import { AvisoMensaje, EventosService } from '../../core/services/eventos.service';
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

describe('MessagesComponent - chat en vivo', () => {
  let component: MessagesComponent;
  let conversaciones: ReturnType<typeof vi.fn>;
  let conversacion: ReturnType<typeof vi.fn>;
  let mostrarToast: ReturnType<typeof vi.fn>;
  let avisos: Subject<AvisoMensaje>;

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

  const crearComponente = (rol: 'guest' | 'host' = 'guest'): void => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MensajesBackService, useValue: { conversaciones, conversacion, enviar: vi.fn() } },
        { provide: CatalogService, useValue: { obtenerDetalle: vi.fn() } },
        { provide: SessionService, useValue: { role: () => rol } },
        { provide: ToastService, useValue: { show: mostrarToast } },
        { provide: EventosService, useValue: { mensajes: avisos } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } }
        }
      ]
    });

    component = TestBed.runInInjectionContext(() => new MessagesComponent());
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    conversaciones = vi.fn().mockReturnValue(of([]));
    conversacion = vi.fn().mockReturnValue(of([]));
    mostrarToast = vi.fn();
    avisos = new Subject<AvisoMensaje>();
  });

  it('recarga la bandeja y los mensajes cuando llega un aviso de la conversacion abierta', () => {
    conversaciones.mockReturnValue(of([crearConversacion()]));
    const nuevos = [crearMensaje(), crearMensaje({ id: 'mensaje-2', contenido: 'Hola de nuevo' })];
    conversacion.mockReturnValueOnce(of([crearMensaje()])).mockReturnValueOnce(of(nuevos));
    crearComponente();
    expect(component.mensajes()).toHaveLength(1);

    avisos.next({ publicacionId: 'pub-1', huespedId: 'huesped-1' });

    expect(conversaciones).toHaveBeenCalledTimes(2);
    expect(conversacion).toHaveBeenCalledTimes(2);
    expect(conversacion).toHaveBeenLastCalledWith('pub-1', 'huesped-1');
    expect(component.mensajes()).toEqual(nuevos);
    expect(mostrarToast).not.toHaveBeenCalled();
  });

  it('el anfitrion tambien recibe en vivo los mensajes de su huesped', () => {
    conversaciones.mockReturnValue(of([crearConversacion()]));
    const nuevos = [crearMensaje({ contenido: 'Pregunta del huesped' })];
    conversacion.mockReturnValueOnce(of([])).mockReturnValueOnce(of(nuevos));
    crearComponente('host');

    avisos.next({ publicacionId: 'pub-1', huespedId: 'huesped-1' });

    expect(component.mensajes()).toEqual(nuevos);
  });

  it.each([
    ['otra publicacion', { publicacionId: 'pub-2', huespedId: 'huesped-1' }],
    ['otro huesped de la misma publicacion', { publicacionId: 'pub-1', huespedId: 'huesped-2' }]
  ])('avisa con un mensaje emergente cuando el aviso es de %s', (_nombre, aviso) => {
    conversaciones.mockReturnValue(of([crearConversacion()]));
    crearComponente();

    avisos.next(aviso);

    expect(conversaciones).toHaveBeenCalledTimes(2);
    expect(conversacion).toHaveBeenCalledTimes(1);
    expect(mostrarToast).toHaveBeenCalledWith('Tienes un mensaje nuevo.', 'info');
  });

  it('sin conversacion abierta recarga la bandeja y avisa', () => {
    crearComponente();
    expect(component.seleccionada()).toBeNull();

    avisos.next({ publicacionId: 'pub-1', huespedId: 'huesped-1' });

    expect(conversaciones).toHaveBeenCalledTimes(2);
    expect(conversacion).not.toHaveBeenCalled();
    expect(mostrarToast).toHaveBeenCalledWith('Tienes un mensaje nuevo.', 'info');
  });

  it('muestra el mensaje del back cuando no se puede actualizar la conversacion abierta', () => {
    conversaciones.mockReturnValue(of([crearConversacion()]));
    conversacion
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(throwError(() => crearError(400, 'No tienes permiso para ver esta conversacion')));
    crearComponente();

    avisos.next({ publicacionId: 'pub-1', huespedId: 'huesped-1' });

    expect(mostrarToast).toHaveBeenCalledWith('No tienes permiso para ver esta conversacion', 'warning');
  });

  it('usa un mensaje por defecto cuando falla la actualizacion por otro motivo', () => {
    conversaciones.mockReturnValue(of([crearConversacion()]));
    conversacion
      .mockReturnValueOnce(of([]))
      .mockReturnValueOnce(throwError(() => crearError(500)));
    crearComponente();

    avisos.next({ publicacionId: 'pub-1', huespedId: 'huesped-1' });

    expect(mostrarToast).toHaveBeenCalledWith(expect.stringContaining('No se pudo actualizar'), 'warning');
  });

  it('descarta la actualizacion si mientras tanto se abrio otra conversacion', () => {
    const lista = [crearConversacion(), crearConversacion({ publicacionId: 'pub-2' })];
    conversaciones.mockReturnValue(of(lista));
    const pendiente = new Subject<MensajeBack[]>();
    conversacion
      .mockReturnValueOnce(of([crearMensaje()]))
      .mockReturnValueOnce(pendiente.asObservable())
      .mockReturnValueOnce(of([crearMensaje({ id: 'otro', publicacionId: 'pub-2' })]));
    crearComponente();

    avisos.next({ publicacionId: 'pub-1', huespedId: 'huesped-1' });
    component.seleccionar(lista[1]);
    pendiente.next([crearMensaje({ id: 'tarde' })]);

    expect(component.mensajes().map((mensaje) => mensaje.id)).toEqual(['otro']);
  });
});
