
 // @vitest-environment jsdom
import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { SessionService, PerfilBack } from './session.service';
import { API_URL } from '../config/api.config';
import { User } from '../models/marketplace.models';

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

describe('SessionService', () => {
  let service: SessionService;

  const post = vi.fn();
  const get = vi.fn();
  const put = vi.fn();
  const patch = vi.fn();

  const httpSimulado = { post, get, put, patch };

  const respuestaLogin = {
    token: 'token-de-prueba',
    expiraEnSegundos: 3600,
    usuarioId: 'uuid-usuario-1',
    nombre: 'Usuario de prueba',
    rol: 'HUESPED'
  };

  const perfil: PerfilBack = {
    id: 'uuid-usuario-1',
    nombre: 'Usuario de prueba',
    correo: 'usuario@test.com',
    rol: 'HUESPED',
    activo: true,
    creadoEn: '2026-01-01',
    mfaHabilitado: false
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
    localStorage.clear();

    post.mockReturnValue(of('OK'));
    get.mockReturnValue(of(perfil));
    put.mockReturnValue(of('Actualizado'));
    patch.mockReturnValue(of('OK'));

    TestBed.configureTestingModule({
      providers: [
        SessionService,
        { provide: HttpClient, useValue: httpSimulado }
      ]
    });

    service = TestBed.inject(SessionService);
  });

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  describe('Inicializacion', () => {
    it('debe crear el servicio', () => {
      expect(service).toBeTruthy();
    });

    it('debe iniciar sin usuario autenticado', () => {
      expect(service.currentUser()).toBeNull();
    });

    it('debe iniciar con autenticacion falsa', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('debe iniciar sin rol', () => {
      expect(service.role()).toBeNull();
    });

    it('debe disponer de una lista de usuarios', () => {
      expect(Array.isArray(service.users())).toBe(true);
    });
  });

  describe('Cierre de sesion', () => {
    it('debe cerrar sesion correctamente', () => {
      post.mockReturnValue(of(respuestaLogin));
      service.loginReal('salida@test.com', 'clave').subscribe();
      expect(service.isAuthenticated()).toBe(true);

      service.logout();

      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('debe limpiar los datos persistidos al cerrar sesion', () => {
      localStorage.setItem('casitago_token', 'token');
      localStorage.setItem('casitago_usuario', '{}');
      localStorage.setItem('casitago_expira', '9999999999999');

      service.logout();

      expect(localStorage.getItem('casitago_token')).toBeNull();
      expect(localStorage.getItem('casitago_usuario')).toBeNull();
      expect(localStorage.getItem('casitago_expira')).toBeNull();
    });
  });

  describe('Login real y almacenamiento', () => {
    beforeEach(() => {
      post.mockReturnValue(of(respuestaLogin));
    });

    it('debe llamar al endpoint de login', () => {
      service.loginReal(
        'usuario@test.com',
        'contrasena123'
      ).subscribe();

      expect(post).toHaveBeenCalledWith(
        `${API_URL}/api/auth/login`,
        {
          correo: 'usuario@test.com',
          contrasena: 'contrasena123'
        }
      );
    });

    it('debe incluir el codigo MFA cuando se proporciona', () => {
      service.loginReal(
        'usuario@test.com',
        'contrasena123',
        '123456'
      ).subscribe();

      expect(post).toHaveBeenCalledWith(
        `${API_URL}/api/auth/login`,
        {
          correo: 'usuario@test.com',
          contrasena: 'contrasena123',
          codigoMfa: '123456'
        }
      );
    });

    it('debe almacenar el token', () => {
      service.loginReal(
        'usuario@test.com',
        'contrasena123'
      ).subscribe();

      expect(localStorage.getItem('casitago_token')).toBe(
        'token-de-prueba'
      );
    });

    it('debe almacenar la fecha de expiracion', () => {
      const antes = Date.now();

      service.loginReal(
        'usuario@test.com',
        'contrasena123'
      ).subscribe();

      const expiracion = Number(
        localStorage.getItem('casitago_expira')
      );

      expect(expiracion).toBeGreaterThanOrEqual(antes + 3600000);
      expect(expiracion).toBeLessThanOrEqual(Date.now() + 3600000);
    });

    it('debe autenticar al usuario recibido del backend', () => {
      service.loginReal(
        'usuario@test.com',
        'contrasena123'
      ).subscribe();

      expect(service.isAuthenticated()).toBe(true);
      expect(service.currentUser()?.uuid).toBe('uuid-usuario-1');
    });

    it('debe convertir el rol HUESPED', () => {
      service.loginReal(
        'usuario@test.com',
        'contrasena123'
      ).subscribe();

      expect(service.role()).toBe('guest');
    });

    it('debe convertir el rol ANFITRION', () => {
      post.mockReturnValue(of({
        ...respuestaLogin,
        rol: 'ANFITRION'
      }));

      service.loginReal(
        'usuario@test.com',
        'contrasena123'
      ).subscribe();

      expect(service.role()).toBe('host');
    });

    it('debe convertir el rol ADMINISTRADOR', () => {
      post.mockReturnValue(of({
        ...respuestaLogin,
        rol: 'ADMINISTRADOR'
      }));

      service.loginReal(
        'usuario@test.com',
        'contrasena123'
      ).subscribe();

      expect(service.role()).toBe('admin');
    });

    it('debe normalizar el correo en el usuario autenticado', () => {
      service.loginReal(
        '  USUARIO@TEST.COM  ',
        'contrasena123'
      ).subscribe();

      expect(service.currentUser()?.email).toBe('usuario@test.com');
    });

    it('no debe autenticar si el backend devuelve un error', () => {
      post.mockReturnValue(
        throwError(() => new Error('Credenciales invalidas'))
      );

      service.loginReal(
        'usuario@test.com',
        'incorrecta'
      ).subscribe({
        error: () => {}
      });

      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('casitago_token')).toBeNull();
    });
  });

  describe('Registro real', () => {
    it('debe registrar un huesped en el backend', () => {
      post
        .mockReturnValueOnce(of('Registrado'))
        .mockReturnValueOnce(of(respuestaLogin));

      service.registroReal(
        'Usuario',
        'usuario@test.com',
        'contrasena123',
        'guest'
      ).subscribe();

      expect(post).toHaveBeenNthCalledWith(
        1,
        `${API_URL}/api/auth/registro`,
        {
          nombre: 'Usuario',
          correo: 'usuario@test.com',
          contrasena: 'contrasena123',
          rol: 'HUESPED'
        },
        { responseType: 'text' }
      );
    });

    it('debe registrar un anfitrion en el backend', () => {
      post
        .mockReturnValueOnce(of('Registrado'))
        .mockReturnValueOnce(of({
          ...respuestaLogin,
          rol: 'ANFITRION'
        }));

      service.registroReal(
        'Anfitrion',
        'host@test.com',
        'contrasena123',
        'host'
      ).subscribe();

      expect(post).toHaveBeenNthCalledWith(
        1,
        `${API_URL}/api/auth/registro`,
        {
          nombre: 'Anfitrion',
          correo: 'host@test.com',
          contrasena: 'contrasena123',
          rol: 'ANFITRION'
        },
        { responseType: 'text' }
      );
    });

    it('debe iniciar sesion despues del registro real', () => {
      post
        .mockReturnValueOnce(of('Registrado'))
        .mockReturnValueOnce(of(respuestaLogin));

      service.registroReal(
        'Usuario',
        'usuario@test.com',
        'contrasena123',
        'guest'
      ).subscribe();

      expect(service.isAuthenticated()).toBe(true);
      expect(post).toHaveBeenCalledTimes(2);
    });

    it('no debe iniciar sesion si el registro falla', () => {
      post.mockReturnValue(
        throwError(() => new Error('Registro rechazado'))
      );

      service.registroReal(
        'Usuario',
        'usuario@test.com',
        'contrasena123',
        'guest'
      ).subscribe({
        error: () => {}
      });

      expect(service.isAuthenticated()).toBe(false);
      expect(post).toHaveBeenCalledTimes(1);
    });
  });

  describe('Recuperacion de contrasena', () => {
    it('debe solicitar la recuperacion', () => {
      service.solicitarRecuperacion(
        'usuario@test.com'
      ).subscribe();

      expect(post).toHaveBeenCalledWith(
        `${API_URL}/api/auth/recuperacion/solicitar`,
        { correo: 'usuario@test.com' },
        { responseType: 'text' }
      );
    });

    it('debe confirmar la recuperacion', () => {
      service.confirmarRecuperacion(
        'usuario@test.com',
        '123456',
        'nuevaContrasena123'
      ).subscribe();

      expect(post).toHaveBeenCalledWith(
        `${API_URL}/api/auth/recuperacion/confirmar`,
        {
          correo: 'usuario@test.com',
          codigo: '123456',
          nuevaContrasena: 'nuevaContrasena123'
        },
        { responseType: 'text' }
      );
    });
  });

  describe('Perfil de usuario', () => {
    it('debe consultar el perfil del backend', () => {
      service.obtenerPerfil().subscribe();

      expect(get).toHaveBeenCalledWith(
        `${API_URL}/api/auth/perfil`
      );
    });

    it('debe devolver el perfil recibido', () => {
      let resultado: PerfilBack | undefined;

      service.obtenerPerfil().subscribe(
        valor => resultado = valor
      );

      expect(resultado).toEqual(perfil);
    });

    it('debe actualizar el perfil en el backend', () => {
      service.actualizarPerfilReal(
        'Nuevo nombre',
        'nuevo@test.com'
      ).subscribe();

      expect(put).toHaveBeenCalledWith(
        `${API_URL}/api/auth/perfil`,
        {
          nombre: 'Nuevo nombre',
          correo: 'nuevo@test.com'
        },
        { responseType: 'text' }
      );
    });

    it('debe actualizar el usuario local tras actualizar el perfil real', () => {
      post.mockReturnValue(of(respuestaLogin));

      service.loginReal(
        'usuario@test.com',
        'contrasena123'
      ).subscribe();

      service.actualizarPerfilReal(
        '  Nombre actualizado  ',
        '  NUEVO@TEST.COM  '
      ).subscribe();

      expect(service.currentUser()?.name).toBe('Nombre actualizado');
      expect(service.currentUser()?.email).toBe('nuevo@test.com');
    });

    it('debe guardar el perfil actualizado en localStorage', () => {
      post.mockReturnValue(of(respuestaLogin));

      service.loginReal(
        'usuario@test.com',
        'contrasena123'
      ).subscribe();

      service.actualizarPerfilReal(
        'Nombre actualizado',
        'nuevo@test.com'
      ).subscribe();

      const guardado = JSON.parse(
        localStorage.getItem('casitago_usuario')!
      ) as User;

      expect(guardado.name).toBe('Nombre actualizado');
      expect(guardado.email).toBe('nuevo@test.com');
    });

    it('debe cambiar el estado de la cuenta', () => {
      service.cambiarEstadoCuenta(false).subscribe();

      expect(patch).toHaveBeenCalledWith(
        `${API_URL}/api/auth/perfil/estado`,
        { activo: false },
        { responseType: 'text' }
      );
    });

    it('debe enviar la configuracion MFA al backend', () => {
      service.cambiarMfa(
        true,
        'contrasena123'
      ).subscribe();

      expect(patch).toHaveBeenCalledWith(
        `${API_URL}/api/auth/mfa`,
        {
          habilitado: true,
          contrasena: 'contrasena123'
        },
        { responseType: 'text' }
      );
    });
  });

  describe('Persistencia de sesion', () => {
    it('debe recuperar una sesion valida guardada', () => {
      const usuario: User = {
        id: 10,
        uuid: 'uuid-guardado',
        name: 'Usuario guardado',
        email: 'guardado@test.com',
        phone: '',
        role: 'guest',
        active: true,
        joinedAt: '2026-01-01'
      };

      localStorage.setItem('casitago_token', 'token-valido');
      localStorage.setItem('casitago_usuario', JSON.stringify(usuario));
      localStorage.setItem(
        'casitago_expira',
        String(Date.now() + 3600000)
      );

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          SessionService,
          { provide: HttpClient, useValue: httpSimulado }
        ]
      });

      const nuevaSesion = TestBed.inject(SessionService);

      expect(nuevaSesion.currentUser()?.uuid).toBe('uuid-guardado');
      expect(nuevaSesion.isAuthenticated()).toBe(true);
    });

    it('debe rechazar una sesion vencida', () => {
      localStorage.setItem('casitago_token', 'token-vencido');
      localStorage.setItem(
        'casitago_usuario',
        JSON.stringify({ id: 10, role: 'guest' })
      );
      localStorage.setItem(
        'casitago_expira',
        String(Date.now() - 1000)
      );

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          SessionService,
          { provide: HttpClient, useValue: httpSimulado }
        ]
      });

      const nuevaSesion = TestBed.inject(SessionService);

      expect(nuevaSesion.currentUser()).toBeNull();
      expect(localStorage.getItem('casitago_token')).toBeNull();
    });

    it('debe rechazar datos de sesion invalidos', () => {
      localStorage.setItem('casitago_token', 'token');
      localStorage.setItem('casitago_usuario', '{invalido');
      localStorage.setItem(
        'casitago_expira',
        String(Date.now() + 3600000)
      );

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          SessionService,
          { provide: HttpClient, useValue: httpSimulado }
        ]
      });

      const nuevaSesion = TestBed.inject(SessionService);

      expect(nuevaSesion.currentUser()).toBeNull();
      expect(localStorage.getItem('casitago_usuario')).toBeNull();
    });

    it('debe rechazar una sesion sin token', () => {
      localStorage.setItem(
        'casitago_usuario',
        JSON.stringify({ id: 10, role: 'guest' })
      );
      localStorage.setItem(
        'casitago_expira',
        String(Date.now() + 3600000)
      );

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          SessionService,
          { provide: HttpClient, useValue: httpSimulado }
        ]
      });

      const nuevaSesion = TestBed.inject(SessionService);

      expect(nuevaSesion.currentUser()).toBeNull();
    });
  });
});
