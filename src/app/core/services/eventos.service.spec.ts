// @vitest-environment jsdom
import '@angular/compiler';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EventosService } from './eventos.service';
import { NotificacionesBackService } from './notificaciones-back.service';
import { SessionService } from './session.service';
import { ToastService } from './toast.service';
import { API_URL } from '../config/api.config';

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

describe('EventosService', () => {
  let service: EventosService;
  let fetchSimulado: ReturnType<typeof vi.fn>;
  let cargarNotificaciones: ReturnType<typeof vi.fn>;
  let mostrarAviso: ReturnType<typeof vi.fn>;
  let usuarioActual: ReturnType<typeof signal<{ id: string } | null>>;

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

  const avanzar = (milisegundos: number) => vi.advanceTimersByTimeAsync(milisegundos);

  const iniciarConToken = async (token = 'token-1') => {
    localStorage.setItem('casitago_token', token);
    service.iniciar();
    await avanzar(0);
  };

  const senalDeLaLlamada = (numero: number): AbortSignal => fetchSimulado.mock.calls[numero][1].signal;

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.useFakeTimers();
    localStorage.clear();

    fetchSimulado = vi.fn().mockResolvedValue(respuestaConFlujo([]));
    vi.stubGlobal('fetch', fetchSimulado);
    cargarNotificaciones = vi.fn();
    mostrarAviso = vi.fn();
    usuarioActual = signal<{ id: string } | null>(null);

    TestBed.configureTestingModule({
      providers: [
        EventosService,
        { provide: SessionService, useValue: { currentUser: usuarioActual } },
        { provide: NotificacionesBackService, useValue: { cargar: cargarNotificaciones } },
        { provide: ToastService, useValue: { show: mostrarAviso } }
      ]
    });

    service = TestBed.inject(EventosService);
    TestBed.flushEffects();
  });

  afterEach(() => {
    service.detener();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  describe('Inicio del canal', () => {
    it('no abre el canal si no hay token guardado', async () => {
      service.iniciar();
      await avanzar(0);

      expect(fetchSimulado).not.toHaveBeenCalled();
    });

    it('abre el canal con el token en la cabecera', async () => {
      await iniciarConToken('token-abc');

      expect(fetchSimulado).toHaveBeenCalledTimes(1);
      const [url, opciones] = fetchSimulado.mock.calls[0];
      expect(url).toBe(`${API_URL}/api/eventos`);
      expect(opciones.headers).toEqual({ Authorization: 'Bearer token-abc', Accept: 'text/event-stream' });
    });

    it('no abre una segunda conexion si ya esta activo con el mismo token', async () => {
      await iniciarConToken();

      service.iniciar();
      await avanzar(0);

      expect(fetchSimulado).toHaveBeenCalledTimes(1);
    });

    it('abre una conexion nueva y cierra la anterior si cambia el token', async () => {
      await iniciarConToken('token-1');
      const primera = senalDeLaLlamada(0);

      await iniciarConToken('token-2');

      expect(fetchSimulado).toHaveBeenCalledTimes(2);
      expect(primera.aborted).toBe(true);
      expect(fetchSimulado.mock.calls[1][1].headers.Authorization).toBe('Bearer token-2');
    });

    it('se detiene si el token ya no esta guardado', async () => {
      await iniciarConToken();
      const senal = senalDeLaLlamada(0);
      localStorage.removeItem('casitago_token');

      service.iniciar();
      await avanzar(60000);

      expect(senal.aborted).toBe(true);
      expect(fetchSimulado).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cierre del canal', () => {
    it('cancela la conexion y no reintenta', async () => {
      await iniciarConToken();
      const senal = senalDeLaLlamada(0);

      service.detener();
      await avanzar(60000);

      expect(senal.aborted).toBe(true);
      expect(fetchSimulado).toHaveBeenCalledTimes(1);
    });

    it('detener sin conexion abierta no falla', () => {
      expect(() => service.detener()).not.toThrow();
    });
  });

  describe('Avisos que llegan', () => {
    it('una notificacion recarga la lista y muestra el aviso', async () => {
      fetchSimulado.mockResolvedValue(respuestaConFlujo([
        'event:notificacion\ndata:{"tipoEvento":"RESERVA_CONFIRMADA","mensaje":"Tienes una nueva reserva"}\n\n'
      ]));

      await iniciarConToken();

      expect(cargarNotificaciones).toHaveBeenCalledTimes(1);
      expect(mostrarAviso).toHaveBeenCalledWith('Tienes una nueva reserva', 'info');
    });

    it('arma el aviso cuando llega partido en varios trozos', async () => {
      fetchSimulado.mockResolvedValue(respuestaConFlujo([
        'event:notific',
        'acion\ndata:{"mensaje":"Hola"}\n',
        '\n'
      ]));

      await iniciarConToken();

      expect(mostrarAviso).toHaveBeenCalledWith('Hola', 'info');
    });

    it('entiende los saltos de linea de tipo CRLF', async () => {
      fetchSimulado.mockResolvedValue(respuestaConFlujo([
        'event:notificacion\r\ndata:{"mensaje":"Con CRLF"}\r\n\r\n'
      ]));

      await iniciarConToken();

      expect(mostrarAviso).toHaveBeenCalledWith('Con CRLF', 'info');
    });

    it('atiende varios avisos en un mismo trozo e ignora el latido', async () => {
      fetchSimulado.mockResolvedValue(respuestaConFlujo([
        'event:conectado\ndata:ok\n\n'
        + 'event:notificacion\ndata:{"mensaje":"Uno"}\n\n'
        + ':latido\n\n'
        + 'event:notificacion\ndata:{"mensaje":"Dos"}\n\n'
      ]));

      await iniciarConToken();

      expect(mostrarAviso).toHaveBeenCalledTimes(2);
      expect(mostrarAviso).toHaveBeenNthCalledWith(1, 'Uno', 'info');
      expect(mostrarAviso).toHaveBeenNthCalledWith(2, 'Dos', 'info');
      expect(cargarNotificaciones).toHaveBeenCalledTimes(2);
    });

    it('junta los datos cuando vienen en varias lineas', async () => {
      fetchSimulado.mockResolvedValue(respuestaConFlujo([
        'event:notificacion\ndata:{"mensaje":\ndata:"Partido"}\n\n'
      ]));

      await iniciarConToken();

      expect(mostrarAviso).toHaveBeenCalledWith('Partido', 'info');
    });

    it('si los datos no son JSON valido recarga la lista pero no muestra aviso', async () => {
      fetchSimulado.mockResolvedValue(respuestaConFlujo([
        'event:notificacion\ndata:esto-no-es-json\n\n'
      ]));

      await iniciarConToken();

      expect(cargarNotificaciones).toHaveBeenCalledTimes(1);
      expect(mostrarAviso).not.toHaveBeenCalled();
    });

    it('si los datos no traen mensaje no muestra aviso', async () => {
      fetchSimulado.mockResolvedValue(respuestaConFlujo([
        'event:notificacion\ndata:{"tipoEvento":"RESERVA_CONFIRMADA"}\n\n'
      ]));

      await iniciarConToken();

      expect(cargarNotificaciones).toHaveBeenCalledTimes(1);
      expect(mostrarAviso).not.toHaveBeenCalled();
    });

    it('si el mensaje no es texto no muestra aviso', async () => {
      fetchSimulado.mockResolvedValue(respuestaConFlujo([
        'event:notificacion\ndata:{"mensaje":5}\n\n'
      ]));

      await iniciarConToken();

      expect(mostrarAviso).not.toHaveBeenCalled();
    });

    it('ignora los avisos de mensajes de chat (se usan en otra pantalla)', async () => {
      fetchSimulado.mockResolvedValue(respuestaConFlujo([
        'event:mensaje\ndata:{"publicacionId":"p1","huespedId":"h1"}\n\n'
      ]));

      await iniciarConToken();

      expect(cargarNotificaciones).not.toHaveBeenCalled();
      expect(mostrarAviso).not.toHaveBeenCalled();
    });

    it('el evento de conexion de la primera vez no recarga la lista', async () => {
      fetchSimulado.mockResolvedValue(respuestaConFlujo([
        'event:conectado\ndata:ok\n\n'
      ]));

      await iniciarConToken();

      expect(cargarNotificaciones).not.toHaveBeenCalled();
    });
  });

  describe('Reconexion', () => {
    it.each([401, 403])('si el back responde %i no reintenta', async (estado) => {
      fetchSimulado.mockResolvedValue({ ok: false, status: estado });

      await iniciarConToken();
      await avanzar(120000);

      expect(fetchSimulado).toHaveBeenCalledTimes(1);
    });

    it('si se corta la red reintenta a los 2 segundos', async () => {
      fetchSimulado.mockRejectedValue(new Error('red'));

      await iniciarConToken();
      expect(fetchSimulado).toHaveBeenCalledTimes(1);

      await avanzar(1999);
      expect(fetchSimulado).toHaveBeenCalledTimes(1);

      await avanzar(1);
      expect(fetchSimulado).toHaveBeenCalledTimes(2);
    });

    it('la espera crece en cada intento hasta un maximo de 30 segundos', async () => {
      fetchSimulado.mockRejectedValue(new Error('red'));
      await iniciarConToken();
      let llamadas = 1;

      for (const espera of [2000, 4000, 8000, 16000, 30000, 30000]) {
        await avanzar(espera - 1);
        expect(fetchSimulado).toHaveBeenCalledTimes(llamadas);
        await avanzar(1);
        llamadas++;
        expect(fetchSimulado).toHaveBeenCalledTimes(llamadas);
      }
    });

    it('tras una conexion correcta la espera vuelve a 2 segundos', async () => {
      fetchSimulado
        .mockRejectedValueOnce(new Error('red'))
        .mockResolvedValue(respuestaConFlujo([]));

      await iniciarConToken();
      await avanzar(2000);
      expect(fetchSimulado).toHaveBeenCalledTimes(2);

      await avanzar(1999);
      expect(fetchSimulado).toHaveBeenCalledTimes(2);

      await avanzar(1);
      expect(fetchSimulado).toHaveBeenCalledTimes(3);
    });

    it('al reconectar recarga la lista para no perder avisos', async () => {
      fetchSimulado
        .mockRejectedValueOnce(new Error('red'))
        .mockResolvedValue(respuestaConFlujo(['event:conectado\ndata:ok\n\n']));

      await iniciarConToken();
      expect(cargarNotificaciones).not.toHaveBeenCalled();

      await avanzar(2000);

      expect(cargarNotificaciones).toHaveBeenCalledTimes(1);
    });

    it('si la respuesta no trae cuerpo reintenta', async () => {
      fetchSimulado.mockResolvedValue({ ok: true, status: 200, body: null });

      await iniciarConToken();
      await avanzar(2000);

      expect(fetchSimulado).toHaveBeenCalledTimes(2);
    });

    it('si el back cierra el canal reintenta', async () => {
      await iniciarConToken();
      expect(fetchSimulado).toHaveBeenCalledTimes(1);

      await avanzar(2000);

      expect(fetchSimulado).toHaveBeenCalledTimes(2);
    });

    it('si se detiene mientras lee no vuelve a conectar', async () => {
      let terminarLectura: () => void = () => undefined;
      const lector = {
        read: () => new Promise<{ done: boolean; value?: Uint8Array }>((resolver) => {
          terminarLectura = () => resolver({ done: true });
        })
      };
      fetchSimulado.mockResolvedValue({ ok: true, status: 200, body: { getReader: () => lector } });

      await iniciarConToken();
      service.detener();
      terminarLectura();
      await avanzar(60000);

      expect(fetchSimulado).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sesion', () => {
    it('abre el canal cuando se inicia sesion', async () => {
      localStorage.setItem('casitago_token', 'token-1');

      usuarioActual.set({ id: 'usuario-1' });
      TestBed.flushEffects();
      await avanzar(0);

      expect(fetchSimulado).toHaveBeenCalledTimes(1);
    });

    it('cierra el canal cuando se cierra la sesion', async () => {
      localStorage.setItem('casitago_token', 'token-1');
      usuarioActual.set({ id: 'usuario-1' });
      TestBed.flushEffects();
      await avanzar(0);
      const senal = senalDeLaLlamada(0);

      usuarioActual.set(null);
      TestBed.flushEffects();

      expect(senal.aborted).toBe(true);
    });
  });
});
