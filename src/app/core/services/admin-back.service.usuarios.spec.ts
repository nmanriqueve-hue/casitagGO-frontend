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

describe('AdminBackService - usuarios', () => {
  let service: AdminBackService;
  let httpGet: ReturnType<typeof vi.fn>;
  let httpPost: ReturnType<typeof vi.fn>;
  let httpPatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.resetTestingModule();

    httpGet = vi.fn();
    httpPost = vi.fn();
    httpPatch = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        AdminBackService,
        {
          provide: HttpClient,
          useValue: { get: httpGet, post: httpPost, patch: httpPatch }
        }
      ]
    });

    service = TestBed.inject(AdminBackService);
  });

  it('debe consultar el listado de usuarios', async () => {
    const lista = [{ id: 'u1', nombre: 'Hugo' }];
    httpGet.mockReturnValue(of(lista));

    const resultado = await firstValueFrom(service.usuarios());

    expect(httpGet).toHaveBeenCalledWith(`${API_URL}/api/admin/usuarios`);
    expect(resultado).toEqual(lista);
  });

  it('debe propagar los errores al listar usuarios', async () => {
    httpGet.mockReturnValue(throwError(() => new Error('Error al listar')));

    await expect(firstValueFrom(service.usuarios()))
      .rejects.toThrow('Error al listar');
  });

  it('debe enviar el motivo al restringir un usuario', async () => {
    const restriccion = { id: 'r1', activa: true };
    httpPost.mockReturnValue(of(restriccion));

    const resultado = await firstValueFrom(
      service.restringirUsuario('u1', 'Incumple las politicas')
    );

    expect(httpPost).toHaveBeenCalledWith(
      `${API_URL}/api/admin/usuarios/u1/restringir`,
      { motivo: 'Incumple las politicas' }
    );
    expect(resultado).toBe(restriccion);
  });

  it('debe propagar los errores al restringir', async () => {
    httpPost.mockReturnValue(throwError(() => new Error('Error al restringir')));

    await expect(firstValueFrom(service.restringirUsuario('u1', 'Motivo')))
      .rejects.toThrow('Error al restringir');
  });

  it('debe levantar la restriccion con un PATCH sin cuerpo', async () => {
    const restriccion = { id: 'r1', activa: false };
    httpPatch.mockReturnValue(of(restriccion));

    const resultado = await firstValueFrom(service.levantarRestriccion('u1'));

    expect(httpPatch).toHaveBeenCalledWith(
      `${API_URL}/api/admin/usuarios/u1/levantar-restriccion`,
      {}
    );
    expect(resultado).toBe(restriccion);
  });

  it('debe propagar los errores al levantar la restriccion', async () => {
    httpPatch.mockReturnValue(throwError(() => new Error('Error al levantar')));

    await expect(firstValueFrom(service.levantarRestriccion('u1')))
      .rejects.toThrow('Error al levantar');
  });
});
