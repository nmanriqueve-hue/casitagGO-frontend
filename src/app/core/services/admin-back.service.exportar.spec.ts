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

describe('AdminBackService - exportar auditoria en CSV', () => {
  let service: AdminBackService;
  let httpGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.resetTestingModule();

    httpGet = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        AdminBackService,
        {
          provide: HttpClient,
          useValue: { get: httpGet }
        }
      ]
    });

    service = TestBed.inject(AdminBackService);
  });

  it('debe consultar el endpoint de exportacion pidiendo un Blob', async () => {
    httpGet.mockReturnValue(of(new Blob(['Fecha;Actor'])));

    await firstValueFrom(service.exportarAuditoriaCsv());

    expect(httpGet).toHaveBeenCalledTimes(1);
    expect(httpGet).toHaveBeenCalledWith(
      `${API_URL}/api/admin/auditoria/exportar`,
      { responseType: 'blob' }
    );
  });

  it('debe devolver el archivo que entrega el back', async () => {
    const archivo = new Blob(['Fecha;Actor'], { type: 'text/csv' });
    httpGet.mockReturnValue(of(archivo));

    const resultado = await firstValueFrom(service.exportarAuditoriaCsv());

    expect(resultado).toBe(archivo);
  });

  it('debe propagar los errores al exportar', async () => {
    httpGet.mockReturnValue(
      throwError(() => new Error('Error al exportar'))
    );

    await expect(firstValueFrom(service.exportarAuditoriaCsv()))
      .rejects.toThrow('Error al exportar');
  });
});
