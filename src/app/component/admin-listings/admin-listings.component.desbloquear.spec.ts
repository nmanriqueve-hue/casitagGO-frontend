// @vitest-environment jsdom
import '@angular/compiler';

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminListingsComponent } from './admin-listings.component';
import {
  AdminBackService,
  PublicacionAdminBack
} from '../../core/services/admin-back.service';
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

describe('AdminListingsComponent - desbloquear publicacion', () => {
  let component: AdminListingsComponent;
  let publicaciones: ReturnType<typeof vi.fn>;
  let desbloquearPublicacion: ReturnType<typeof vi.fn>;
  let mostrarToast: ReturnType<typeof vi.fn>;

  const crearPublicacion = (
    cambios: Partial<PublicacionAdminBack> = {}
  ): PublicacionAdminBack => ({
    id: 'publicacion-1',
    titulo: 'Apto en Chapinero',
    ciudad: 'Bogota',
    tipo: 'APARTAMENTO',
    estado: 'BLOQUEADA',
    precioNoche: 150000,
    anfitrionId: 'anfitrion-1',
    anfitrionNombre: 'Ana Anfitriona',
    anfitrionCorreo: 'ana@correo.com',
    creadoEn: '2026-10-12T17:21:07.50975',
    ...cambios
  });

  const crearError = (
    status: number,
    error: unknown = null
  ): HttpErrorResponse => new HttpErrorResponse({ status, error });

  const crearComponente = (): void => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AdminBackService,
          useValue: { publicaciones, desbloquearPublicacion }
        },
        { provide: ToastService, useValue: { show: mostrarToast } }
      ]
    });

    component = TestBed.runInInjectionContext(() => new AdminListingsComponent());
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    publicaciones = vi.fn().mockReturnValue(of([]));
    desbloquearPublicacion = vi.fn();
    mostrarToast = vi.fn();
  });

  it('debe desbloquear con el id, avisar el exito y recargar la lista', () => {
    desbloquearPublicacion.mockReturnValue(of({ estado: 'PAUSADA' }));
    crearComponente();

    component.desbloquear(crearPublicacion());

    expect(desbloquearPublicacion).toHaveBeenCalledWith('publicacion-1');
    expect(mostrarToast).toHaveBeenCalledWith(expect.stringContaining('desbloqueada'), 'info');
    expect(publicaciones).toHaveBeenCalledTimes(2);
    expect(component.procesando()).toBe(false);
  });

  it('debe mostrar el mensaje del back cuando el desbloqueo da error 400', () => {
    desbloquearPublicacion.mockReturnValue(
      throwError(() => crearError(400, 'La publicacion no esta bloqueada.'))
    );
    crearComponente();

    component.desbloquear(crearPublicacion());

    expect(mostrarToast).toHaveBeenCalledWith('La publicacion no esta bloqueada.', 'warning');
    expect(component.procesando()).toBe(false);
    expect(publicaciones).toHaveBeenCalledTimes(1);
  });

  it('debe avisar que no hay conexion cuando el servidor no responde', () => {
    desbloquearPublicacion.mockReturnValue(throwError(() => crearError(0)));
    crearComponente();

    component.desbloquear(crearPublicacion());

    expect(mostrarToast).toHaveBeenCalledWith(expect.stringContaining('No se pudo conectar'), 'warning');
    expect(component.procesando()).toBe(false);
  });

  it('debe usar el mensaje por defecto cuando el error no es conocido', () => {
    desbloquearPublicacion.mockReturnValue(throwError(() => crearError(500)));
    crearComponente();

    component.desbloquear(crearPublicacion());

    expect(mostrarToast).toHaveBeenCalledWith(expect.stringContaining('No se pudo desbloquear'), 'warning');
  });

  it('debe ignorar un segundo clic mientras el desbloqueo sigue en curso', () => {
    const pendiente = new Subject<unknown>();
    desbloquearPublicacion.mockReturnValue(pendiente.asObservable());
    crearComponente();

    component.desbloquear(crearPublicacion());
    component.desbloquear(crearPublicacion());

    expect(desbloquearPublicacion).toHaveBeenCalledTimes(1);
    expect(component.procesando()).toBe(true);

    pendiente.next({ estado: 'PAUSADA' });
    pendiente.complete();

    expect(component.procesando()).toBe(false);
  });
});
