
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

import { authGuard } from './auth.guard';
import { SessionService } from '../services/session.service';

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

describe('authGuard', () => {
  let router: Router;
  let isAuthenticated: ReturnType<typeof vi.fn>;

  const route = {} as ActivatedRouteSnapshot;

  const crearEstado = (url: string): RouterStateSnapshot =>
    ({ url } as RouterStateSnapshot);

  const ejecutarGuard = (url: string) =>
    TestBed.runInInjectionContext(() =>
      authGuard(route, crearEstado(url))
    );

  beforeEach(() => {
    TestBed.resetTestingModule();

    isAuthenticated = vi.fn().mockReturnValue(false);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: SessionService,
          useValue: {
            isAuthenticated
          }
        }
      ]
    });

    router = TestBed.inject(Router);
  });

  describe('Usuarios autenticados', () => {
    beforeEach(() => {
      isAuthenticated.mockReturnValue(true);
    });

    it('debe permitir el acceso cuando existe una sesión', () => {
      expect(ejecutarGuard('/perfil')).toBe(true);
    });

    it('debe consultar el estado de autenticación', () => {
      ejecutarGuard('/perfil');

      expect(isAuthenticated).toHaveBeenCalledTimes(1);
    });

    it('debe permitir acceder al perfil', () => {
      expect(ejecutarGuard('/perfil')).toBe(true);
    });

    it('debe permitir acceder a las reservas', () => {
      expect(ejecutarGuard('/mis-reservas')).toBe(true);
    });

    it('debe permitir acceder a rutas con parámetros', () => {
      expect(ejecutarGuard('/reservas/123')).toBe(true);
    });

    it('debe devolver true y no una redirección', () => {
      const resultado = ejecutarGuard('/perfil');

      expect(resultado).toBe(true);
      expect(resultado).not.toBeInstanceOf(UrlTree);
    });
  });

  describe('Usuarios no autenticados', () => {
    it('debe impedir el acceso directo a una ruta protegida', () => {
      const resultado = ejecutarGuard('/perfil');

      expect(resultado).not.toBe(true);
      expect(resultado).toBeInstanceOf(UrlTree);
    });

    it('debe redirigir a iniciar sesión', () => {
      const resultado = ejecutarGuard('/perfil') as UrlTree;

      expect(router.serializeUrl(resultado)).toContain('/iniciar-sesion');
    });

    it('debe conservar la URL de destino en returnUrl', () => {
      const resultado = ejecutarGuard('/perfil') as UrlTree;

      expect(resultado.queryParams['returnUrl']).toBe('/perfil');
    });

    it('debe conservar rutas con identificadores', () => {
      const resultado = ejecutarGuard('/reservas/123') as UrlTree;

      expect(resultado.queryParams['returnUrl'])
        .toBe('/reservas/123');
    });

    it('debe conservar los parámetros de búsqueda', () => {
      const resultado = ejecutarGuard(
        '/buscar?ciudad=Bogota&huespedes=2'
      ) as UrlTree;

      expect(resultado.queryParams['returnUrl'])
        .toBe('/buscar?ciudad=Bogota&huespedes=2');
    });

    it('debe generar la URL de redirección correctamente', () => {
      const resultado = ejecutarGuard('/perfil') as UrlTree;

      expect(router.serializeUrl(resultado)).toBe(
        '/iniciar-sesion?returnUrl=%2Fperfil'
      );
    });
  });
});
