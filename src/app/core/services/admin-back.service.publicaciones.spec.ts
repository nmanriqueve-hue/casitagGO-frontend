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

describe('AdminBackService - publicaciones', () => {
  let service: AdminBackService;
  let httpGet: ReturnType<typeof vi.fn>;
  let httpPatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.resetTestingModule();

    httpGet = vi.fn();
    httpPatch = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        AdminBackService,
        {
          provide: HttpClient,
          useValue: { get: httpGet, patch: httpPatch }
        }
      ]
    });

    service = TestBed.inject(AdminBackService);
  });

  it('debe consultar el listado de publicaciones', async () => {
    const lista = [{ id: 'p1', titulo: 'Apto' }];
    httpGet.mockReturnValue(of(lista));

    const resultado = await firstValueFrom(service.publicaciones());

    expect(httpGet).toHaveBeenCalledWith(`${API_URL}/api/admin/publicaciones`);
    expect(resultado).toEqual(lista);
  });

  it('debe propagar los errores al listar publicaciones', async () => {
    httpGet.mockReturnValue(throwError(() => new Error('Error al listar')));

    await expect(firstValueFrom(service.publicaciones()))
      .rejects.toThrow('Error al listar');
  });

  it('debe enviar el motivo al bloquear una publicacion', async () => {
    const respuesta = { id: 'p1', estado: 'BLOQUEADA' };
    httpPatch.mockReturnValue(of(respuesta));

    const resultado = await firstValueFrom(
      service.bloquearPublicacion('p1', 'Informacion enganosa')
    );

    expect(httpPatch).toHaveBeenCalledWith(
      `${API_URL}/api/publicaciones/p1/bloquear`,
      { motivo: 'Informacion enganosa' }
    );
    expect(resultado).toBe(respuesta);
  });

  it('debe propagar los errores al bloquear', async () => {
    httpPatch.mockReturnValue(throwError(() => new Error('Error al bloquear')));

    await expect(firstValueFrom(service.bloquearPublicacion('p1', 'Motivo')))
      .rejects.toThrow('Error al bloquear');
  });
});
