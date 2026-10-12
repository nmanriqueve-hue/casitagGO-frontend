
// @vitest-environment jsdom
import '@angular/compiler';

import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import {
  HttpRequest,
  HttpResponse,
  HttpHandlerFn
} from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { authInterceptor } from './auth.interceptor';
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

describe('authInterceptor', () => {
  let next: ReturnType<typeof vi.fn>;
  let getItemSpy: ReturnType<typeof vi.spyOn>;

  const crearRequest = (
    metodo = 'GET',
    url = `${API_URL}/api/reservas`,
    body: unknown = null
  ) => new HttpRequest(metodo, url, body);

  const ejecutarInterceptor = (
    request: HttpRequest<unknown>
  ) =>
    TestBed.runInInjectionContext(() =>
      authInterceptor(request, next as HttpHandlerFn)
    );

  const requestEnviado = (): HttpRequest<unknown> =>
    next.mock.calls[0][0] as HttpRequest<unknown>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    localStorage.clear();

    next = vi.fn().mockImplementation((request: HttpRequest<unknown>) =>
      of(new HttpResponse({
        status: 200,
        body: { ok: true },
        url: request.url
      }))
    );

    getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
  });

  afterEach(() => {
    getItemSpy.mockRestore();
    localStorage.clear();
  });

  describe('Token de autenticación', () => {
    it('debe agregar el token cuando existe una sesión', async () => {
      localStorage.setItem('casitago_token', 'token-123');

      await firstValueFrom(ejecutarInterceptor(crearRequest()));

      expect(requestEnviado().headers.get('Authorization'))
        .toBe('Bearer token-123');
    });

    it('debe utilizar el formato Bearer', async () => {
      localStorage.setItem('casitago_token', 'abc123');

      await firstValueFrom(ejecutarInterceptor(crearRequest()));

      expect(requestEnviado().headers.get('Authorization'))
        .toMatch(/^Bearer /);
    });

    it('debe utilizar el token almacenado', async () => {
      localStorage.setItem('casitago_token', 'mi-token-seguro');

      await firstValueFrom(ejecutarInterceptor(crearRequest()));

      expect(requestEnviado().headers.get('Authorization'))
        .toBe('Bearer mi-token-seguro');
    });

    it('debe consultar la clave correcta de localStorage', async () => {
      await firstValueFrom(ejecutarInterceptor(crearRequest()));

      expect(getItemSpy).toHaveBeenCalledWith('casitago_token');
    });

    it('debe consultar localStorage una sola vez', async () => {
      await firstValueFrom(ejecutarInterceptor(crearRequest()));

      expect(getItemSpy).toHaveBeenCalledTimes(1);
    });

    it('debe aceptar tokens con puntos', async () => {
      localStorage.setItem('casitago_token', 'abc.def.ghi');

      await firstValueFrom(ejecutarInterceptor(crearRequest()));

      expect(requestEnviado().headers.get('Authorization'))
        .toBe('Bearer abc.def.ghi');
    });

    it('debe aceptar tokens alfanuméricos', async () => {
      localStorage.setItem('casitago_token', 'TokenABC123456');

      await firstValueFrom(ejecutarInterceptor(crearRequest()));

      expect(requestEnviado().headers.get('Authorization'))
        .toBe('Bearer TokenABC123456');
    });
  });

  describe('Solicitudes sin token', () => {
    it('no debe agregar Authorization cuando no hay token', async () => {
      await firstValueFrom(ejecutarInterceptor(crearRequest()));

      expect(requestEnviado().headers.has('Authorization'))
        .toBe(false);
    });

    it('debe enviar la solicitud original sin token', async () => {
      const request = crearRequest();

      await firstValueFrom(ejecutarInterceptor(request));

      expect(requestEnviado()).toBe(request);
    });

    it('no debe agregar Authorization cuando el token está vacío', async () => {
      localStorage.setItem('casitago_token', '');

      await firstValueFrom(ejecutarInterceptor(crearRequest()));

      expect(requestEnviado().headers.has('Authorization'))
        .toBe(false);
    });

    it('debe conservar una solicitud sin token', async () => {
      const request = crearRequest('POST', `${API_URL}/api/reservas`, {
        cotizacionId: 'cot-1'
      });

      await firstValueFrom(ejecutarInterceptor(request));

      expect(requestEnviado()).toBe(request);
      expect(requestEnviado().body).toEqual({
        cotizacionId: 'cot-1'
      });
    });
  });

  describe('Protección de servidores externos', () => {
    beforeEach(() => {
      localStorage.setItem('casitago_token', 'token-privado');
    });

    it('no debe enviar el token a un dominio externo', async () => {
      await firstValueFrom(
        ejecutarInterceptor(
          crearRequest('GET', 'https://example.com/api/datos')
        )
      );

      expect(requestEnviado().headers.has('Authorization'))
        .toBe(false);
    });

    it('no debe enviar el token a Google Maps', async () => {
      await firstValueFrom(
        ejecutarInterceptor(
          crearRequest('GET', 'https://maps.googleapis.com/maps/api')
        )
      );

      expect(requestEnviado().headers.has('Authorization'))
        .toBe(false);
    });

    it('no debe modificar solicitudes externas', async () => {
      const request = crearRequest(
        'GET',
        'https://servidor-externo.com/datos'
      );

      await firstValueFrom(ejecutarInterceptor(request));

      expect(requestEnviado()).toBe(request);
    });

    it('debe agregar el token al backend configurado', async () => {
      await firstValueFrom(
        ejecutarInterceptor(
          crearRequest('GET', `${API_URL}/api/usuarios`)
        )
      );

      expect(requestEnviado().headers.get('Authorization'))
        .toBe('Bearer token-privado');
    });
  });

  describe('Métodos HTTP', () => {
    beforeEach(() => {
      localStorage.setItem('casitago_token', 'token-123');
    });

    it('debe funcionar con GET', async () => {
      await firstValueFrom(
        ejecutarInterceptor(crearRequest('GET'))
      );

      expect(requestEnviado().method).toBe('GET');
      expect(requestEnviado().headers.has('Authorization'))
        .toBe(true);
    });

    it('debe funcionar con POST', async () => {
      await firstValueFrom(
        ejecutarInterceptor(crearRequest('POST'))
      );

      expect(requestEnviado().method).toBe('POST');
      expect(requestEnviado().headers.has('Authorization'))
        .toBe(true);
    });

    it('debe funcionar con PUT', async () => {
      await firstValueFrom(
        ejecutarInterceptor(crearRequest('PUT'))
      );

      expect(requestEnviado().method).toBe('PUT');
      expect(requestEnviado().headers.has('Authorization'))
        .toBe(true);
    });

    it('debe funcionar con PATCH', async () => {
      await firstValueFrom(
        ejecutarInterceptor(crearRequest('PATCH'))
      );

      expect(requestEnviado().method).toBe('PATCH');
      expect(requestEnviado().headers.has('Authorization'))
        .toBe(true);
    });

    it('debe funcionar con DELETE', async () => {
      await firstValueFrom(
        ejecutarInterceptor(crearRequest('DELETE'))
      );

      expect(requestEnviado().method).toBe('DELETE');
      expect(requestEnviado().headers.has('Authorization'))
        .toBe(true);
    });
  });

  describe('Integridad de la solicitud', () => {
    beforeEach(() => {
      localStorage.setItem('casitago_token', 'token-123');
    });

    it('debe conservar la URL original', async () => {
      const url = `${API_URL}/api/publicaciones/123`;

      await firstValueFrom(
        ejecutarInterceptor(crearRequest('GET', url))
      );

      expect(requestEnviado().url).toBe(url);
    });

    it('debe conservar el cuerpo de la solicitud', async () => {
      const datos = {
        fechaLlegada: '2026-11-10',
        fechaSalida: '2026-11-13'
      };

      await firstValueFrom(
        ejecutarInterceptor(
          crearRequest('POST', `${API_URL}/api/reservas`, datos)
        )
      );

      expect(requestEnviado().body).toEqual(datos);
    });

    it('debe crear una copia de la solicitud al agregar token', async () => {
      const request = crearRequest();

      await firstValueFrom(ejecutarInterceptor(request));

      expect(requestEnviado()).not.toBe(request);
    });

    it('no debe modificar los encabezados de la solicitud original', async () => {
      const request = crearRequest();

      await firstValueFrom(ejecutarInterceptor(request));

      expect(request.headers.has('Authorization')).toBe(false);
      expect(requestEnviado().headers.get('Authorization'))
        .toBe('Bearer token-123');
    });
  });
});
