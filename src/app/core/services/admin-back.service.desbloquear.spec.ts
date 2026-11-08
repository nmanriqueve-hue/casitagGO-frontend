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

import { AdminBackService } from './admin-back.service';
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

describe('AdminBackService - desbloquear publicacion', () => {
  let service: AdminBackService;
  let httpPatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.resetTestingModule();

    httpPatch = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        AdminBackService,
        {
          provide: HttpClient,
          useValue: { patch: httpPatch }
        }
      ]
    });

    service = TestBed.inject(AdminBackService);
  });

  it('debe llamar al endpoint de desbloqueo con el id y un cuerpo vacio', async () => {
    httpPatch.mockReturnValue(of({ estado: 'PAUSADA' }));

    await firstValueFrom(service.desbloquearPublicacion('publicacion-1'));

    expect(httpPatch).toHaveBeenCalledTimes(1);
    expect(httpPatch).toHaveBeenCalledWith(
      `${API_URL}/api/publicaciones/publicacion-1/desbloquear`,
      {}
    );
  });

  it('debe devolver la respuesta que entrega el back', async () => {
    const respuesta = { estado: 'PAUSADA' };
    httpPatch.mockReturnValue(of(respuesta));

    const resultado = await firstValueFrom(service.desbloquearPublicacion('publicacion-1'));

    expect(resultado).toBe(respuesta);
  });

  it('debe propagar el error cuando el back rechaza el desbloqueo', async () => {
    const fallo = new Error('rechazado');
    httpPatch.mockReturnValue(throwError(() => fallo));

    await expect(firstValueFrom(service.desbloquearPublicacion('publicacion-1'))).rejects.toBe(fallo);
  });
});
