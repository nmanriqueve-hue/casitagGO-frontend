
// @vitest-environment jsdom
import '@angular/compiler';

import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter
} from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { roleGuard } from './role.guard';
import { UserRole } from '../models/marketplace.models';
import { SessionService } from '../services/session.service';
import { ToastService } from '../services/toast.service';

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

describe('roleGuard', () => {
  let router: Router;
  let role: ReturnType<typeof vi.fn>;
  let showToast: ReturnType<typeof vi.fn>;

  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/ruta-protegida' } as RouterStateSnapshot;

  const ejecutarGuard = (roles: UserRole[]) =>
    TestBed.runInInjectionContext(() =>
      roleGuard(roles)(route, state)
    );

  const obtenerUrl = (resultado: unknown): string =>
    router.serializeUrl(resultado as UrlTree);

  beforeEach(() => {
    TestBed.resetTestingModule();

    role = vi.fn().mockReturnValue(null);
    showToast = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: SessionService,
          useValue: { role }
        },
        {
          provide: ToastService,
          useValue: { show: showToast }
        }
      ]
    });

    router = TestBed.inject(Router);
  });

  describe('Acceso autorizado', () => {
    it('debe permitir el acceso al administrador autorizado', () => {
      role.mockReturnValue('admin');

      expect(ejecutarGuard(['admin'])).toBe(true);
    });

    it('debe permitir el acceso al anfitrión autorizado', () => {
      role.mockReturnValue('host');

      expect(ejecutarGuard(['host'])).toBe(true);
    });

    it('debe permitir el acceso al huésped autorizado', () => {
      role.mockReturnValue('guest');

      expect(ejecutarGuard(['guest'])).toBe(true);
    });

    it('debe permitir el acceso cuando el rol está en una lista', () => {
      role.mockReturnValue('host');

      expect(ejecutarGuard(['admin', 'host'])).toBe(true);
    });

    it('debe permitir el acceso con varios roles autorizados', () => {
      role.mockReturnValue('guest');

      expect(ejecutarGuard(['admin', 'host', 'guest'])).toBe(true);
    });

    it('debe consultar el rol de la sesión', () => {
      role.mockReturnValue('admin');

      ejecutarGuard(['admin']);

      expect(role).toHaveBeenCalled();
    });

    it('no debe mostrar advertencias cuando el acceso está permitido', () => {
      role.mockReturnValue('admin');

      ejecutarGuard(['admin']);

      expect(showToast).not.toHaveBeenCalled();
    });

    it('debe devolver true y no una redirección', () => {
      role.mockReturnValue('host');

      const resultado = ejecutarGuard(['host']);

      expect(resultado).toBe(true);
      expect(resultado).not.toBeInstanceOf(UrlTree);
    });
  });

  describe('Acceso denegado al administrador', () => {
    beforeEach(() => {
      role.mockReturnValue('admin');
    });

    it('debe rechazar al administrador sin autorización', () => {
      const resultado = ejecutarGuard(['host']);

      expect(resultado).toBeInstanceOf(UrlTree);
    });

    it('debe redirigir al administrador a administración', () => {
      const resultado = ejecutarGuard(['host']);

      expect(obtenerUrl(resultado)).toBe('/administracion');
    });

    it('debe mostrar una advertencia al administrador', () => {
      ejecutarGuard(['host']);

      expect(showToast).toHaveBeenCalledWith(
        expect.any(String),
        'warning'
      );
    });

    it('debe rechazar al administrador cuando no hay roles permitidos', () => {
      const resultado = ejecutarGuard([]);

      expect(obtenerUrl(resultado)).toBe('/administracion');
    });
  });

  describe('Acceso denegado al anfitrión', () => {
    beforeEach(() => {
      role.mockReturnValue('host');
    });

    it('debe rechazar al anfitrión sin autorización', () => {
      const resultado = ejecutarGuard(['admin']);

      expect(resultado).toBeInstanceOf(UrlTree);
    });

    it('debe redirigir al anfitrión a su panel', () => {
      const resultado = ejecutarGuard(['admin']);

      expect(obtenerUrl(resultado)).toBe('/anfitrion');
    });

    it('debe mostrar una advertencia al anfitrión', () => {
      ejecutarGuard(['admin']);

      expect(showToast).toHaveBeenCalledWith(
        expect.any(String),
        'warning'
      );
    });

    it('debe rechazar al anfitrión cuando no hay roles permitidos', () => {
      const resultado = ejecutarGuard([]);

      expect(obtenerUrl(resultado)).toBe('/anfitrion');
    });
  });

  describe('Acceso denegado al huésped', () => {
    beforeEach(() => {
      role.mockReturnValue('guest');
    });

    it('debe rechazar al huésped de una ruta administrativa', () => {
      const resultado = ejecutarGuard(['admin']);

      expect(resultado).toBeInstanceOf(UrlTree);
    });

    it('debe redirigir al huésped a sus reservas', () => {
      const resultado = ejecutarGuard(['admin']);

      expect(obtenerUrl(resultado)).toBe('/mis-reservas');
    });

    it('debe mostrar una advertencia al huésped', () => {
      ejecutarGuard(['host']);

      expect(showToast).toHaveBeenCalledWith(
        expect.any(String),
        'warning'
      );
    });

    it('debe rechazar al huésped cuando no hay roles permitidos', () => {
      const resultado = ejecutarGuard([]);

      expect(obtenerUrl(resultado)).toBe('/mis-reservas');
    });
  });

  describe('Usuarios sin rol', () => {
    it('debe rechazar el acceso cuando el rol es null', () => {
      role.mockReturnValue(null);

      const resultado = ejecutarGuard(['admin']);

      expect(resultado).toBeInstanceOf(UrlTree);
    });

    it('debe rechazar el acceso cuando el rol es undefined', () => {
      role.mockReturnValue(undefined);

      const resultado = ejecutarGuard(['host']);

      expect(resultado).toBeInstanceOf(UrlTree);
    });

    it('debe redirigir a mis reservas cuando no existe rol', () => {
      role.mockReturnValue(null);

      const resultado = ejecutarGuard(['admin']);

      expect(obtenerUrl(resultado)).toBe('/mis-reservas');
    });

    it('debe mostrar advertencia cuando no existe rol', () => {
      role.mockReturnValue(null);

      ejecutarGuard(['admin']);

      expect(showToast).toHaveBeenCalledWith(
        expect.any(String),
        'warning'
      );
    });
  });
});
