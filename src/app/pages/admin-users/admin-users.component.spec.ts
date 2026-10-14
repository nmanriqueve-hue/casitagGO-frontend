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

import { AdminUsersComponent } from './admin-users.component';
import { UsuarioAdminBack } from '../../core/services/admin-back.service';
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

describe('AdminUsersComponent', () => {
  let component: AdminUsersComponent;
  let usuarios: ReturnType<typeof vi.fn>;
  let restringirUsuario: ReturnType<typeof vi.fn>;
  let levantarRestriccion: ReturnType<typeof vi.fn>;
  let mostrarToast: ReturnType<typeof vi.fn>;

  const crearUsuario = (
    cambios: Partial<UsuarioAdminBack> = {}
  ): UsuarioAdminBack => ({
    id: 'usuario-1',
    creadoEn: '2026-10-03T01:51:29.851921Z',
    nombre: 'Hugo Huesped',
    correo: 'hugo@correo.com',
    rol: 'HUESPED',
    activo: true,
    mfaHabilitado: false,
    restringido: false,
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
          useValue: { usuarios, restringirUsuario, levantarRestriccion }
        },
        { provide: ToastService, useValue: { show: mostrarToast } }
      ]
    });

    component = TestBed.runInInjectionContext(() => new AdminUsersComponent());
  };

  beforeEach(() => {
    TestBed.resetTestingModule();

    usuarios = vi.fn().mockReturnValue(of([]));
    restringirUsuario = vi.fn();
    levantarRestriccion = vi.fn();
    mostrarToast = vi.fn();
  });

  describe('Carga de usuarios', () => {
    it('debe cargar los usuarios del back', () => {
      const lista = [crearUsuario(), crearUsuario({ id: 'usuario-2', nombre: 'Ana' })];
      usuarios.mockReturnValue(of(lista));

      crearComponente();

      expect(component.usuarios()).toEqual(lista);
      expect(component.cargando()).toBe(false);
      expect(component.errorCarga()).toBe('');
    });

    it('debe avisar cuando no hay conexion con el servidor', () => {
      usuarios.mockReturnValue(throwError(() => crearError(0)));

      crearComponente();

      expect(component.cargando()).toBe(false);
      expect(component.errorCarga()).toContain('No se pudo conectar');
    });

    it('debe mostrar el mensaje del back cuando es un error 400', () => {
      usuarios.mockReturnValue(
        throwError(() => crearError(400, 'Mensaje del back'))
      );

      crearComponente();

      expect(component.errorCarga()).toBe('Mensaje del back');
    });

    it('debe avisar que la sesion vencio cuando el back responde 403', () => {
      usuarios.mockReturnValue(throwError(() => crearError(403)));

      crearComponente();

      expect(component.errorCarga()).toContain('Vuelve a iniciar');
    });

    it('debe mostrar un mensaje generico ante otro error', () => {
      usuarios.mockReturnValue(throwError(() => crearError(500)));

      crearComponente();

      expect(component.errorCarga()).toContain('No se pudieron cargar los usuarios');
    });
  });

  describe('Busqueda', () => {
    beforeEach(() => {
      usuarios.mockReturnValue(
        of([
          crearUsuario({ id: 'u1', nombre: 'Hugo Huesped', correo: 'hugo@correo.com' }),
          crearUsuario({ id: 'u2', nombre: 'Ana Anfitriona', correo: 'ana@correo.com' })
        ])
      );
      crearComponente();
    });

    it('debe devolver todos los usuarios con la busqueda vacia', () => {
      expect(component.visible().length).toBe(2);
    });

    it('debe filtrar por nombre', () => {
      component.search.set('anfitriona');

      expect(component.visible().map((u) => u.id)).toEqual(['u2']);
    });

    it('debe filtrar por correo sin importar mayusculas', () => {
      component.search.set('HUGO@');

      expect(component.visible().map((u) => u.id)).toEqual(['u1']);
    });
  });

  describe('Estado y permisos', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe mostrar RESTRINGIDA cuando tiene una restriccion activa', () => {
      expect(component.estado(crearUsuario({ activo: false, restringido: true })))
        .toBe('RESTRINGIDA');
    });

    it('debe mostrar ACTIVA cuando la cuenta esta activa', () => {
      expect(component.estado(crearUsuario())).toBe('ACTIVA');
    });

    it('debe mostrar INACTIVA cuando la cuenta esta desactivada sin restriccion', () => {
      expect(component.estado(crearUsuario({ activo: false }))).toBe('INACTIVA');
    });

    it('debe permitir restringir a un huesped activo', () => {
      expect(component.puedeRestringir(crearUsuario())).toBe(true);
    });

    it('no debe permitir restringir a un administrador', () => {
      expect(component.puedeRestringir(crearUsuario({ rol: 'ADMINISTRADOR' })))
        .toBe(false);
    });

    it('no debe permitir restringir a quien ya esta restringido', () => {
      expect(component.puedeRestringir(crearUsuario({ activo: false, restringido: true })))
        .toBe(false);
    });

    it('no debe permitir restringir a una cuenta inactiva', () => {
      expect(component.puedeRestringir(crearUsuario({ activo: false })))
        .toBe(false);
    });
  });

  describe('Ventana de confirmacion', () => {
    beforeEach(() => {
      crearComponente();
    });

    it('debe abrir con el usuario elegido y el motivo vacio', () => {
      component.reason = 'motivo anterior';
      const usuario = crearUsuario();

      component.abrir(usuario);

      expect(component.target()).toBe(usuario);
      expect(component.reason).toBe('');
    });

    it('debe cerrar y limpiar el motivo al cancelar', () => {
      component.abrir(crearUsuario());
      component.reason = 'algo';

      component.cancelar();

      expect(component.target()).toBeNull();
      expect(component.reason).toBe('');
    });
  });

  describe('Restringir y reactivar', () => {
    beforeEach(() => {
      usuarios.mockReturnValue(of([crearUsuario()]));
      crearComponente();
    });

    it('debe restringir con el motivo recortado, avisar y recargar la lista', () => {
      restringirUsuario.mockReturnValue(of({}));
      component.abrir(crearUsuario());
      component.reason = '  Incumple las politicas  ';

      component.confirmar();

      expect(restringirUsuario).toHaveBeenCalledWith('usuario-1', 'Incumple las politicas');
      expect(mostrarToast).toHaveBeenCalledWith(expect.stringContaining('fue restringida'));
      expect(usuarios).toHaveBeenCalledTimes(2);
      expect(component.target()).toBeNull();
      expect(component.procesando()).toBe(false);
    });

    it('no debe restringir sin motivo', () => {
      component.abrir(crearUsuario());
      component.reason = '   ';

      component.confirmar();

      expect(restringirUsuario).not.toHaveBeenCalled();
      expect(component.target()).not.toBeNull();
    });

    it('debe reactivar a un usuario restringido sin pedir motivo', () => {
      levantarRestriccion.mockReturnValue(of({}));
      component.abrir(crearUsuario({ activo: false, restringido: true }));

      component.confirmar();

      expect(levantarRestriccion).toHaveBeenCalledWith('usuario-1');
      expect(restringirUsuario).not.toHaveBeenCalled();
      expect(mostrarToast).toHaveBeenCalledWith(expect.stringContaining('fue reactivada'));
    });

    it('no debe repetir la accion mientras hay una en curso', () => {
      restringirUsuario.mockReturnValue(new Subject());
      component.abrir(crearUsuario());
      component.reason = 'Motivo';

      component.confirmar();
      component.confirmar();

      expect(restringirUsuario).toHaveBeenCalledTimes(1);
      expect(component.procesando()).toBe(true);
    });

    it('debe mostrar el mensaje del back si falla y dejar la ventana abierta', () => {
      restringirUsuario.mockReturnValue(
        throwError(() => crearError(400, 'No se puede restringir a otro administrador'))
      );
      component.abrir(crearUsuario());
      component.reason = 'Motivo';

      component.confirmar();

      expect(mostrarToast).toHaveBeenCalledWith(
        'No se puede restringir a otro administrador',
        'warning'
      );
      expect(component.target()).not.toBeNull();
      expect(component.procesando()).toBe(false);
    });

    it('debe mostrar un aviso generico ante otro error', () => {
      levantarRestriccion.mockReturnValue(throwError(() => crearError(500)));
      component.abrir(crearUsuario({ activo: false, restringido: true }));

      component.confirmar();

      expect(mostrarToast).toHaveBeenCalledWith(
        expect.stringContaining('No se pudo completar'),
        'warning'
      );
    });
  });
});
