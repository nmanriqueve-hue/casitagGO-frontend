// @vitest-environment jsdom
import '@angular/compiler';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AvisoMensaje, EventosService } from './eventos.service';
import { NotificacionesBackService } from './notificaciones-back.service';
import { SessionService } from './session.service';
import { ToastService } from './toast.service';

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

describe('EventosService - avisos de mensajes de chat', () => {
  let service: EventosService;
  let fetchSimulado: ReturnType<typeof vi.fn>;
  let cargarNotificaciones: ReturnType<typeof vi.fn>;
  let mostrarAviso: ReturnType<typeof vi.fn>;
  let recibidos: AvisoMensaje[];

  const codificador = new TextEncoder();

  const crearLector = (trozos: string[]) => {
    let posicion = 0;
    return {
      read: vi.fn(async () => {
        if (posicion < trozos.length) {
          const valor = codificador.encode(trozos[posicion]);
          posicion++;
          return { done: false, value: valor };
        }
        return { done: true, value: undefined };
      })
    };
  };

  const respuestaConFlujo = (trozos: string[]) => ({
    ok: true,
    status: 200,
    body: { getReader: () => crearLector(trozos) }
  });

  const recibir = async (trozos: string[]) => {
    fetchSimulado.mockResolvedValue(respuestaConFlujo(trozos));
    localStorage.setItem('casitago_token', 'token-1');
    service.iniciar();
    await vi.advanceTimersByTimeAsync(0);
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.useFakeTimers();
    localStorage.clear();

    fetchSimulado = vi.fn();
    vi.stubGlobal('fetch', fetchSimulado);
    cargarNotificaciones = vi.fn();
    mostrarAviso = vi.fn();
    recibidos = [];

    TestBed.configureTestingModule({
      providers: [
        EventosService,
        { provide: SessionService, useValue: { currentUser: signal(null) } },
        { provide: NotificacionesBackService, useValue: { cargar: cargarNotificaciones } },
        { provide: ToastService, useValue: { show: mostrarAviso } }
      ]
    });

    service = TestBed.inject(EventosService);
    TestBed.flushEffects();
    service.mensajes.subscribe((aviso) => recibidos.push(aviso));
  });

  afterEach(() => {
    service.detener();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('reenvia el aviso con la publicacion y el huesped, sin recargar ni avisar', async () => {
    await recibir(['event:mensaje\ndata:{"publicacionId":"pub-1","huespedId":"huesped-1"}\n\n']);

    expect(recibidos).toEqual([{ publicacionId: 'pub-1', huespedId: 'huesped-1' }]);
    expect(cargarNotificaciones).not.toHaveBeenCalled();
    expect(mostrarAviso).not.toHaveBeenCalled();
  });

  it('reenvia varios avisos seguidos en el orden en que llegan', async () => {
    await recibir([
      'event:mensaje\ndata:{"publicacionId":"pub-1","huespedId":"huesped-1"}\n\n'
      + 'event:mensaje\ndata:{"publicacionId":"pub-2","huespedId":"huesped-2"}\n\n'
    ]);

    expect(recibidos).toEqual([
      { publicacionId: 'pub-1', huespedId: 'huesped-1' },
      { publicacionId: 'pub-2', huespedId: 'huesped-2' }
    ]);
  });

  it('ignora un aviso cuyos datos no son JSON valido', async () => {
    await recibir(['event:mensaje\ndata:esto-no-es-json\n\n']);

    expect(recibidos).toEqual([]);
  });

  it('ignora un aviso al que le falta el huesped', async () => {
    await recibir(['event:mensaje\ndata:{"publicacionId":"pub-1"}\n\n']);

    expect(recibidos).toEqual([]);
  });

  it('ignora un aviso cuyos datos no son texto', async () => {
    await recibir(['event:mensaje\ndata:{"publicacionId":1,"huespedId":2}\n\n']);

    expect(recibidos).toEqual([]);
  });

  it('una notificacion no se reenvia como aviso de mensaje', async () => {
    await recibir(['event:notificacion\ndata:{"mensaje":"Reserva confirmada"}\n\n']);

    expect(recibidos).toEqual([]);
    expect(mostrarAviso).toHaveBeenCalledWith('Reserva confirmada', 'info');
  });
});
