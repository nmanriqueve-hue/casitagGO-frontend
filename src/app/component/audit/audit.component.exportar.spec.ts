// @vitest-environment jsdom
import '@angular/compiler';

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuditComponent } from './audit.component';
import { AdminBackService } from '../../core/services/admin-back.service';
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

describe('AuditComponent - exportar CSV desde el back', () => {
  let component: AuditComponent;
  let exportarAuditoriaCsv: ReturnType<typeof vi.fn>;
  let mostrarToast: ReturnType<typeof vi.fn>;

  const crearComponente = (): void => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AdminBackService,
          useValue: {
            auditoria: vi.fn().mockReturnValue(of([])),
            usuarios: vi.fn().mockReturnValue(of([])),
            exportarAuditoriaCsv
          }
        },
        { provide: ToastService, useValue: { show: mostrarToast } }
      ]
    });

    component = TestBed.runInInjectionContext(() => new AuditComponent());
  };

  const esperarAviso = async (texto: string): Promise<void> => {
    await vi.waitFor(() => {
      expect(mostrarToast).toHaveBeenCalledWith(
        expect.stringContaining(texto),
        'warning'
      );
    });
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    exportarAuditoriaCsv = vi.fn();
    mostrarToast = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debe descargar el archivo que devuelve el back y avisar', () => {
    const csv = new Blob(['Fecha;Actor'], { type: 'text/csv' });
    exportarAuditoriaCsv.mockReturnValue(of(csv));
    crearComponente();

    const crearURL = vi.fn().mockReturnValue('blob:auditoria-back');
    const revocarURL = vi.fn();
    const originalCrearURL = URL.createObjectURL;
    const originalRevocarURL = URL.revokeObjectURL;
    URL.createObjectURL = crearURL;
    URL.revokeObjectURL = revocarURL;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    try {
      component.exportCsv();

      expect(exportarAuditoriaCsv).toHaveBeenCalledTimes(1);
      expect(crearURL).toHaveBeenCalledWith(csv);
      expect(click).toHaveBeenCalledTimes(1);
      expect(revocarURL).toHaveBeenCalledWith('blob:auditoria-back');
      expect(component.exportando()).toBe(false);
      expect(mostrarToast).toHaveBeenCalledWith(
        expect.stringContaining('fue exportado')
      );
    } finally {
      URL.createObjectURL = originalCrearURL;
      URL.revokeObjectURL = originalRevocarURL;
    }
  });

  it('no debe pedir otra exportacion mientras hay una en curso', () => {
    exportarAuditoriaCsv.mockReturnValue(new Subject<Blob>());
    crearComponente();

    component.exportCsv();
    component.exportCsv();

    expect(exportarAuditoriaCsv).toHaveBeenCalledTimes(1);
    expect(component.exportando()).toBe(true);
  });

  it('debe avisar cuando no hay conexion con el servidor', async () => {
    exportarAuditoriaCsv.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0 }))
    );
    crearComponente();

    component.exportCsv();

    await esperarAviso('No se pudo conectar con el servidor');
    expect(component.exportando()).toBe(false);
  });

  it('debe mostrar el mensaje del back cuando es un error 400', async () => {
    const cuerpo = new Blob(['Mensaje del back']);
    Object.defineProperty(cuerpo, 'text', {
      value: () => Promise.resolve('Mensaje del back')
    });
    exportarAuditoriaCsv.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: cuerpo }))
    );
    crearComponente();

    component.exportCsv();

    await esperarAviso('Mensaje del back');
  });

  it('debe avisar que la sesion vencio cuando el back responde 403', async () => {
    exportarAuditoriaCsv.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403 }))
    );
    crearComponente();

    component.exportCsv();

    await esperarAviso('Vuelve a iniciar');
  });

  it('debe mostrar un mensaje generico ante otro error', async () => {
    exportarAuditoriaCsv.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 }))
    );
    crearComponente();

    component.exportCsv();

    await esperarAviso('No se pudo exportar la');
  });
});
