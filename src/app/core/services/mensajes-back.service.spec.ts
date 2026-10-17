// @vitest-environment jsdom
import '@angular/compiler';

import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MensajesBackService } from './mensajes-back.service';
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

describe('MensajesBackService', () => {
  let service: MensajesBackService;
  let httpGet: ReturnType<typeof vi.fn>;
  let httpPost: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.resetTestingModule();

    httpGet = vi.fn();
    httpPost = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        MensajesBackService,
        {
          provide: HttpClient,
          useValue: { get: httpGet, post: httpPost }
        }
      ]
    });

    service = TestBed.inject(MensajesBackService);
  });

  it('debe consultar la bandeja de conversaciones', async () => {
    const lista = [{ publicacionId: 'pub-1', huespedId: 'huesped-1' }];
    httpGet.mockReturnValue(of(lista));

    const resultado = await firstValueFrom(service.conversaciones());

    expect(httpGet).toHaveBeenCalledWith(`${API_URL}/api/mensajes/mias`);
    expect(resultado).toEqual(lista);
  });

  it('debe propagar los errores al consultar la bandeja', async () => {
    httpGet.mockReturnValue(throwError(() => new Error('Error de bandeja')));

    await expect(firstValueFrom(service.conversaciones()))
      .rejects.toThrow('Error de bandeja');
  });

  it('debe consultar una conversacion por publicacion y huesped', async () => {
    const mensajes = [{ id: 'mensaje-1', contenido: 'Hola' }];
    httpGet.mockReturnValue(of(mensajes));

    const resultado = await firstValueFrom(service.conversacion('pub-1', 'huesped-1'));

    expect(httpGet).toHaveBeenCalledWith(`${API_URL}/api/publicaciones/pub-1/mensajes/huesped-1`);
    expect(resultado).toEqual(mensajes);
  });

  it('debe propagar los errores al consultar una conversacion', async () => {
    httpGet.mockReturnValue(throwError(() => new Error('Error de conversacion')));

    await expect(firstValueFrom(service.conversacion('pub-1', 'huesped-1')))
      .rejects.toThrow('Error de conversacion');
  });

  it('debe enviar solo el contenido cuando escribe un huesped', async () => {
    const mensaje = { id: 'mensaje-1' };
    httpPost.mockReturnValue(of(mensaje));

    const resultado = await firstValueFrom(service.enviar('pub-1', 'Hola'));

    expect(httpPost).toHaveBeenCalledWith(
      `${API_URL}/api/publicaciones/pub-1/mensajes`,
      { contenido: 'Hola' }
    );
    expect(resultado).toBe(mensaje);
  });

  it('debe enviar tambien el huesped cuando responde un anfitrion', async () => {
    httpPost.mockReturnValue(of({ id: 'mensaje-2' }));

    await firstValueFrom(service.enviar('pub-1', 'Si esta disponible', 'huesped-1'));

    expect(httpPost).toHaveBeenCalledWith(
      `${API_URL}/api/publicaciones/pub-1/mensajes`,
      { contenido: 'Si esta disponible', huespedId: 'huesped-1' }
    );
  });

  it('debe propagar los errores al enviar', async () => {
    httpPost.mockReturnValue(throwError(() => new Error('Error al enviar')));

    await expect(firstValueFrom(service.enviar('pub-1', 'Hola')))
      .rejects.toThrow('Error al enviar');
  });
});
