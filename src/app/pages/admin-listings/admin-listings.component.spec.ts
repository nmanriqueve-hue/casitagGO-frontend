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

describe('AdminListingsComponent', () => {
  let component: AdminListingsComponent;
  let publicaciones: ReturnType<typeof vi.fn>;
  let bloquearPublicacion: ReturnType<typeof vi.fn>;
  let mostrarToast: ReturnType<typeof vi.fn>;

  const crearPublicacion = (
    cambios: Partial<PublicacionAdminBack> = {}
  ): PublicacionAdminBack => ({
    id: 'publicacion-1',
    titulo: 'Apto en Chapinero',
    ciudad: 'Bogota',
    tipo: 'APARTAMENTO',
    estado: 'ACTIVA',
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
          useValue: { publicaciones, bloquearPublicacion }
        },
        { provide: ToastService, useValue: { show: mostrarToast } }
      ]
    });

    component = TestBed.runInInjectionContext(() => new AdminListingsComponent());
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    publicaciones = vi.fn().mockReturnValue(of([]));
    bloquearPublicacion = vi.fn();
    mostrarToast = vi.fn();
  });

  describe('Carga de publicaciones', () => {
    it('debe cargar las publicaciones del back', () => {
      const lista = [crearPublicacion(), crearPublicacion({ id: 'publicacion-2' })];
      publicaciones.mockReturnValue(of(lista));

      crearComponente();

      expect(component.publicaciones()).toEqual(lista);
      expect(component.cargando()).toBe(false);
      expect(component.errorCarga()).toBe('');
    });

    it('debe avisar cuando no hay conexion con el servidor', () => {
      publicaciones.mockReturnValue(throwError(() => crearError(0)));

      crearComponente();

      expect(component.cargando()).toBe(false);
      expect(component.errorCarga()).toContain('No se pudo conectar');
    });

    it('debe mostrar el mensaje del back cuando es un error 400', () => {
      publicaciones.mockReturnValue(
        throwError(() => crearError(400, 'Mensaje del back'))
      );

      crearComponente();

      expect(component.errorCarga()).toBe('Mensaje del back');
    });

    it('debe avisar que la sesion vencio cuando el back responde 403', () => {
      publicaciones.mockReturnValue(throwError(() => crearError(403)));

      crearComponente();

      expect(component.errorCarga()).toContain('Vuelve a iniciar');
    });

    it('debe mostrar un mensaje generico ante otro error', () => {
      publicaciones.mockReturnValue(throwError(() => crearError(500)));

      crearComponente();

      expect(component.errorCarga()).toContain('No se pudieron cargar las publicaciones');
    });
  });

  describe('Filtro por estado', () => {
    beforeEach(() => {
      publicaciones.mockReturnValue(
        of([
          crearPublicacion({ id: 'p1', estado: 'ACTIVA' }),
          crearPublicacion({ id: 'p2', estado: 'BORRADOR' }),
          crearPublicacion({ id: 'p3', estado: 'BLOQUEADA' })
        ])
      );
      crearComponente();
    });

    it('debe mostrar todas las publicaciones por defecto', () => {
      expect(component.filter()).toBe('TODAS');
      expect(component.visible().length).toBe(3);
    });

    it('debe filtrar por el estado elegido', () => {
      component.filter.set('BORRADOR');

      expect(component.visible().map((p) => p.id)).toEqual(['p2']);
    });

    it('debe devolver una lista vacia si ninguna coincide', () => {
      component.filter.set('PAUSADA');

      expect(component.visible()).toEqual([]);
    });
  });

  describe('Ventana de bloqueo', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe abrir con la publicacion elegida y el motivo vacio', () => {
      component.reason = 'motivo anterior';
      const publicacion = crearPublicacion();

      component.abrir(publicacion);

      expect(component.target()).toBe(publicacion);
      expect(component.reason).toBe('');
    });

    it('debe cerrar y limpiar el motivo al cancelar', () => {
      component.abrir(crearPublicacion());
      component.reason = 'algo';

      component.cancelar();

      expect(component.target()).toBeNull();
      expect(component.reason).toBe('');
    });
  });

  describe('Bloquear publicacion', () => {
    beforeEach(() => {
      publicaciones.mockReturnValue(of([crearPublicacion()]));
      crearComponente();
    });

    it('debe bloquear con el motivo recortado, avisar y recargar la lista', () => {
      bloquearPublicacion.mockReturnValue(of({}));
      component.abrir(crearPublicacion());
      component.reason = '  Informacion enganosa  ';

      component.block();

      expect(bloquearPublicacion).toHaveBeenCalledWith('publicacion-1', 'Informacion enganosa');
      expect(mostrarToast).toHaveBeenCalledWith(
        expect.stringContaining('fue bloqueada'),
        'warning'
      );
      expect(publicaciones).toHaveBeenCalledTimes(2);
      expect(component.target()).toBeNull();
      expect(component.procesando()).toBe(false);
    });

    it('no debe bloquear sin motivo', () => {
      component.abrir(crearPublicacion());
      component.reason = '   ';

      component.block();

      expect(bloquearPublicacion).not.toHaveBeenCalled();
      expect(component.target()).not.toBeNull();
    });

    it('no debe hacer nada si no hay una publicacion elegida', () => {
      component.reason = 'Motivo';

      component.block();

      expect(bloquearPublicacion).not.toHaveBeenCalled();
    });

    it('no debe repetir el bloqueo mientras hay uno en curso', () => {
      bloquearPublicacion.mockReturnValue(new Subject());
      component.abrir(crearPublicacion());
      component.reason = 'Motivo';

      component.block();
      component.block();

      expect(bloquearPublicacion).toHaveBeenCalledTimes(1);
      expect(component.procesando()).toBe(true);
    });

    it('debe mostrar el mensaje del back si falla y dejar la ventana abierta', () => {
      bloquearPublicacion.mockReturnValue(
        throwError(() => crearError(400, 'La publicacion ya esta bloqueada'))
      );
      component.abrir(crearPublicacion());
      component.reason = 'Motivo';

      component.block();

      expect(mostrarToast).toHaveBeenCalledWith(
        'La publicacion ya esta bloqueada',
        'warning'
      );
      expect(component.target()).not.toBeNull();
      expect(component.procesando()).toBe(false);
    });

    it('debe mostrar un aviso generico ante otro error', () => {
      bloquearPublicacion.mockReturnValue(throwError(() => crearError(500)));
      component.abrir(crearPublicacion());
      component.reason = 'Motivo';

      component.block();

      expect(mostrarToast).toHaveBeenCalledWith(
        expect.stringContaining('No se pudo bloquear'),
        'warning'
      );
    });
  });
});
